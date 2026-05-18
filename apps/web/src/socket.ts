import { io } from "socket.io-client";

export function createSocket() {
  return io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
    path: "/socket.io",
    transports: ["websocket", "polling"]
  });
}
