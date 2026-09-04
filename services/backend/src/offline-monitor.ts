import type { Server } from "socket.io";
import { computeStatus, getLastLocation } from "./location-store.js";
import { createDeviceNotification } from "./notifications.js";
import { notificationForTransition, type DeviceOperationalStatus } from "./notification-transition.js";
import { prisma } from "./prisma.js";

const OFFLINE_SCAN_MS = 30_000;

async function reconcileSilentDevices(io: Server) {
  const people = await prisma.deliveryPerson.findMany({ where: { is_active: true } });

  for (const person of people) {
    const lastLocation = await getLastLocation(person.device_id);
    const nextStatus = computeStatus(lastLocation?.timestamp);
    const previousStatus = person.status as DeviceOperationalStatus;
    if (nextStatus === previousStatus) continue;

    const claimed = await prisma.deliveryPerson.updateMany({
      where: { id: person.id, status: previousStatus },
      data: { status: nextStatus }
    });
    if (claimed.count === 0) continue;

    const type = notificationForTransition(previousStatus, nextStatus);
    if (type === "DEVICE_OFFLINE") {
      await createDeviceNotification(io, {
        type,
        deviceId: person.device_id,
        deliveryPersonId: person.id,
        deliveryPersonName: person.name
      });
    }
  }
}

export function startOfflineMonitor(io: Server) {
  const run = async () => {
    try {
      await reconcileSilentDevices(io);
    } catch (error) {
      console.error("Falha no monitor de dispositivos offline", error);
    }
  };

  void run();
  const timer = setInterval(() => void run(), OFFLINE_SCAN_MS);
  timer.unref();
  console.log(`Monitor de dispositivos offline ativo: intervalo=${OFFLINE_SCAN_MS / 1000}s`);
}
