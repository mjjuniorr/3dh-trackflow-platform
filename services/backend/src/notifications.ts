import type { Request, Response } from "express";
import type { Server } from "socket.io";
import { prisma } from "./prisma.js";
import type { DeviceNotificationType } from "./notification-transition.js";

type CreateDeviceNotificationInput = {
  type: DeviceNotificationType;
  deviceId: string;
  deliveryPersonId?: string | null;
  deliveryPersonName?: string | null;
};

function notificationCopy(input: CreateDeviceNotificationInput) {
  const name = input.deliveryPersonName?.trim() || input.deviceId;
  if (input.type === "DEVICE_OFFLINE") {
    return {
      title: `${name} ficou offline`,
      message: `O dispositivo ${input.deviceId} nao envia localizacao ha mais de 5 minutos.`,
      severity: "warning"
    };
  }
  return {
    title: `${name} voltou online`,
    message: `O dispositivo ${input.deviceId} voltou a enviar localizacao.`,
    severity: "success"
  };
}

export async function createDeviceNotification(io: Server, input: CreateDeviceNotificationInput) {
  const copy = notificationCopy(input);
  const notification = await prisma.notification.create({
    data: {
      type: input.type,
      device_id: input.deviceId,
      delivery_person_id: input.deliveryPersonId ?? null,
      title: copy.title,
      message: copy.message,
      severity: copy.severity
    }
  });

  if (input.type === "DEVICE_ONLINE") {
    await prisma.notification.updateMany({
      where: {
        device_id: input.deviceId,
        type: "DEVICE_OFFLINE",
        resolved_at: null
      },
      data: { resolved_at: notification.created_at }
    });
  }

  io.to("dashboard").emit("notification:new", { notification });
  return notification;
}

export async function listNotificationsForUser(userId: string, limit = 100) {
  const notifications = await prisma.notification.findMany({
    orderBy: { created_at: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
    include: {
      delivery_person: { select: { id: true, name: true, device_id: true, vehicle_type: true } },
      reads: { where: { user_id: userId }, select: { read_at: true } }
    }
  });

  return notifications.map(({ reads, ...notification }) => ({
    ...notification,
    is_read: reads.length > 0,
    read_at: reads[0]?.read_at ?? null
  }));
}

export function unreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { reads: { none: { user_id: userId } } }
  });
}

export function createNotificationHandlers(io: Server) {
  return {
    async list(req: Request, res: Response) {
      const userId = req.user!.id;
      const limit = Number(req.query.limit || 100);
      res.json({ notifications: await listNotificationsForUser(userId, limit) });
    },

    async unreadCount(req: Request, res: Response) {
      const count = await unreadNotificationCount(req.user!.id);
      res.json({ unread_count: count });
    },

    async markRead(req: Request, res: Response) {
      const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
      if (!notification) return res.status(404).json({ message: "Notificacao nao encontrada." });

      await prisma.notificationRead.upsert({
        where: {
          notification_id_user_id: {
            notification_id: notification.id,
            user_id: req.user!.id
          }
        },
        update: { read_at: new Date() },
        create: {
          notification_id: notification.id,
          user_id: req.user!.id
        }
      });

      const count = await unreadNotificationCount(req.user!.id);
      io.to(`user:${req.user!.id}`).emit("notification:count", { unread_count: count });
      res.json({ read: true, unread_count: count });
    },

    async markAllRead(req: Request, res: Response) {
      const userId = req.user!.id;
      const unread = await prisma.notification.findMany({
        where: { reads: { none: { user_id: userId } } },
        select: { id: true }
      });

      if (unread.length > 0) {
        await prisma.notificationRead.createMany({
          data: unread.map((notification) => ({
            notification_id: notification.id,
            user_id: userId
          })),
          skipDuplicates: true
        });
      }

      io.to(`user:${userId}`).emit("notification:count", { unread_count: 0 });
      res.json({ read: unread.length, unread_count: 0 });
    }
  };
}
