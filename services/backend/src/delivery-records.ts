import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "./prisma.js";

const createDeliveryRecordSchema = z.object({
  invoice_number: z.string().min(1),
  delivery_person_id: z.string().min(1),
  notes: z.string().optional()
});

const listQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export type DeliveryRecordSummaryInput = {
  cancelled_at?: string | Date | null;
  delivery_person: {
    id: string;
    name: string;
  };
};

export function normalizeInvoiceNumber(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function summarizeDeliveryRecords(records: DeliveryRecordSummaryInput[]) {
  const totals = new Map<string, { delivery_person_id: string; name: string; total: number }>();
  for (const record of records) {
    if (record.cancelled_at) continue;
    const current = totals.get(record.delivery_person.id) ?? {
      delivery_person_id: record.delivery_person.id,
      name: record.delivery_person.name,
      total: 0
    };
    current.total += 1;
    totals.set(record.delivery_person.id, current);
  }

  return {
    total: [...totals.values()].reduce((sum, item) => sum + item.total, 0),
    by_delivery_person: [...totals.values()].sort((left, right) => right.total - left.total || left.name.localeCompare(right.name))
  };
}

function dateRange(dateValue?: string) {
  const base = dateValue ? new Date(`${dateValue}T00:00:00.000-04:00`) : new Date();
  if (!dateValue) base.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setDate(end.getDate() + 1);
  return { start: base, end };
}

export async function listDeliveryRecords(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Data invalida. Use YYYY-MM-DD." });
  }

  const { start, end } = dateRange(parsed.data.date);
  const records = await prisma.deliveryRecord.findMany({
    where: {
      created_at: {
        gte: start,
        lt: end
      }
    },
    include: {
      delivery_person: true,
      created_by_user: {
        select: { id: true, name: true, email: true }
      },
      cancelled_by_user: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { created_at: "desc" }
  });

  return res.json({
    records,
    summary: summarizeDeliveryRecords(records)
  });
}

export async function createDeliveryRecord(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticacao obrigatoria." });
  }

  const parsed = createDeliveryRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Informe NF e motoboy." });
  }

  const invoiceNumber = normalizeInvoiceNumber(parsed.data.invoice_number);
  const deliveryPerson = await prisma.deliveryPerson.findUnique({
    where: { id: parsed.data.delivery_person_id }
  });
  if (!deliveryPerson || !deliveryPerson.is_active) {
    return res.status(404).json({ message: "Motoboy nao encontrado ou inativo." });
  }

  try {
    const record = await prisma.deliveryRecord.create({
      data: {
        invoice_number: invoiceNumber,
        delivery_person_id: deliveryPerson.id,
        created_by_user_id: req.user.id,
        notes: parsed.data.notes?.trim() || null
      },
      include: {
        delivery_person: true,
        created_by_user: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    return res.status(201).json({ record });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      return res.status(409).json({ message: "Esta nota fiscal ja foi lancada." });
    }
    throw error;
  }
}

export async function cancelDeliveryRecord(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticacao obrigatoria." });
  }

  const id = String(req.params.id || "");
  const record = await prisma.deliveryRecord.findUnique({ where: { id } });
  if (!record) {
    return res.status(404).json({ message: "Lancamento nao encontrado." });
  }
  if (record.cancelled_at) {
    return res.status(409).json({ message: "Lancamento ja cancelado." });
  }

  const updated = await prisma.deliveryRecord.update({
    where: { id },
    data: {
      cancelled_at: new Date(),
      cancelled_by_user_id: req.user.id
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
}
