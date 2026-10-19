import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("../scripts/healthcheck.cjs", import.meta.url));
function probe(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", data => { output += data; });
    child.stderr.on("data", data => { output += data; });
    child.on("error", reject);
    child.on("close", code => {
      try {
        assert.doesNotMatch(output, /MODULE_NOT_FOUND|SyntaxError/, "probe must execute, not fail to load");
        resolve({ code, output });
      } catch (error) { reject(error); }
    });
  });
}
async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try { return await run(server.address().port); }
  finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

test("probe uses /api/health and accepts a healthy API on the configured port", async () => {
  await withServer((req, res) => {
    assert.equal(req.url, "/api/health");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  }, async port => assert.equal((await probe(port)).code, 0));
});

for (const status of [301, 401, 429, 500, 503]) {
  test(`probe rejects HTTP ${status}`, async () => {
    await withServer((_req, res) => { res.writeHead(status); res.end("private details"); }, async port => {
      const result = await probe(port);
      assert.equal(result.code, 1);
      assert.doesNotMatch(result.output, /private details/);
    });
  });
}

test("probe rejects connection refused", async () => {
  let port;
  await withServer((_req, res) => res.end(), async value => { port = value; });
  assert.equal((await probe(port)).code, 1);
});

test("probe times out even when a server accepts the connection but never replies", { timeout: 6000 }, async () => {
  await withServer(() => {}, async port => {
    const start = Date.now();
    assert.equal((await probe(port)).code, 1);
    assert.ok(Date.now() - start < 5000);
  });
});
