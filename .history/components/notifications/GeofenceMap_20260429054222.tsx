"use client";

import dynamic from "next/dynamic";
import {
  GeofenceZoneShape,
  ParcelGeofenceOverlay,
  RoutePolylineOverlay,
} from "./types";
import { useEffect, useState } from "react";
import { SIMULATED_RIDERS, SimulatedRider } from "./simulateRider";
import { moveRider } from "./simulateMovement";

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
  // ✅ MOVE HOOKS INSIDE COMPONENT
  const [riders, setRiders] = useState<SimulatedRider[]>(SIMULATED_RIDERS);

  useEffect(() => {
    const interval = setInterval(() => {
      setRiders((prev) => prev.map((r) => moveRider(r)));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <GeofenceMapContent
      zones={zones}
      parcelGeofences={parcelGeofences}
      routePolylines={routePolylines}
      zoneWarningById={zoneWarningById}
      riders={riders} // ✅ USE STATE, NOT STATIC
    />
  );
}