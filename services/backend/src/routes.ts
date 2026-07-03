import { Router } from "express";
import type { Server } from "socket.io";
import { authConfig, currentUser, login, requireAdmin, requireAuth, requirePermission } from "./auth.js";
import { createDeliveryPerson, deactivateDeliveryPerson, registerMobileDeliveryPerson, updateDeliveryPerson } from "./delivery-people.js";
import { listDeliveryPeopleWithLocations } from "./location-store.js";
import { createMobileHandlers } from "./mobile.js";
import { createTrackingSession, getPublicTrackingSession, revokeTrackingSession } from "./tracking-sessions.js";
import { createSettingsHandlers } from "./settings.js";

export function createRouter(io: Server) {
  const router = Router();
  const settings = createSettingsHandlers(io);
  const mobile = createMobileHandlers(io);

  router.get("/auth/config", authConfig);
  router.post("/auth/login", login);
  router.get("/auth/me", requireAuth, currentUser);
  router.post("/mobile/delivery-people/register", registerMobileDeliveryPerson);
  router.post("/mobile/telemetry", mobile.sendTelemetry);

  router.get("/delivery-people", requireAuth, requirePermission("trackflow:view"), async (_req, res) => {
    res.json({ delivery_people: await listDeliveryPeopleWithLocations() });
  });
  router.post("/delivery-people", requireAuth, requirePermission("trackflow:manage-delivery-people"), createDeliveryPerson);
  router.patch("/delivery-people/:id", requireAuth, requirePermission("trackflow:manage-delivery-people"), updateDeliveryPerson);
  router.delete("/delivery-people/:id", requireAuth, requirePermission("trackflow:manage-delivery-people"), deactivateDeliveryPerson);

  router.get("/settings/kafka", requireAuth, requirePermission("trackflow:manage-settings"), settings.getKafkaSettings);
  router.post("/settings/kafka", requireAuth, requirePermission("trackflow:manage-settings"), settings.saveKafkaSettings);
  router.post("/settings/kafka/test", requireAuth, requirePermission("trackflow:manage-settings"), settings.testKafkaSettings);

  router.post("/tracking-sessions", requireAuth, requirePermission("trackflow:create-public-links"), createTrackingSession);
  router.post("/tracking-sessions/:id/revoke", requireAuth, requirePermission("trackflow:revoke-public-links"), revokeTrackingSession);
  router.get("/public/:publicToken", getPublicTrackingSession);

  return router;
}
