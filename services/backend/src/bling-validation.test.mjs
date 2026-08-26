import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBlingValidationPayload,
  resolveBlingValidationStatus,
  sanitizeBlingValidationError
} from "../dist/src/bling-validation.js";

test("buildBlingValidationPayload preserves invoice zeros and uses next day as final date", () => {
  const payload = buildBlingValidationPayload({
    id: "record-1",
    invoice_number: "000445",
    created_at: new Date("2026-08-25T15:59:00.000-04:00")
  });

  assert.deepEqual(payload, {
    record_id: "record-1",
    invoice_number: "000445",
    issue_date: "2026-08-25",
    issue_date_end: "2026-08-26"
  });
});

test("resolveBlingValidationStatus marks matching authorized invoice as valid", () => {
  assert.equal(
    resolveBlingValidationStatus({
      found: true,
      document_type: "nfe",
      invoice_number: "000445",
      issue_date: "2026-08-25",
      status: "authorized"
    }),
    "valid"
  );
  assert.equal(
    resolveBlingValidationStatus({
      found: true,
      document_type: "nfce",
      invoice_number: "001456",
      issue_date: "2026-08-25",
      status: "6"
    }),
    "valid"
  );
});

test("resolveBlingValidationStatus does not validate missing or divergent invoices", () => {
  assert.equal(resolveBlingValidationStatus({ found: false }), "not_found");
  assert.equal(
    resolveBlingValidationStatus({
      found: true,
      document_type: "nfce",
      invoice_number: "001456",
      issue_date: "2026-08-25",
      status: "cancelled",
      divergent: true
    }),
    "divergent"
  );
});

test("sanitizeBlingValidationError removes sensitive detail from external errors", () => {
  assert.equal(
    sanitizeBlingValidationError("Bearer abc123 failed for cliente joao@example.com chave 13260841294566000150550010000004451962515250"),
    "Falha ao validar NF no Bling."
  );
});
