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
import { config } from "./config.js";
import { redis } from "./location-store.js";

const kafkaSettingsSchema = z.object({
  admin_password: z.string().optional(),
  broker: z.string().min(3).refine((value) => !value.includes("kafka.3dhmanaus.com.br"), {
    message: "Use kafka:9092 no backend. kafka.3dhmanaus.com.br e apenas Kafka UI."
  }),
  topic: z.string().min(1),
  clientId: z.string().min(1),
  groupId: z.string().min(1),
  ssl: z.boolean(),
  saslMechanism: z.enum(["", "plain", "scram-sha-256", "scram-sha-512"]).optional(),
  saslUsername: z.string().optional(),
  saslPassword: z.string().optional()
});

export type ServiceDomainSettings = {
  publicBaseUrl: string;
  mobileApiBaseUrl: string;
  kafkaUiUrl: string;
  portalUrl: string;
  authUrl: string;
};

const SERVICE_DOMAINS_KEY = "settings:service-domains";

const serviceDomainsSchema = z.object({
  publicBaseUrl: z.string().url(),
  mobileApiBaseUrl: z.string().url(),
  kafkaUiUrl: z.string().url(),
  portalUrl: z.string().url(),
  authUrl: z.string().url()
});

const defaultServiceDomains: ServiceDomainSettings = {
  publicBaseUrl: config.publicBaseUrl,
  mobileApiBaseUrl: config.publicBaseUrl,
  kafkaUiUrl: "https://kafka.3dhmanaus.com.br",
  portalUrl: config.portalUrl,
  authUrl: config.oidcIssuer || "https://auth.3dhmanaus.com.br/realms/3dh"
};

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

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export async function getServiceDomains(): Promise<ServiceDomainSettings> {
  const saved = await redis.get(SERVICE_DOMAINS_KEY);
  if (!saved) return defaultServiceDomains;
  return { ...defaultServiceDomains, ...JSON.parse(saved) };
}

async function saveServiceDomains(settings: ServiceDomainSettings) {
  await redis.set(SERVICE_DOMAINS_KEY, JSON.stringify(settings));
}

async function assertAdminPassword(req: Request, password: string) {
  if (!req.user) return false;
  if (req.user.authType === "oidc") {
    return req.user.permissions.includes("trackflow:manage-settings");
  }
  return verifyAdminPassword(req.user.id, password);
}

export function createSettingsHandlers(io: Server) {
  return {
    getKafkaSettings: async (_req: Request, res: Response) => {
      const settings = await getKafkaSettings();
      return res.json({ settings: redact(settings) });
    },

    getServiceDomains: async (_req: Request, res: Response) => {
      const settings = await getServiceDomains();
      return res.json({ settings });
    },

    saveServiceDomains: async (req: Request, res: Response) => {
      const parsed = serviceDomainsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dominios invalidos." });
      }
      if (!(await assertAdminPassword(req, req.body.admin_password ?? ""))) {
        return res.status(403).json({ message: "Credenciais administrativas invalidas." });
      }

      const settings = {
        publicBaseUrl: normalizeUrl(parsed.data.publicBaseUrl),
        mobileApiBaseUrl: normalizeUrl(parsed.data.mobileApiBaseUrl),
        kafkaUiUrl: normalizeUrl(parsed.data.kafkaUiUrl),
        portalUrl: normalizeUrl(parsed.data.portalUrl),
        authUrl: normalizeUrl(parsed.data.authUrl)
      };
      await saveServiceDomains(settings);
      return res.json({ settings, message: "Dominios dos servicos salvos." });
    },

    saveKafkaSettings: async (req: Request, res: Response) => {
      const parsed = kafkaSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados invalidos." });
      }
      if (!(await assertAdminPassword(req, parsed.data.admin_password ?? ""))) {
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
      if (!(await assertAdminPassword(req, parsed.data.admin_password ?? ""))) {
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
