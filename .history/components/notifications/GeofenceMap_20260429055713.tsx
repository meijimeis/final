"use client";

import dynamic from "next/dynamic";
import {
  GeofenceZoneShape,
  ParcelGeofenceOverlay,
  RoutePolylineOverlay,
} from "./types";
import { useEffect, useState } from "react";

const GeofenceMapContent = dynamic(
  () =>
    import("./GeofenceMapContent").then((mod) => ({
      default: mod.GeofenceMapContent,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-lg overflow-hidden flex items-center justify-center bg-gray-100">
        Loading map...
      </div>
    ),
  }
);

type Rider = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

type GeofenceMapProps = {
  zones: GeofenceZoneShape[];
  parcelGeofences?: ParcelGeofenceOverlay[];
  routePolylines?: RoutePolylineOverlay[];
  zoneWarningById: Record<string, number>;
};

export default function GeofenceMap({
  zones,
  parcelGeofences = [],
  routePolylines = [],
  zoneWarningById,
}: GeofenceMapProps) {
  const [riders, setRiders] = useState<Rider[]>([]);

  useEffect(() => {
    const loadRiders = async () => {
      try {
        const { getRiders, getLatestRiderLocation } = await import("@/lib/api");

        const riderList = await getRiders(undefined);

        const ridersWithLocation = await Promise.all(
          (riderList || []).map(async (r: any) => {
            const loc = await getLatestRiderLocation(r.id);

            // 🔴 IMPORTANT: fallback if no location
            if (!loc) {
              console.log("NO LOCATION FOR:", r.id);
              return null;
            }

            return {
              id: r.id,
              name: r.profiles?.[0]?.full_name || "Driver",
              lat: loc.latitude,
              lng: loc.longitude,
            };
          })
        );

        const filtered = ridersWithLocation.filter(Boolean);

        console.log("FINAL RIDERS:", filtered); // 🔍 DEBUG

        setRiders(filtered as Rider[]);
      } catch (err) {
        console.error("Failed to load riders:", err);
      }
    };

    loadRiders();

    // 🔁 refresh every 5 seconds (REAL-TIME FEEL)
    const interval = setInterval(loadRiders, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <GeofenceMapContent
      zones={zones}
      parcelGeofences={parcelGeofences}
      routePolylines={routePolylines}
      zoneWarningById={zoneWarningById}
      riders={riders} // ✅ REAL DATA HERE
    />
  );
}