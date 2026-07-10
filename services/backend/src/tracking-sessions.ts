import type { Request, Response } from "express";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { computeStatus, getLastLocation } from "./location-store.js";
import { prisma } from "./prisma.js";
import { getServiceDomains } from "./settings.js";

const token = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 12);

const createSchema = z.object({
  delivery_person_id: z.string().min(1),
  title: z.string().max(120).optional(),
  expires_in_minutes: z.number().int().min(1).max(24 * 60)
});

export async function createTrackingSession(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success || !req.user) {
    return res.status(400).json({ message: "Dados invalidos." });
  }

  const deliveryPerson = await prisma.deliveryPerson.findUnique({
    where: { id: parsed.data.delivery_person_id }
  });
  if (!deliveryPerson) {
    return res.status(404).json({ message: "Entregador nao encontrado." });
  }
  if (!deliveryPerson.is_active) {
    return res.status(400).json({ message: "Entregador desativado." });
  }

  const publicToken = token();
  const expiresAt = new Date(Date.now() + parsed.data.expires_in_minutes * 60_000);
  const session = await prisma.trackingSession.create({
    data: {
      public_token: publicToken,
      delivery_person_id: deliveryPerson.id,
      created_by_user_id: req.user.id,
      title: parsed.data.title,
      expires_at: expiresAt
    }
  });
  const domains = await getServiceDomains();
  const publicPath = `/t/${publicToken}`;

  return res.status(201).json({
    session,
    public_path: publicPath,
    public_url: `${domains.publicBaseUrl}${publicPath}`
  });
}

export async function revokeTrackingSession(req: Request, res: Response) {
  const sessionId = String(req.params.id);
  const session = await prisma.trackingSession.update({
    where: { id: sessionId },
    data: { status: "revoked" }
  });
  return res.json({ session });
}

export async function getPublicTrackingSession(req: Request, res: Response) {
  const publicToken = String(req.params.publicToken);
  const session = await prisma.trackingSession.findUnique({
    where: { public_token: publicToken },
    include: { delivery_person: true }
  });

  if (!session) {
    return res.status(404).json({ message: "Link de rastreamento nao encontrado." });
  }

  if (session.status !== "active" || session.expires_at.getTime() <= Date.now()) {
    if (session.status === "active") {
      await prisma.trackingSession.update({
        where: { id: session.id },
        data: { status: "expired" }
      });
    }
    return res.status(410).json({ message: "Este link de rastreamento expirou." });
  }

  await prisma.trackingSession.update({
    where: { id: session.id },
    data: { last_seen_at: new Date() }
  });

  const lastLocation = await getLastLocation(session.delivery_person.device_id);
  const status = computeStatus(lastLocation?.timestamp);
  return res.json({
    public_token: session.public_token,
    title: session.title,
    expires_at: session.expires_at,
    delivery_person: {
      name: session.delivery_person.name,
      device_id: session.delivery_person.device_id,
      vehicle_type: session.delivery_person.vehicle_type,
      status
    },
    last_location: lastLocation
  });
}
