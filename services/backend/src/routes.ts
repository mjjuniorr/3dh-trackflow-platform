import { Router } from "express";
import type { Server } from "socket.io";
import { login, requireAdmin, requireAuth } from "./auth.js";
import { createDeliveryPerson, deactivateDeliveryPerson, registerMobileDeliveryPerson, updateDeliveryPerson } from "./delivery-people.js";
import { listDeliveryPeopleWithLocations } from "./location-store.js";
import { createTrackingSession, getPublicTrackingSession, revokeTrackingSession } from "./tracking-sessions.js";
import { createSettingsHandlers } from "./settings.js";

export function createRouter(io: Server) {
  const router = Router();
  const settings = createSettingsHandlers(io);

  router.post("/auth/login", login);
  router.post("/mobile/delivery-people/register", registerMobileDeliveryPerson);

  router.get("/delivery-people", requireAuth, async (_req, res) => {
    res.json({ delivery_people: await listDeliveryPeopleWithLocations() });
  });
  router.post("/delivery-people", requireAuth, requireAdmin, createDeliveryPerson);
  router.patch("/delivery-people/:id", requireAuth, requireAdmin, updateDeliveryPerson);
  router.delete("/delivery-people/:id", requireAuth, requireAdmin, deactivateDeliveryPerson);

  router.get("/settings/kafka", requireAuth, requireAdmin, settings.getKafkaSettings);
  router.post("/settings/kafka", requireAuth, requireAdmin, settings.saveKafkaSettings);
  router.post("/settings/kafka/test", requireAuth, requireAdmin, settings.testKafkaSettings);

  router.post("/tracking-sessions", requireAuth, createTrackingSession);
  router.post("/tracking-sessions/:id/revoke", requireAuth, revokeTrackingSession);
  router.get("/public/:publicToken", getPublicTrackingSession);

  return router;
}
