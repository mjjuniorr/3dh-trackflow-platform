import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBlingValidationPayload,
  parseBlingValidationResponse,
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

test("parseBlingValidationResponse accepts n8n camelCase invoice response", () => {
  assert.deepEqual(
    parseBlingValidationResponse({
      found: true,
      documentType: "nfce",
      numero: "001466",
      issueDate: "2026-08-26",
      status: "5",
      message: "NF encontrada no Bling."
    }),
    {
      found: true,
      document_type: "nfce",
      invoice_number: "001466",
      issue_date: "2026-08-26",
      status: "5",
      message: "NF encontrada no Bling."
    }
  );
});

test("parseBlingValidationResponse accepts n8n item-array response", () => {
  assert.deepEqual(
    parseBlingValidationResponse([{
      json: {
        found: true,
        documentType: "nfce",
        numero: "001468",
        issueDate: "2026-08-27",
        status: "5"
      }
    }]),
    {
      found: true,
      document_type: "nfce",
      invoice_number: "001468",
      issue_date: "2026-08-27",
      status: "5"
    }
  );
});

test("parseBlingValidationResponse coerces n8n numeric fields", () => {
  assert.deepEqual(
    parseBlingValidationResponse({
      found: true,
      documentType: "nfce",
      numero: 1471,
      issueDate: "2026-08-27T00:00:00-04:00",
      status: 5
    }),
    {
      found: true,
      document_type: "nfce",
      invoice_number: "1471",
      issue_date: "2026-08-27",
      status: "5"
    }
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
