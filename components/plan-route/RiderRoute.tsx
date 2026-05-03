"use client";

import { useMemo, useState } from "react";
import { usePlanRouteStore } from "@/stores/usePlanRouteStore";
import { planRouteStopsByRideLoad, type PlannedRouteStop } from "@/lib/routeLoadPlanning";
import { supabase } from "@/lib/supabaseClient";
import { assignParcelClusterToRider, getGeofences } from "@/lib/api";
import { MapPin, CheckCircle, AlertCircle, Loader } from "lucide-react";
import {
  buildGeofenceRuntime,
  getComponentIdsForPoint,
  isPointInsideGeofences,
} from "@/lib/geofenceRuntime";

type GeofenceRow = {
  id?: string | null;
  name?: string | null;
  region?: string | null;
  geometry?: unknown;
};

const INDIVIDUAL_PREFIX = "parcel:";

function toStopLabel(index: number) {
  let n = index;
  let label = "";

  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return label;
}

function hasRiderCoordinates(
  rider: { lat: number | null; lng: number | null } | null
): rider is { lat: number; lng: number } {
  return (
    !!rider &&
    typeof rider.lat === "number" &&
    Number.isFinite(rider.lat) &&
    typeof rider.lng === "number" &&
    Number.isFinite(rider.lng)
  );
}

function normalizeClusterName(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/* ================= COMPONENT ================= */

export default function RiderRoute() {
  const rider = usePlanRouteStore((s) => s.selectedRider);
  const selectedClusterName = usePlanRouteStore((s) => s.selectedClusterName);
  const parcels = usePlanRouteStore((s) => s.assignedParcels);
  const serviceAreaPoint = usePlanRouteStore((s) => s.serviceAreaPoint);
  const clearAssignment = usePlanRouteStore((s) => s.clearAssignment);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const plannedStops = useMemo(() => {
    if (!hasRiderCoordinates(rider) || parcels.length === 0) return [];

    return planRouteStopsByRideLoad({
      startLat: rider.lat,
      startLng: rider.lng,
      parcels,
      capacityKg: rider.capacity_kg || 0,
      serviceArea: serviceAreaPoint,
    });
  }, [parcels, rider, serviceAreaPoint]);

  const plannedParcelStops = useMemo(
    () =>
      plannedStops.filter(
        (stop): stop is Extract<PlannedRouteStop, { type: "parcel" }> => stop.type === "parcel"
      ),
    [plannedStops]
  );

  const rideCount = useMemo(
    () => plannedStops.reduce((max, stop) => Math.max(max, stop.rideNumber), 0),
    [plannedStops]
  );

  const handleConfirmAssignment = async () => {
    if (!rider || plannedParcelStops.length === 0) return;

    setIsConfirming(true);
    setConfirmMessage(null);

    try {
      const geofenceRowsRaw = await getGeofences(undefined);
      const geofenceRuntime = buildGeofenceRuntime(
        Array.isArray(geofenceRowsRaw) ? (geofenceRowsRaw as GeofenceRow[]) : []
      );

      if (geofenceRuntime.zones.length === 0) {
        throw new Error("No organization geofences are configured for route assignment.");
      }

      if (!hasRiderCoordinates(rider)) {
        throw new Error("Selected rider has no live location. Choose a rider with coordinates.");
      }

      if (!isPointInsideGeofences(rider.lat, rider.lng, geofenceRuntime)) {
        throw new Error("Selected rider is outside organization geofences.");
      }

      const riderComponentIds = getComponentIdsForPoint(rider.lat, rider.lng, geofenceRuntime);
      if (riderComponentIds.length === 0) {
        throw new Error("Selected rider is not inside a routable geofence zone.");
      }

      const riderComponentSet = new Set(riderComponentIds);

      const routePoints = plannedParcelStops.map((stop) => ({
        lat: stop.parcel.lat,
        lng: stop.parcel.lng,
      }));

      const allInsideGeofences = routePoints.every((point) =>
        isPointInsideGeofences(point.lat, point.lng, geofenceRuntime)
      );

      if (!allInsideGeofences) {
        throw new Error("Route contains parcel(s) outside organization geofences.");
      }

      const allInSameRiderGeofence = routePoints.every((point) => {
        const componentIds = getComponentIdsForPoint(point.lat, point.lng, geofenceRuntime);
        return componentIds.some((componentId) => riderComponentSet.has(componentId));
      });

      if (!allInSameRiderGeofence) {
        throw new Error("Route contains parcel(s) outside the selected rider super geofence area.");
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: existingRouteCount, error: existingRouteError } = await supabase
        .from("routes")
        .select("id", { count: "exact", head: true })
        .eq("rider_id", rider.id)
        .in("status", ["assigned", "active", "in_progress"])
        .gte("created_at", todayStart.toISOString());

      if (existingRouteError) {
        throw existingRouteError;
      }

      if (Number(existingRouteCount || 0) > 0) {
        throw new Error("This rider already has a route assigned today. Each rider can take one cluster per day.");
      }

      if (
        selectedClusterName &&
        !selectedClusterName.startsWith(INDIVIDUAL_PREFIX)
      ) {
        type ClusterRow = {
          id: string;
          cluster_name?: string | null;
          created_at?: string | null;
          parcel_list_items?: Array<{ parcel_id: string }>;
        };

        const normalizedSelectedClusterName = normalizeClusterName(selectedClusterName);
        if (!normalizedSelectedClusterName) {
          throw new Error("Selected cluster name is invalid.");
        }

        const { data: clusterRows, error: clusterRowsError } = await supabase
          .from("parcel_lists")
          .select(`
            id,
            cluster_name,
            created_at,
            parcel_list_items (
              parcel_id
            )
          `)
          .not("cluster_name", "is", null)
          .in("status", ["pending", "acquired", "unassigned"]);

        if (clusterRowsError) {
          throw clusterRowsError;
        }

        const rankedClusterRows = (Array.isArray(clusterRows) ? (clusterRows as ClusterRow[]) : [])
          .filter(
            (row) => normalizeClusterName(row.cluster_name) === normalizedSelectedClusterName
          )
          .filter((row) => typeof row?.id === "string" && row.id.length > 0)
          .sort((left, right) => {
            const leftCount = Array.isArray(left.parcel_list_items) ? left.parcel_list_items.length : 0;
            const rightCount = Array.isArray(right.parcel_list_items) ? right.parcel_list_items.length : 0;

            if (rightCount !== leftCount) {
              return rightCount - leftCount;
            }

            const leftCreatedAt = new Date(left.created_at || "").getTime();
            const rightCreatedAt = new Date(right.created_at || "").getTime();
            return (Number.isFinite(leftCreatedAt) ? leftCreatedAt : 0) - (Number.isFinite(rightCreatedAt) ? rightCreatedAt : 0);
          });

        const clusterCandidate = rankedClusterRows[0] || null;
        if (!clusterCandidate) {
          throw new Error("No assignable parcel cluster row found for the selected cluster.");
        }

        await assignParcelClusterToRider(clusterCandidate.id, rider.id, undefined, {
          capacityKg: rider.capacity_kg || 0,
          serviceAreaPoint,
        });

        setConfirmMessage({
          type: "success",
          text: `Route confirmed! Cluster assigned to ${rider.name}`,
        });

        setTimeout(() => {
          clearAssignment();
        }, 2000);

        return;
      }

      // Get user's org ID (in production, get from session context)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      // Create route entry
      const { data: routeData, error: routeError } = await supabase
        .from("routes")
        .insert({
          rider_id: rider.id,
          cluster_name: `Route-${new Date().toISOString().split("T")[0]}`,
          status: "assigned",
        })
        .select()
        .single();

      if (routeError) throw routeError;

      // Create deliveries for each parcel_list
      const deliveriesPayload = plannedParcelStops.map((stop, idx) => ({
        route_id: routeData.id,
        parcel_id: stop.parcel.id, // This is a parcel_list ID
        rider_id: rider.id,
        sequence: idx + 1,
        status: "pending",
      }));

      const { error: deliveryError } = await supabase
        .from("deliveries")
        .insert(deliveriesPayload);

      if (deliveryError) throw deliveryError;

      // Update parcel_lists status to assigned
      const { error: parcelListError } = await supabase
        .from("parcel_lists")
        .update({
          status: "assigned",
        })
        .in(
          "id",
          plannedParcelStops.map((stop) => stop.parcel.id)
        );

      if (parcelListError) throw parcelListError;

      setConfirmMessage({
        type: "success",
        text: `Route confirmed! ${plannedParcelStops.length} parcels assigned to ${rider.name}`,
      });

      // Clear the assignment after 2 seconds
      setTimeout(() => {
        clearAssignment();
      }, 2000);
    } catch (error) {
      console.error("Error confirming assignment:", error);
      setConfirmMessage({
        type: "error",
        text: `Error: ${error instanceof Error ? error.message : "Failed to confirm assignment"}`,
      });
    } finally {
      setIsConfirming(false);
    }
  };

  if (!rider || plannedParcelStops.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 text-sm shadow-sm border border-gray-100">
        No route yet
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <h3 className="font-semibold mb-4">Rider Route</h3>
      <p className="mb-4 text-xs text-gray-600">
        {rideCount > 1
          ? `${rideCount} ride loads planned at ${rider.capacity_kg || 0} kg per ride. Return stops go to ${serviceAreaPoint?.name || "the service area"}.`
          : `1 ride load planned${rider.capacity_kg ? ` at ${rider.capacity_kg} kg capacity` : ""}.`}
      </p>

      {/* CONFIRMATION MESSAGE */}
      {confirmMessage && (
        <div
          className={`mb-4 p-3 rounded-lg flex gap-2 items-start ${
            confirmMessage.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {confirmMessage.type === "success" ? (
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <span className="text-xs">{confirmMessage.text}</span>
        </div>
      )}

      {/* START */}
      <div className="flex gap-4 mb-4 relative">
        {/* Timeline */}
        <div className="flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
            <MapPin className="text-purple-600 w-4 h-4" />
          </div>
          <div className="w-px flex-1 bg-gray-200 mt-1" />
        </div>

        <div>
          <p className="text-sm font-medium">
            Start: {rider.name}
          </p>
          <p className="text-xs text-gray-700">
            {hasRiderCoordinates(rider)
              ? "Current Rider Location"
              : "Current rider location unavailable"}
          </p>
        </div>
      </div>

      {/* STOPS */}
      <div className="space-y-3">
        {plannedStops.map((stop, i) => (
          <div key={stop.type === "parcel" ? stop.parcel.id : stop.id} className="flex gap-4 relative">
            {/* Timeline + Number */}
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold flex items-center justify-center">
                {stop.type === "service_area" ? "SA" : toStopLabel(i)}
              </div>

              {i !== plannedStops.length - 1 && (
                <div className="w-px flex-1 bg-gray-200 mt-1" />
              )}
            </div>

            {/* Stop Card */}
            <div className="flex-1 border rounded-lg px-3 py-2">
              <p className="text-sm font-medium">
                {stop.type === "service_area" ? "Return to Service Area" : `Stop ${toStopLabel(i)}`}
              </p>
              <p className="text-xs text-gray-700">
                {stop.type === "service_area" ? stop.name : stop.parcel.address}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                Ride {stop.rideNumber} • Load {stop.loadWeightKg.toFixed(1)} kg
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CONFIRM BUTTON */}
      <button
        onClick={handleConfirmAssignment}
        disabled={isConfirming}
        className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isConfirming ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Confirming...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            Confirm Assignment to Database
          </>
        )}
      </button>
    </div>
  );
}
