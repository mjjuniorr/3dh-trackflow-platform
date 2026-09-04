export type DeviceOperationalStatus = "online" | "offline" | "sem sinal";
export type DeviceNotificationType = "DEVICE_OFFLINE" | "DEVICE_ONLINE";

export function notificationForTransition(
  previous: DeviceOperationalStatus,
  next: DeviceOperationalStatus
): DeviceNotificationType | null {
  if (next === "offline" && previous !== "offline") return "DEVICE_OFFLINE";
  if (previous === "offline" && next === "online") return "DEVICE_ONLINE";
  return null;
}
