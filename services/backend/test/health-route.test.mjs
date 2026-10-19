import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import { createHealthRouter } from "../dist/src/health.js";

test("both health URLs are public, non-cacheable, and disclose only liveness", async () => {
  const app = express();
  app.use(createHealthRouter());
  app.use((_req, res) => res.sendStatus(401));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  try {
    for (const route of ["/health", "/api/health"]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), { status: "ok" });
    }
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/private`)).status, 401);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
