import { create } from "zustand";

/* ================= TYPES ================= */

export type Rider = {
  id: string;
  name: string;
  capacity_kg: number;
  lat: number | null;
  lng: number | null;
  location_updated_at?: string | null;
};

export type Parcel = {
  id: string;
  address: string;
  weight_kg: number;
  lat: number;
  lng: number;
};

export type ServiceAreaPoint = {
  name: string;
  lat: number;
  lng: number;
};

/* ================= STORE ================= */

type PlanRouteState = {
  selectedClusterName: string | null;
  selectedRider: Rider | null;
  assignedParcels: Parcel[];
  serviceAreaPoint: ServiceAreaPoint | null;

  setSelectedClusterName: (name: string | null) => void;
  setSelectedRider: (rider: Rider | null) => void;
  setAssignedParcels: (parcels: Parcel[]) => void;
  setServiceAreaPoint: (point: ServiceAreaPoint | null) => void;
  clearAssignment: () => void;
};

export const usePlanRouteStore = create<PlanRouteState>((set) => ({
  selectedClusterName: null,
  selectedRider: null,
  assignedParcels: [],
  serviceAreaPoint: null,

  setSelectedClusterName: (name) =>
    set({ selectedClusterName: name, assignedParcels: [] }),

  setSelectedRider: (rider) =>
    set((state) => {
      const currentRiderId = state.selectedRider?.id || null;
      const nextRiderId = rider?.id || null;

      if (currentRiderId === nextRiderId) {
        return { selectedRider: rider };
      }

      return { selectedRider: rider, assignedParcels: [] };
    }),

  setAssignedParcels: (parcels) =>
    set({ assignedParcels: parcels }),

  setServiceAreaPoint: (point) =>
    set({ serviceAreaPoint: point }),

  clearAssignment: () =>
    set({ selectedRider: null, assignedParcels: [], selectedClusterName: null, serviceAreaPoint: null }),
}));
