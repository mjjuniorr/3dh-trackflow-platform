import { Kafka, type Consumer, type SASLOptions } from "kafkajs";
import { z } from "zod";
import type { Server } from "socket.io";
import { config } from "./config.js";
import { saveLocation } from "./location-store.js";
import { redis } from "./location-store.js";
import { emitLocationUpdate } from "./realtime.js";

export type KafkaRuntimeSettings = {
  broker: string;
  topic: string;
  clientId: string;
  groupId: string;
  ssl: boolean;
  saslMechanism?: string;
  saslUsername?: string;
  saslPassword?: string;
};

const SETTINGS_KEY = "settings:kafka";
let currentConsumer: Consumer | undefined;
let activeRunId = 0;

const messageSchema = z.object({
  device_id: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  speed: z.number().default(0),
  heading: z.number().optional(),
  battery: z.number().int().min(0).max(100).optional(),
  accuracy: z.number().optional(),
  timestamp: z.string().datetime({ offset: true })
});

export async function getKafkaSettings(): Promise<KafkaRuntimeSettings> {
  const saved = await redis.get(SETTINGS_KEY);
  if (saved) {
    return JSON.parse(saved) as KafkaRuntimeSettings;
  }
  return {
    broker: config.kafkaBrokers.join(","),
    topic: config.kafkaTopic,
    clientId: config.kafkaClientId,
    groupId: config.kafkaGroupId,
    ssl: config.kafkaSsl,
    saslMechanism: config.kafkaSaslMechanism || undefined,
    saslUsername: config.kafkaSaslUsername || undefined,
    saslPassword: config.kafkaSaslPassword || undefined
  };
}

export async function saveKafkaSettings(settings: KafkaRuntimeSettings) {
  await redis.set(SETTINGS_KEY, JSON.stringify(settings));
}

export async function testKafkaConnection(settings: KafkaRuntimeSettings) {
  const kafka = createKafka(settings, `${settings.clientId}-connection-test`);
  const admin = kafka.admin();
  await admin.connect();
  try {
    const topics = await admin.listTopics();
    return { ok: true, topics, topic_exists: topics.includes(settings.topic) };
  } finally {
    await admin.disconnect();
  }
}

export async function startKafkaConsumer(io: Server) {
  const settings = await getKafkaSettings();
  console.log(
    `Iniciando consumidor Kafka clientId=${settings.clientId} groupId=${settings.groupId} topic=${settings.topic} broker=${settings.broker}`
  );
  const kafka = createKafka(settings);
  const consumer = kafka.consumer({ groupId: settings.groupId });

  await consumer.connect();
  await consumer.subscribe({ topic: settings.topic, fromBeginning: false });
  currentConsumer = consumer;

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      let raw: unknown;
      try {
        raw = JSON.parse(message.value.toString());
      } catch {
        console.warn("Mensagem Kafka ignorada: JSON invalido");
        return;
      }
      const parsed = messageSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn("Mensagem Kafka invalida", parsed.error.flatten());
        return;
      }

      await saveLocation(parsed.data);
      await emitLocationUpdate(io, parsed.data.device_id);
    }
  });
}

export function startKafkaConsumerWithRetry(io: Server) {
  activeRunId += 1;
  void retryForever(async () => startKafkaConsumer(io), "consumidor Kafka", activeRunId);
}

export async function restartKafkaConsumer(io: Server) {
  activeRunId += 1;
  if (currentConsumer) {
    await currentConsumer.disconnect().catch(() => undefined);
    currentConsumer = undefined;
  }
  void retryForever(async () => startKafkaConsumer(io), "consumidor Kafka", activeRunId);
}

async function retryForever(task: () => Promise<void>, label: string, runId: number) {
  let attempt = 0;
  while (runId === activeRunId) {
    try {
      await task();
      return;
    } catch (error) {
      attempt += 1;
      const delayMs = Math.min(30_000, 2_000 * attempt);
      console.error(`Falha ao iniciar ${label}. Nova tentativa em ${delayMs / 1000}s`, error);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function createKafka(settings: KafkaRuntimeSettings, clientId = settings.clientId) {
  return new Kafka({
    clientId,
    brokers: settings.broker.split(",").map((broker) => broker.trim()).filter(Boolean),
    connectionTimeout: 5_000,
    requestTimeout: 8_000,
    ssl: settings.ssl,
    sasl: buildSaslOptions(settings)
  });
}

function buildSaslOptions(settings: KafkaRuntimeSettings): SASLOptions | undefined {
  if (!settings.saslMechanism || !settings.saslUsername || !settings.saslPassword) {
    return undefined;
  }

  if (settings.saslMechanism === "plain") {
    return {
      mechanism: "plain",
      username: settings.saslUsername,
      password: settings.saslPassword
    };
  }

  if (settings.saslMechanism === "scram-sha-256" || settings.saslMechanism === "scram-sha-512") {
    return {
      mechanism: settings.saslMechanism,
      username: settings.saslUsername,
      password: settings.saslPassword
    };
  }

  throw new Error(`Mecanismo SASL nao suportado: ${settings.saslMechanism}`);
}
