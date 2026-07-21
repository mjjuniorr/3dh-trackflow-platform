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

export type DeliveryRecordUser = {
  id: string;
  name: string;
  email: string;
};

export type DeliveryRecord = {
  id: string;
  invoice_number: string;
  delivery_person_id: string;
  created_by_user_id: string;
  notes?: string | null;
  created_at: string;
  cancelled_at?: string | null;
  cancelled_by_user_id?: string | null;
  delivery_person: Pick<DeliveryPerson, "id" | "name" | "device_id" | "vehicle_type">;
  created_by_user: DeliveryRecordUser;
  cancelled_by_user?: DeliveryRecordUser | null;
};

export type DeliveryRecordSummary = {
  total: number;
  by_delivery_person: Array<{
    delivery_person_id: string;
    name: string;
    total: number;
  }>;
};
