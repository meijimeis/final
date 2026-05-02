export type Rider = {
  id: string;
  name: string;
  vehicle: string;
  capacityKg: number;
  parcel_quota?: number;
  status: "Available" | "Busy" | "Offline";
  lat: number | null;
  lng: number | null;
};
