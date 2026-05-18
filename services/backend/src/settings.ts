import type { Request, Response } from "express";
import type { Server } from "socket.io";
import { z } from "zod";
import {
  getKafkaSettings,
  restartKafkaConsumer,
  saveKafkaSettings,
  testKafkaConnection,
  type KafkaRuntimeSettings
} from "./kafka.js";
import { verifyAdminPassword } from "./auth.js";

const kafkaSettingsSchema = z.object({
  admin_password: z.string().min(1),
  broker: z.string().min(3).refine((value) => !value.includes("kafka.3dhmanaus.shop"), {
    message: "Use kafka:9092 no backend. kafka.3dhmanaus.shop e apenas Kafka UI."
  }),
  topic: z.string().min(1),
  clientId: z.string().min(1),
  groupId: z.string().min(1),
  ssl: z.boolean(),
  saslMechanism: z.enum(["", "plain", "scram-sha-256", "scram-sha-512"]).optional(),
  saslUsername: z.string().optional(),
  saslPassword: z.string().optional()
});

function toSettings(data: z.infer<typeof kafkaSettingsSchema>): KafkaRuntimeSettings {
  return {
    broker: data.broker,
    topic: data.topic,
    clientId: data.clientId,
    groupId: data.groupId,
    ssl: data.ssl,
    saslMechanism: data.saslMechanism || undefined,
    saslUsername: data.saslUsername || undefined,
    saslPassword: data.saslPassword || undefined
  };
}

function redact(settings: KafkaRuntimeSettings) {
  return {
    ...settings,
    saslPassword: settings.saslPassword ? "********" : ""
  };
}

async function assertAdminPassword(req: Request, password: string) {
  if (!req.user) return false;
  return verifyAdminPassword(req.user.id, password);
}

export function createSettingsHandlers(io: Server) {
  return {
    getKafkaSettings: async (_req: Request, res: Response) => {
      const settings = await getKafkaSettings();
      return res.json({ settings: redact(settings) });
    },

    saveKafkaSettings: async (req: Request, res: Response) => {
      const parsed = kafkaSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados invalidos." });
      }
      if (!(await assertAdminPassword(req, parsed.data.admin_password))) {
        return res.status(403).json({ message: "Credenciais administrativas invalidas." });
      }

      const settings = toSettings(parsed.data);
      await saveKafkaSettings(settings);
      await restartKafkaConsumer(io);
      return res.json({ settings: redact(settings), message: "Configuracao Kafka salva." });
    },

    testKafkaSettings: async (req: Request, res: Response) => {
      const parsed = kafkaSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados invalidos." });
      }
      if (!(await assertAdminPassword(req, parsed.data.admin_password))) {
        return res.status(403).json({ message: "Credenciais administrativas invalidas." });
      }

      try {
        const result = await testKafkaConnection(toSettings(parsed.data));
        return res.json(result);
      } catch (error) {
        return res.status(400).json({
          ok: false,
          message: error instanceof Error ? error.message : "Falha ao conectar no Kafka."
        });
      }
    }
  };
}
