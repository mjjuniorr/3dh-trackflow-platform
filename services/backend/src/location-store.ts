import type { DeliveryPerson, LocationEvent } from "@prisma/client";
import { Redis } from "ioredis";
import { config } from "./config.js";
import { prisma } from "./prisma.js";

export type LocationMessage = {
  device_id: string;
  lat: number;
  lng: number;
  speed: number;
  heading?: number;
  battery?: number;
  accuracy?: number;
  timestamp: string;
};

export type DeliveryPersonWithLocation = DeliveryPerson & {
  last_location: LocationEvent | null;
  computed_status: "online" | "offline" | "sem sinal";
};

export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 2 });

const LAST_LOCATION_PREFIX = "last-location:";
const ONLINE_MS = 90_000;
const NO_SIGNAL_MS = 5 * 60_000;

export function computeStatus(timestamp?: Date | string | null): "online" | "offline" | "sem sinal" {
  if (!timestamp) return "offline";
  const age = Date.now() - new Date(timestamp).getTime();
  if (age <= ONLINE_MS) return "online";
  if (age <= NO_SIGNAL_MS) return "sem sinal";
  return "offline";
}

export async function saveLocation(message: LocationMessage) {
  const event = await prisma.locationEvent.create({
    data: {
      device_id: message.device_id,
      lat: message.lat,
      lng: message.lng,
      speed: message.speed,
      heading: message.heading,
      battery: message.battery,
      accuracy: message.accuracy,
      timestamp: new Date(message.timestamp)
    }
  });

  const status = computeStatus(event.timestamp);
  await Promise.all([
    redis.set(`${LAST_LOCATION_PREFIX}${message.device_id}`, JSON.stringify(event), "EX", 60 * 60 * 24),
    prisma.deliveryPerson.updateMany({
      where: { device_id: message.device_id },
      data: { status }
    })
  ]);

  return event;
}

export async function getLastLocation(deviceId: string) {
  const cached = await redis.get(`${LAST_LOCATION_PREFIX}${deviceId}`);
  if (cached) return JSON.parse(cached) as LocationEvent;

  const event = await prisma.locationEvent.findFirst({
    where: { device_id: deviceId },
    orderBy: { timestamp: "desc" }
  });
  if (event) {
    await redis.set(`${LAST_LOCATION_PREFIX}${deviceId}`, JSON.stringify(event), "EX", 60 * 60 * 24);
  }
  return event;
}

export async function listDeliveryPeopleWithLocations(): Promise<DeliveryPersonWithLocation[]> {
  const deliveryPeople = await prisma.deliveryPerson.findMany({ orderBy: { name: "asc" } });
  return Promise.all(
    deliveryPeople.map(async (person) => {
      const lastLocation = await getLastLocation(person.device_id);
      return {
        ...person,
        last_location: lastLocation,
        computed_status: computeStatus(lastLocation?.timestamp)
      };
    })
  );
}
