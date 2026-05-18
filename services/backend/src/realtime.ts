import type { Server } from "socket.io";
import { config } from "./config.js";
import { listDeliveryPeopleWithLocations } from "./location-store.js";
import { prisma } from "./prisma.js";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    socket.on("dashboard:join", async (payload: { token?: string }) => {
      if (!payload?.token) return socket.emit("auth:error", { message: "Token obrigatorio." });
      try {
        const jwt = await import("jsonwebtoken");
        jwt.default.verify(payload.token, config.jwtSecret);
        await socket.join("dashboard");
        socket.emit("location:update", { delivery_people: await listDeliveryPeopleWithLocations() });
      } catch {
        socket.emit("auth:error", { message: "Token invalido." });
      }
    });

    socket.on("tracking:join", async (payload: { public_token?: string }) => {
      if (!payload?.public_token) return;
      const session = await prisma.trackingSession.findUnique({
        where: { public_token: payload.public_token },
        include: { delivery_person: true }
      });
      if (!session || session.status !== "active" || session.expires_at.getTime() <= Date.now()) {
        socket.emit("tracking:expired", { message: "Este link de rastreamento expirou." });
        return;
      }
      await socket.join(`tracking:${session.public_token}`);
    });
  });
}

export async function emitLocationUpdate(io: Server, deviceId: string) {
  const deliveryPeople = await listDeliveryPeopleWithLocations();
  io.to("dashboard").emit("location:update", { delivery_people: deliveryPeople });

  const person = deliveryPeople.find((item) => item.device_id === deviceId);
  if (!person) return;

  const sessions = await prisma.trackingSession.findMany({
    where: {
      delivery_person_id: person.id,
      status: "active",
      expires_at: { gt: new Date() }
    }
  });

  for (const session of sessions) {
    io.to(`tracking:${session.public_token}`).emit("location:update", {
      delivery_person: {
        name: person.name,
        device_id: person.device_id,
        status: person.computed_status
      },
      last_location: person.last_location
    });
  }
}
