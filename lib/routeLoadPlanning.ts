export type RoutePlannerParcel = {
  id: string;
  address: string;
  weight_kg: number;
  lat: number;
  lng: number;
};

export type RouteServiceAreaPoint = {
  name: string;
  lat: number;
  lng: number;
};

export type PlannedRouteStop =
  | {
      type: "parcel";
      parcel: RoutePlannerParcel;
      rideNumber: number;
      loadWeightKg: number;
    }
  | {
      type: "service_area";
      id: string;
      name: string;
      lat: number;
      lng: number;
      rideNumber: number;
      loadWeightKg: number;
    };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestParcelIndex(
  currentLat: number,
  currentLng: number,
  parcels: RoutePlannerParcel[],
  capacityKg: number,
  currentLoadKg: number
) {
  let fallbackIndex = 0;
  let fallbackDistance = Number.POSITIVE_INFINITY;
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  parcels.forEach((parcel, index) => {
    const distance = haversineKm(currentLat, currentLng, parcel.lat, parcel.lng);
    const weight = Math.max(0, Number(parcel.weight_kg || 0));
    const fitsCurrentLoad = capacityKg <= 0 || currentLoadKg + weight <= capacityKg;

    if (distance < fallbackDistance) {
      fallbackDistance = distance;
      fallbackIndex = index;
    }

    if (fitsCurrentLoad && distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex >= 0 ? bestIndex : fallbackIndex;
}

export function planRouteStopsByRideLoad({
  startLat,
  startLng,
  parcels,
  capacityKg,
  serviceArea,
}: {
  startLat: number;
  startLng: number;
  parcels: RoutePlannerParcel[];
  capacityKg: number;
  serviceArea: RouteServiceAreaPoint | null;
}): PlannedRouteStop[] {
  const remaining = parcels.filter(
    (parcel) =>
      typeof parcel.lat === "number" &&
      Number.isFinite(parcel.lat) &&
      typeof parcel.lng === "number" &&
      Number.isFinite(parcel.lng)
  );

  const stops: PlannedRouteStop[] = [];
  const safeCapacityKg = Number.isFinite(capacityKg) ? Math.max(0, capacityKg) : 0;
  let currentLat = startLat;
  let currentLng = startLng;
  let currentLoadKg = 0;
  let rideNumber = 1;

  while (remaining.length > 0) {
    const nextIndex = nearestParcelIndex(currentLat, currentLng, remaining, safeCapacityKg, currentLoadKg);
    const nextParcel = remaining[nextIndex];
    const nextWeight = Math.max(0, Number(nextParcel.weight_kg || 0));
    const wouldExceedCapacity =
      safeCapacityKg > 0 && currentLoadKg > 0 && currentLoadKg + nextWeight > safeCapacityKg;

    if (wouldExceedCapacity && serviceArea) {
      stops.push({
        type: "service_area",
        id: `service-area-return-${rideNumber}`,
        name: serviceArea.name,
        lat: serviceArea.lat,
        lng: serviceArea.lng,
        rideNumber,
        loadWeightKg: Number(currentLoadKg.toFixed(2)),
      });

      currentLat = serviceArea.lat;
      currentLng = serviceArea.lng;
      currentLoadKg = 0;
      rideNumber += 1;
      continue;
    }

    const [chosen] = remaining.splice(nextIndex, 1);
    currentLoadKg += nextWeight;
    stops.push({
      type: "parcel",
      parcel: chosen,
      rideNumber,
      loadWeightKg: Number(currentLoadKg.toFixed(2)),
    });
    currentLat = chosen.lat;
    currentLng = chosen.lng;
  }

  return stops;
}
