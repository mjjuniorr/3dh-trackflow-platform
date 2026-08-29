import type { Request, Response } from "express";
import { z } from "zod";
import { config } from "./config.js";
import { prisma } from "./prisma.js";

const optionalStringSchema = z.preprocess(
  (value) => value == null ? value : String(value),
  z.string().nullable().optional()
);

const optionalDateKeySchema = z.preprocess(
  (value) => typeof value === "string" ? value.slice(0, 10) : value,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
);

const normalizedBlingValidationResponseSchema = z.object({
  found: z.boolean(),
  document_type: z.enum(["nfe", "nfce"]).nullable().optional(),
  invoice_number: optionalStringSchema,
  issue_date: optionalDateKeySchema,
  status: optionalStringSchema,
  divergent: z.boolean().optional(),
  message: optionalStringSchema
});

const rawBlingValidationResponseSchema = z.preprocess((value) => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") return candidate;

  const objectCandidate = candidate as Record<string, unknown>;
  const jsonCandidate = objectCandidate.json;
  const raw = jsonCandidate && typeof jsonCandidate === "object"
    ? jsonCandidate as Record<string, unknown>
    : objectCandidate;

  return Object.fromEntries(Object.entries({
    found: raw.found,
    document_type: raw.document_type ?? raw.documentType ?? raw.tipoDocumento,
    invoice_number: raw.invoice_number ?? raw.invoiceNumber ?? raw.numero,
    issue_date: raw.issue_date ?? raw.issueDate ?? raw.dataEmissao,
    status: raw.status ?? raw.situacao,
    divergent: raw.divergent,
    message: raw.message ?? raw.mensagem
  }).filter(([, fieldValue]) => fieldValue !== undefined));
}, normalizedBlingValidationResponseSchema);

export type BlingValidationStatus = "pending" | "valid" | "not_found" | "divergent" | "error";

export type BlingValidationPayloadInput = {
  id: string;
  invoice_number: string;
  created_at: Date | string;
};

export type BlingValidationResult = z.infer<typeof normalizedBlingValidationResponseSchema>;

function manausDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function nextDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000-04:00`);
  date.setDate(date.getDate() + 1);
  return manausDateKey(date);
}

export function buildBlingValidationPayload(record: BlingValidationPayloadInput) {
  const issueDate = manausDateKey(record.created_at);
  return {
    record_id: record.id,
    invoice_number: record.invoice_number,
    issue_date: issueDate,
    issue_date_end: nextDateKey(issueDate)
  };
}

export function parseBlingValidationResponse(value: unknown) {
  return rawBlingValidationResponseSchema.parse(value);
}

export function resolveBlingValidationStatus(result: Pick<BlingValidationResult, "found" | "status" | "divergent">): BlingValidationStatus {
  if (!result.found) return "not_found";
  if (result.divergent) return "divergent";
  const normalizedStatus = String(result.status ?? "").trim().toLowerCase();
  return ["5", "6", "authorized", "autorizada", "emitida danfe"].includes(normalizedStatus) ? "valid" : "divergent";
}

export function sanitizeBlingValidationError(_message?: string) {
  return "Falha ao validar NF no Bling.";
}

function parseIssueDate(value?: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000-04:00`);
}

async function callBlingValidationWebhook(payload: ReturnType<typeof buildBlingValidationPayload>) {
  if (!config.blingValidationWebhookUrl || !config.blingValidationSecret) {
    throw new Error("BLING_VALIDATION_WEBHOOK_URL e BLING_VALIDATION_SECRET devem estar configurados.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(config.blingValidationWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TrackFlow-Bling-Secret": config.blingValidationSecret
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof body.message === "string" ? body.message : `Webhook Bling retornou HTTP ${response.status}.`);
    }

    return parseBlingValidationResponse(body);
  } finally {
    clearTimeout(timeout);
  }
}

export async function validateDeliveryRecordWithBling(req: Request, res: Response) {
  const record = await prisma.deliveryRecord.findUnique({
    where: { id: String(req.params.id || "") },
    include: {
      delivery_person: true,
      created_by_user: {
        select: { id: true, name: true, email: true }
      },
      cancelled_by_user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!record) {
    return res.status(404).json({ message: "Lancamento nao encontrado." });
  }

  try {
    const result = await callBlingValidationWebhook(buildBlingValidationPayload(record));
    const status = resolveBlingValidationStatus(result);
    const updated = await prisma.deliveryRecord.update({
      where: { id: record.id },
      data: {
        bling_validation_status: status,
        bling_document_type: result.document_type ?? null,
        bling_issue_date: parseIssueDate(result.issue_date),
        bling_validated_at: new Date(),
        bling_error: status === "valid" ? null : result.message ?? null
      },
      include: {
        delivery_person: true,
        created_by_user: {
          select: { id: true, name: true, email: true }
        },
        cancelled_by_user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.json({ record: updated });
  } catch (error) {
    const updated = await prisma.deliveryRecord.update({
      where: { id: record.id },
      data: {
        bling_validation_status: "error",
        bling_validated_at: new Date(),
        bling_error: sanitizeBlingValidationError(error instanceof Error ? error.message : undefined)
      },
      include: {
        delivery_person: true,
        created_by_user: {
          select: { id: true, name: true, email: true }
        },
        cancelled_by_user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.json({ message: sanitizeBlingValidationError(), record: updated });
  }
}
