import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const shell = process.env.TEST_SHELL || "sh";
function shellPath(value) {
  if (process.platform !== "win32") return value;
  return value.replaceAll("\\", "/").replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
}

function runStartup(migrationExit, serverExit = 0) {
  const dir = mkdtempSync(path.join(tmpdir(), "trackflow-startup-"));
  try {
    // Replace only the external Prisma/server processes; execute the real startup script.
    const executable = `#!/bin/sh
case "$*" in
  "prisma migrate deploy"|"../../node_modules/prisma/build/index.js migrate deploy")
    echo migration >> "$TEST_TRACE"
    exit "$TEST_MIGRATION_EXIT" ;;
  "dist/src/server.js")
    echo server >> "$TEST_TRACE"
    exit "$TEST_SERVER_EXIT" ;;
  *) exit 99 ;;
esac
`;
    for (const command of ["node", "npx"]) {
      writeFileSync(path.join(dir, command), executable, { mode: 0o755 });
    }
    const trace = path.join(dir, "trace");
    // Run the command actually configured in the image, including its shell script.
    const command = JSON.parse(readFileSync(path.join(root, "Dockerfile"), "utf8").match(/^CMD (.+)$/m)[1]);
    const result = spawnSync(shell, ["-c", 'PATH="$1:/usr/bin:$PATH"; export PATH; shift; exec "$@"', "test", shellPath(dir), ...command], {
      cwd: root,
      encoding: "utf8",
      timeout: 4000,
      env: { ...process.env, TEST_TRACE: shellPath(trace), TEST_MIGRATION_EXIT: String(migrationExit), TEST_SERVER_EXIT: String(serverExit) }
    });
    return { ...result, trace: existsSync(trace) ? readFileSync(trace, "utf8").trim().split("\n") : [] };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("migration failure exits nonzero after one attempt and never starts the API", () => {
  const result = runStartup(19);
  assert.equal(result.status, 19, `startup must fail, not wait forever: ${result.stderr}`);
  assert.deepEqual(result.trace, ["migration"]);
});

test("successful migration starts the API and propagates its exit status", () => {
  const result = runStartup(0, 23);
  assert.equal(result.status, 23, result.stderr);
  assert.deepEqual(result.trace, ["migration", "server"]);
});
