import test from "node:test";
import assert from "node:assert/strict";
import { summarizeDeliveryReport } from "../dist/src/reports.js";

const records = [
  { id: "1", invoice_number: "101", cancelled_at: null, delivery_person: { id: "eudes", name: "Eudes" } },
  { id: "2", invoice_number: "102", cancelled_at: null, delivery_person: { id: "eudes", name: "Eudes" } },
  { id: "3", invoice_number: "103", cancelled_at: "2026-07-22T15:00:00.000Z", delivery_person: { id: "loja", name: "Loja" } }
];

test("summarizeDeliveryReport counts active and cancelled records by delivery person", () => {
  const summary = summarizeDeliveryReport(records);

  assert.equal(summary.total, 3);
  assert.equal(summary.active, 2);
  assert.equal(summary.cancelled, 1);
  assert.deepEqual(summary.by_delivery_person, [
    { delivery_person_id: "eudes", name: "Eudes", total: 2, active: 2, cancelled: 0 },
    { delivery_person_id: "loja", name: "Loja", total: 1, active: 0, cancelled: 1 }
  ]);
});
