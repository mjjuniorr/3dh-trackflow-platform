import type { Request, Response } from "express";
import type { Server } from "socket.io";
import { z } from "zod";
import { config } from "./config.js";
import { saveLocation } from "./location-store.js";
import { emitLocationUpdate } from "./realtime.js";

const telemetrySchema = z.object({
  device_id: z.string().min(2).max(120),
  lat: z.number(),
  lng: z.number(),
  speed: z.number().min(0).max(220).default(0),
  heading: z.number().min(0).max(360).optional(),
  battery: z.number().int().min(0).max(100).optional(),
  accuracy: z.number().optional(),
  timestamp: z.string().datetime({ offset: true }).optional()
});

export function createMobileHandlers(io: Server) {
  return {
    async sendTelemetry(req: Request, res: Response) {
      if (!isMobileRequestAuthorized(req)) {
        return res.status(401).json({ message: "Aplicativo nao autorizado." });
      }

      const parsed = telemetrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Telemetria invalida.", issues: parsed.error.flatten() });
      }

      const event = await saveLocation({
        ...parsed.data,
        speed: Math.round(parsed.data.speed * 10) / 10,
        timestamp: parsed.data.timestamp ?? new Date().toISOString()
      });
      await emitLocationUpdate(io, parsed.data.device_id);

      return res.status(202).json({
        accepted: true,
        location_event_id: event.id,
        timestamp: event.timestamp
      });
    }
  };
}

export function isMobileRequestAuthorized(req: Request) {
  if (!config.mobileRegistrationSecret) return true;
  return req.headers["x-mobile-registration-secret"] === config.mobileRegistrationSecret;
}
