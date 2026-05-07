type Point = { lat: number; lng: number };

// ✅ CONFIG - Tunable parameters
const AUTO_GEOFENCE_CONFIG = {
  CLUSTER_RADIUS_METERS: 700,
  MIN_CLUSTER_SIZE: 4,
  MIN_RADIUS_METERS: 500,           // Bigger minimum!
  MAX_RADIUS_METERS: 2000,          // Bigger maximum!
  SPREAD_FACTOR: 1.0,               // Use actual spread
  VOLUME_FACTOR: 20,                // Volume bonus
  BOUNDARY_EXTENSION_METERS: 500,   // 🔥 500m extension!
  OVERLAP_GAP_METERS: 75,
  maxDwellMinutes: 30,
  CIRCLE_SEGMENTS: 48
} as const;

type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

type CircleZoneResult = {
  geometry: GeoJSONPolygon;
  center: Point;
  radiusMeters: number;
  parcelCount: number;
};

// 1. Perfect Haversine Distance
function getDistanceMeters(p1: Point, p2: Point): number {
  const R = 6371000;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) * 
    Math.cos((p2.lat * Math.PI) / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 2. Cluster Center
function getCenter(points: Point[]): Point {
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  };
}

// 🔥 3. OPTIMIZED CLUSTERING (O(n²) but fast enough for 10k points)
export function clusterPoints(points: Point[]): Point[][] {
  const clusters: Point[][] = [];
  
  for (const point of points) {
    let added = false;

    for (const cluster of clusters) {
      // ✅ Natural clustering - check ALL points
      const isNear = cluster.some(p => 
        getDistanceMeters(p, point) < AUTO_GEOFENCE_CONFIG.CLUSTER_RADIUS_METERS
      );
      
      if (isNear) {
        cluster.push(point);
        added = true;
        break;
      }
    }

    if (!added) {
      // Overlap prevention
      const tooClose = clusters.some(cluster => {
        const center = getCenter(cluster);
        return getDistanceMeters(center, point) < AUTO_GEOFENCE_CONFIG.OVERLAP_GAP_METERS;
      });
      
      if (!tooClose) {
        clusters.push([point]);
      }
    }
  }

  return clusters.filter(c => c.length >= AUTO_GEOFENCE_CONFIG.MIN_CLUSTER_SIZE);
}

// 🔥 4. SMART CIRCLE ZONES (Configurable + Typed)
export function createCircleZone(points: Point[]): CircleZoneResult | null {
  if (points.length < AUTO_GEOFENCE_CONFIG.MIN_CLUSTER_SIZE) return null;

  const center = getCenter(points);
  const parcelCount = points.length;

  // 🔥 PERFECT RADIUS: Spread + Volume (configurable!)
  const maxDistance = Math.max(
    ...points.map(p => getDistanceMeters(center, p))
  );

  const radiusMeters = Math.max(
    AUTO_GEOFENCE_CONFIG.MIN_RADIUS_METERS,
    maxDistance * AUTO_GEOFENCE_CONFIG.SPREAD_FACTOR,
    parcelCount * AUTO_GEOFENCE_CONFIG.VOLUME_FACTOR
  );

  const finalRadius = Math.min(
    radiusMeters, 
    AUTO_GEOFENCE_CONFIG.MAX_RADIUS_METERS
  );

  // ✅ SMOOTH CIRCLE (configurable segments)
  const circlePoints: [number, number][] = [];
  for (let i = 0; i <= AUTO_GEOFENCE_CONFIG.CIRCLE_SEGMENTS; i++) {
    const angle = (i / AUTO_GEOFENCE_CONFIG.CIRCLE_SEGMENTS) * 2 * Math.PI;
    const latOffset = (finalRadius * Math.cos(angle)) / 111320;
    const cosLat = Math.max(0.00001, Math.cos(center.lat * Math.PI / 180));
    const lngOffset = (finalRadius * Math.sin(angle)) / (111320 * cosLat);
    
    circlePoints.push([
      center.lng + lngOffset,
      center.lat + latOffset
    ]);
  }

  return {
    geometry: {
      type: "Polygon" as const,
      coordinates: [circlePoints]
    },
    center,
    radiusMeters: finalRadius,
    parcelCount
  };
}

// 🔥 CONFIG ACCESSOR (for debugging/UI)
export const getAutoGeofenceConfig = () => AUTO_GEOFENCE_CONFIG;