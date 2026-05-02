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
  Marker,
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

/* =========================
   TYPES
========================= */
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
  riders?: Rider[];
};

/* =========================
   ICON
========================= */
function buildRiderIcon() {
  return L.divIcon({
    className: "",
   html: `
  <div style="
    display:flex;
    align-items:center;
    justify-content:center;
    background:white;
    border:3px solid #7C3AED;
    border-radius:50%;
    padding:4px;
    box-shadow:0 2px 6px rgba(17,24,39,0.3);
  ">
    <img 
      src="/images/scooter.png" 
      style="width:30px;height:30px;object-fit:contain;"
    />
  </div>
`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}
/* =========================
   CONTROLLERS
========================= */

function RiderFitController({ riders }: { riders: Rider[] }) {
  const map = useMap();

  useEffect(() => {
    if (!riders.length) return;

    const bounds = L.latLngBounds(
      riders.map((r) => [r.lat, r.lng])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // ❗ RUN ONLY ON FIRST LOAD
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  return null;
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

    const normalized = focusedZone.toLowerCase();

    const zone = zones.find(
      (z) => z.name.toLowerCase() === normalized
    );

    if (zone) {
      const bounds = L.latLngBounds(zone.positions);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60] });
      }
      return;
    }

    const parcelZone = parcelGeofences.find(
      (z) =>
        z.name.toLowerCase() === normalized ||
        z.address.toLowerCase() === normalized
    );

    if (parcelZone) {
      map.setView(
        [parcelZone.center.lat, parcelZone.center.lng],
        16
      );
    }
  }, [focusedZone, map, zones, parcelGeofences]);

  return null;
}

function PointFocusController({
  focusedPoint,
}: {
  focusedPoint: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusedPoint) return;

    map.setView([focusedPoint.lat, focusedPoint.lng], 15);
  }, [focusedPoint, map]);

  return null;
}

function MapPlacementController({
  onPick,
}: {
  onPick: (point: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click: (e) => {
      onPick({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });

  return null;
}

/* =========================
   MAIN COMPONENT
========================= */

export function GeofenceMapContent({
  zones,
  parcelGeofences,
  routePolylines,
  zoneWarningById,
  riders = [],
}: GeofenceMapContentProps) {
  const {
    focusedZone,
    focusedPoint,
    draftGeofencePoint,
    setDraftGeofencePoint,
  } = useGeofence();

  const riderIcon = useMemo(() => buildRiderIcon(), []);

  const mapCenter = useMemo<[number, number]>(() => {
    const firstZone = zones[0]?.positions?.[0];
    if (firstZone) return firstZone;

    const firstParcel = parcelGeofences[0];
    if (firstParcel) {
      return [firstParcel.center.lat, firstParcel.center.lng];
    }

    return DEFAULT_CENTER;
  }, [zones, parcelGeofences]);

  /* 🔍 DEBUG */
  console.log("GEOFENCE RIDERS:", riders);

return (
  <>
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

        {/* CONTROLLERS */}
        <RiderFitController riders={riders} />
        <ZoneFocusController
          focusedZone={focusedZone}
          zones={zones}
          parcelGeofences={parcelGeofences}
        />
        <PointFocusController focusedPoint={focusedPoint} />
        <MapPlacementController onPick={setDraftGeofencePoint} />

        {/* 🚗 RIDERS */}
        {riders.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={riderIcon}
          />
        ))}

        {/* ROUTES */}
        {routePolylines.map((route) => (
          <Polyline key={route.id} positions={route.points} />
        ))}

        {/* PARCEL GEOFENCES */}
        {parcelGeofences.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.center.lat, zone.center.lng]}
            radius={zone.radiusMeters}
          />
        ))}

        {parcelGeofences.map((zone) => (
          <CircleMarker
            key={`${zone.id}-marker`}
            center={[zone.center.lat, zone.center.lng]}
            radius={4}
          />
        ))}

        {/* ZONES */}
        {zones.map((zone) => (
          <Polygon key={zone.id} positions={zone.positions} />
        ))}

        {/* FOCUS POINT */}
        {focusedPoint && (
          <CircleMarker
            center={[focusedPoint.lat, focusedPoint.lng]}
            radius={8}
          />
        )}

        {/* DRAFT POINT */}
        {draftGeofencePoint && (
          <CircleMarker
            center={[
              draftGeofencePoint.lat,
              draftGeofencePoint.lng,
            ]}
            radius={7}
          />
        )}
      </MapContainer>
    </div>
  </>
);
}