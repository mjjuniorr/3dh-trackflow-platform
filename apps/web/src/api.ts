import type { DeliveryPerson, PublicTrackingPayload, VehicleType } from "./types";
import { clearAuthentication, getAccessToken, setLegacyToken } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export function getToken() {
  return getAccessToken();
}

export function setToken(token: string) {
  setLegacyToken(token);
}

export function clearToken() {
  clearAuthentication();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message ?? "Falha na requisicao.");
  }
  return data as T;
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: { name: string; email: string; role?: string; permissions: string[] } }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function listDeliveryPeople() {
  return request<{ delivery_people: DeliveryPerson[] }>("/api/delivery-people");
}

export async function createDeliveryPerson(input: { name: string; device_id: string; phone?: string; vehicle_type?: VehicleType }) {
  return request<{ delivery_person: DeliveryPerson }>("/api/delivery-people", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateDeliveryPerson(id: string, input: { name?: string; device_id?: string; phone?: string; vehicle_type?: VehicleType; is_active?: boolean }) {
  return request<{ delivery_person: DeliveryPerson }>(`/api/delivery-people/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deactivateDeliveryPerson(id: string) {
  return request<{ delivery_person: DeliveryPerson }>(`/api/delivery-people/${id}`, {
    method: "DELETE"
  });
}

export async function createTrackingSession(deliveryPersonId: string, expiresInMinutes: number, title?: string) {
  return request<{ public_path?: string; public_url?: string; session: { id: string; expires_at: string } }>("/api/tracking-sessions", {
    method: "POST",
    body: JSON.stringify({
      delivery_person_id: deliveryPersonId,
      expires_in_minutes: expiresInMinutes,
      title
    })
  });
}

export async function getPublicTracking(publicToken: string) {
  return request<PublicTrackingPayload>(`/api/public/${publicToken}`);
}

export type KafkaSettings = {
  broker: string;
  topic: string;
  clientId: string;
  groupId: string;
  ssl: boolean;
  saslMechanism?: "" | "plain" | "scram-sha-256" | "scram-sha-512";
  saslUsername?: string;
  saslPassword?: string;
};

export type ServiceDomainSettings = {
  publicBaseUrl: string;
  mobileApiBaseUrl: string;
  kafkaUiUrl: string;
  portalUrl: string;
  authUrl: string;
};

export async function getKafkaSettings() {
  return request<{ settings: KafkaSettings }>("/api/settings/kafka");
}

export async function saveKafkaSettings(settings: KafkaSettings, adminPassword: string) {
  return request<{ settings: KafkaSettings; message: string }>("/api/settings/kafka", {
    method: "POST",
    body: JSON.stringify({ ...settings, ...(adminPassword ? { admin_password: adminPassword } : {}) })
  });
}

export async function testKafkaSettings(settings: KafkaSettings, adminPassword: string) {
  return request<{ ok: boolean; topics?: string[]; topic_exists?: boolean; message?: string }>("/api/settings/kafka/test", {
    method: "POST",
    body: JSON.stringify({ ...settings, ...(adminPassword ? { admin_password: adminPassword } : {}) })
  });
}

export async function getServiceDomainSettings() {
  return request<{ settings: ServiceDomainSettings }>("/api/settings/services");
}

export async function saveServiceDomainSettings(settings: ServiceDomainSettings, adminPassword: string) {
  return request<{ settings: ServiceDomainSettings; message: string }>("/api/settings/services", {
    method: "POST",
    body: JSON.stringify({ ...settings, ...(adminPassword ? { admin_password: adminPassword } : {}) })
  });
}
