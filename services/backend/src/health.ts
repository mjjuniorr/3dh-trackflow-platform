import { Router } from "express";

export function createHealthRouter(): Router {
  const router = Router();
  router.get(["/health", "/api/health"], (_req, res) => {
    res.set("Cache-Control", "no-store").json({ status: "ok" });
  });
  return router;
}
