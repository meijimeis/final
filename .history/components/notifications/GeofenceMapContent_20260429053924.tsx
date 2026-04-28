"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  Polygon,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
  Marker, // ✅ ADD THIS
} from "react-leaflet";
import { useGeofence } from "./GeofenceContext";
import {
  GeofenceZoneShape,
  ParcelGeofenceOverlay,
  RoutePolylineOverlay,
} from "./types";

const DEFAULT_CENTER: [number, number] = [14.56, 121.03];
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// ✅ ADD TYPE FOR RIDERS
type Rider = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

type GeofenceMapContentProps = {
  zones: GeofenceZoneShape[];
  parcelGeofences: ParcelGeofenceOverlay[];
  routePolylines: RoutePolylineOverlay[];
  zoneWarningById: Record<string, number>;
  riders?: Rider[]; // ✅ ADD THIS
};

// ✅ ADD RIDER ICON BUILDER
function buildRiderIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div class="rider-icon-wrapper">
        <img src="/images/scooter.png" class="rider-icon"/>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function ZoneFocusController({
  focusedZone,
  zones,
  parcelGeofences,
}: {
  focusedZone: string | null;
  zones: GeofenceZoneShape[];
  parcelGeofences: ParcelGeofenceOverlay[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusedZone) return;

    const normalizedFocused = focusedZone.toLowerCase();
    const zone = zones.find((entry) => entry.name.toLowerCase() === normalizedFocused);

    if (zone) {
      const bounds = L.latLngBounds(zone.positions);
      if (!bounds.isValid()) return;

      map.fitBounds(bounds, {
        padding: [60, 60],
        animate: false,
      });
      return;
    }

    const parcelZone = parcelGeofences.find(
      (entry) =>
        entry.name.toLowerCase() === normalizedFocused ||
        entry.address.toLowerCase() === normalizedFocused
    );

    if (parcelZone) {
      map.setView([parcelZone.center.lat, parcelZone.center.lng], 16, { animate: false });
    }
  }, [focusedZone, map, parcelGeofences, zones]);

  return null;
}

function PointFocusController({ focusedPoint }: { focusedPoint: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (!focusedPoint) return;

    map.setView([focusedPoint.lat, focusedPoint.lng], 15, { animate: false });
  }, [focusedPoint, map]);

  return null;
}

function MapPlacementController({
  onPick,
}: {
  onPick: (point: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click: (event) => {
      onPick({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

export function GeofenceMapContent({
  zones,
  parcelGeofences,
  routePolylines,
  zoneWarningById,
  riders = [], // ✅ ADD DEFAULT
}: GeofenceMapContentProps) {
  const {
    focusedZone,
    focusedPoint,
    draftGeofencePoint,
    setDraftGeofencePoint,
    violationZone,
  } = useGeofence();

  // ✅ CREATE ICON ONCE
  const riderIcon = useMemo(() => buildRiderIcon(), []);

  const normalizedViolationZone = (violationZone || "").toLowerCase();

  const mapCenter = useMemo<[number, number]>(() => {
    const firstPoint = zones[0]?.positions?.[0];
    if (firstPoint) return firstPoint;

    const firstParcelZone = parcelGeofences[0];
    if (firstParcelZone) {
      return [firstParcelZone.center.lat, firstParcelZone.center.lng];
    }

    return DEFAULT_CENTER;
  }, [parcelGeofences, zones]);

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={11}
        zoomControl={false}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
        <ZoomControl position="topright" />
        <ZoneFocusController focusedZone={focusedZone} zones={zones} parcelGeofences={parcelGeofences} />
        <PointFocusController focusedPoint={focusedPoint} />
        <MapPlacementController onPick={setDraftGeofencePoint} />

        {/* ✅ ADD THIS BLOCK (RIDER RENDERING) */}
        {riders.map((rider) => (
          <Marker
            key={`rider-${rider.id}`}
            position={[rider.lat, rider.lng]}
            icon={riderIcon}
          />
        ))}

        {/* EXISTING CODE BELOW (UNCHANGED) */}
        {routePolylines.map((route) => (
          <Polyline key={route.id} positions={route.points} />
        ))}

        {parcelGeofences.map((zone) => (
          <Circle key={zone.id} center={[zone.center.lat, zone.center.lng]} radius={zone.radiusMeters} />
        ))}

        {parcelGeofences.map((zone) => (
          <CircleMarker key={`${zone.id}:marker`} center={[zone.center.lat, zone.center.lng]} radius={4} />
        ))}

        {zones.map((zone) => (
          <Polygon key={zone.id} positions={zone.positions} />
        ))}

        {focusedPoint && (
          <CircleMarker center={[focusedPoint.lat, focusedPoint.lng]} radius={8} />
        )}

        {draftGeofencePoint && (
          <CircleMarker center={[draftGeofencePoint.lat, draftGeofencePoint.lng]} radius={7} />
        )}
      </MapContainer>

      {/* ✅ ADD CSS HERE */}
      <style jsx global>{`
        .rider-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rider-icon {
          width: 35px;
          height: 35px;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
}