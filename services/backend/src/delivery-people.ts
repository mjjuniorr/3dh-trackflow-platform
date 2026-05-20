import type { Request, Response } from "express";
import { z } from "zod";
import { isMobileRequestAuthorized } from "./mobile.js";
import { prisma } from "./prisma.js";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  device_id: z.string().min(2).max(120),
  phone: z.string().max(40).optional()
});

const updateSchema = createSchema.extend({
  is_active: z.boolean().optional()
}).partial();

export async function createDeliveryPerson(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Dados invalidos." });
  }

  const person = await prisma.deliveryPerson.upsert({
    where: { device_id: parsed.data.device_id },
    update: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      is_active: true
    },
    create: {
      name: parsed.data.name,
      device_id: parsed.data.device_id,
      phone: parsed.data.phone || null,
      is_active: true
    }
  });

  return res.status(201).json({ delivery_person: person });
}

export async function updateDeliveryPerson(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Dados invalidos." });
  }

  const person = await prisma.deliveryPerson.update({
    where: { id: String(req.params.id) },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.device_id ? { device_id: parsed.data.device_id } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
      ...(parsed.data.is_active !== undefined ? { is_active: parsed.data.is_active } : {})
    }
  });

  return res.json({ delivery_person: person });
}

export async function deactivateDeliveryPerson(req: Request, res: Response) {
  const person = await prisma.deliveryPerson.update({
    where: { id: String(req.params.id) },
    data: { is_active: false, status: "offline" }
  });

  return res.json({ delivery_person: person });
}

export async function registerMobileDeliveryPerson(req: Request, res: Response) {
  if (!isMobileRequestAuthorized(req)) {
    return res.status(401).json({ message: "Cadastro mobile nao autorizado." });
  }

  return createDeliveryPerson(req, res);
}
