export type LocationEvent = {
  id?: string;
  device_id: string;
  lat: number;
  lng: number;
  speed: number;
  heading?: number;
  battery?: number;
  accuracy?: number;
  timestamp: string;
  created_at?: string;
};

export type DeliveryPerson = {
  id: string;
  name: string;
  device_id: string;
  phone?: string;
  vehicle_type: VehicleType;
  status: string;
  is_active?: boolean;
  computed_status: "online" | "offline" | "sem sinal";
  last_location: LocationEvent | null;
};

export type VehicleType = "motorcycle" | "car" | "boat" | "airplane" | "bus";

export type PublicTrackingPayload = {
  public_token: string;
  title?: string;
  expires_at: string;
  delivery_person: {
    name: string;
    device_id: string;
    vehicle_type: VehicleType;
    status: string;
  };
  last_location: LocationEvent | null;
};
