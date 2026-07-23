import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "./prisma.js";

const reportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  driverId: z.string().min(1).optional(),
  invoiceNumber: z.string().min(1).optional(),
  status: z.enum(["all", "active", "cancelled"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export type DeliveryReportRecordInput = {
  cancelled_at?: string | Date | null;
  delivery_person: {
    id: string;
    name: string;
  };
};

function localDateKey(date = new Date(), timeZone = "America/Manaus") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function startOfManausDay(dateValue: string) {
  return new Date(`${dateValue}T00:00:00.000-04:00`);
}

function endOfManausDay(dateValue: string) {
  const end = startOfManausDay(dateValue);
  end.setDate(end.getDate() + 1);
  return end;
}

export function summarizeDeliveryReport(records: DeliveryReportRecordInput[]) {
  const totals = new Map<string, { delivery_person_id: string; name: string; total: number; active: number; cancelled: number }>();
  let active = 0;
  let cancelled = 0;

  for (const record of records) {
    const isCancelled = Boolean(record.cancelled_at);
    if (isCancelled) cancelled += 1;
    else active += 1;

    const current = totals.get(record.delivery_person.id) ?? {
      delivery_person_id: record.delivery_person.id,
      name: record.delivery_person.name,
      total: 0,
      active: 0,
      cancelled: 0
    };
    current.total += 1;
    if (isCancelled) current.cancelled += 1;
    else current.active += 1;
    totals.set(record.delivery_person.id, current);
  }

  return {
    total: records.length,
    active,
    cancelled,
    by_delivery_person: [...totals.values()].sort((left, right) => right.total - left.total || left.name.localeCompare(right.name))
  };
}

export async function listDeliveryReport(req: Request, res: Response) {
  const parsed = reportQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Filtros invalidos. Use datas no formato YYYY-MM-DD." });
  }

  const today = localDateKey();
  const from = parsed.data.from ?? today;
  const to = parsed.data.to ?? from;
  const page = parsed.data.page;
  const pageSize = parsed.data.pageSize;

  const normalizedInvoice = parsed.data.invoiceNumber?.trim().replace(/\s+/g, "").toUpperCase();
  const where = {
    created_at: {
      gte: startOfManausDay(from),
      lt: endOfManausDay(to)
    },
    ...(parsed.data.driverId ? { delivery_person_id: parsed.data.driverId } : {}),
    ...(normalizedInvoice ? { invoice_number: { contains: normalizedInvoice } } : {}),
    ...(parsed.data.status === "active" ? { cancelled_at: null } : {}),
    ...(parsed.data.status === "cancelled" ? { cancelled_at: { not: null } } : {})
  };

  const [totalItems, summaryRecords, records] = await Promise.all([
    prisma.deliveryRecord.count({ where }),
    prisma.deliveryRecord.findMany({
      where,
      include: { delivery_person: true }
    }),
    prisma.deliveryRecord.findMany({
      where,
      include: {
        delivery_person: true,
        created_by_user: {
          select: { id: true, name: true, email: true }
        },
        cancelled_by_user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return res.json({
    filters: {
      from,
      to,
      driverId: parsed.data.driverId ?? null,
      invoiceNumber: normalizedInvoice ?? null,
      status: parsed.data.status
    },
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    },
    summary: summarizeDeliveryReport(summaryRecords),
    records
  });
}
