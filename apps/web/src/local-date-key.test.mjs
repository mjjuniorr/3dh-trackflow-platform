import assert from "node:assert/strict";

const { localDateKey } = await import("./local-date-key.ts");
const lateEveningManaus = new Date("2026-07-23T03:30:00.000Z");

assert.equal(localDateKey(lateEveningManaus, "America/Manaus"), "2026-07-22");
console.log("local-date-key ok");
