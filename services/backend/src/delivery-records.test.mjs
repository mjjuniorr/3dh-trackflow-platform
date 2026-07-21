import test from "node:test";
import assert from "node:assert/strict";
import { normalizeInvoiceNumber, summarizeDeliveryRecords } from "../dist/src/delivery-records.js";

test("normalizeInvoiceNumber trims, uppercases, and removes internal spaces", () => {
  assert.equal(normalizeInvoiceNumber(" nf  12345 "), "NF12345");
});

test("summarizeDeliveryRecords counts only active records by delivery person", () => {
  const summary = summarizeDeliveryRecords([
    { id: "1", cancelled_at: null, delivery_person: { id: "joao", name: "Joao" } },
    { id: "2", cancelled_at: null, delivery_person: { id: "joao", name: "Joao" } },
    { id: "3", cancelled_at: null, delivery_person: { id: "carlos", name: "Carlos" } },
    { id: "4", cancelled_at: "2026-07-21T12:00:00.000Z", delivery_person: { id: "joao", name: "Joao" } }
  ]);

  assert.equal(summary.total, 3);
  assert.deepEqual(summary.by_delivery_person, [
    { delivery_person_id: "joao", name: "Joao", total: 2 },
    { delivery_person_id: "carlos", name: "Carlos", total: 1 }
  ]);
});

