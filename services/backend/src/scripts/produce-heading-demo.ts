import "dotenv/config";
import { Kafka, type SASLOptions } from "kafkajs";
import { config } from "../config.js";

type DemoPoint = {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
};

const deviceId = process.env.TEST_DEVICE_ID ?? "entregador_001";
const battery = Number(process.env.TEST_BATTERY ?? 87);
const accuracy = Number(process.env.TEST_ACCURACY ?? 8);
const intervalMs = Number(process.env.TEST_INTERVAL_MS ?? 1200);

const route: DemoPoint[] = [
  { lat: -3.094167, lng: -60.021944, heading: 0, speed: 18 },
  { lat: -3.093900, lng: -60.021944, heading: 0, speed: 19 },
  { lat: -3.093900, lng: -60.021600, heading: 90, speed: 21 },
  { lat: -3.094180, lng: -60.021600, heading: 180, speed: 16 },
  { lat: -3.094180, lng: -60.021944, heading: 270, speed: 14 },
  { lat: -3.094050, lng: -60.021770, heading: 45, speed: 17 },
  { lat: -3.094220, lng: -60.021520, heading: 135, speed: 20 },
  { lat: -3.094420, lng: -60.021780, heading: 225, speed: 15 },
  { lat: -3.094167, lng: -60.021944, heading: 315, speed: 18 }
];

async function main() {
  const kafka = new Kafka({
    clientId: `${config.kafkaClientId}-heading-demo`,
    brokers: config.kafkaBrokers,
    ssl: config.kafkaSsl,
    sasl: buildSaslOptions()
  });

  const producer = kafka.producer();
  await producer.connect();

  for (const point of route) {
    const payload = {
      device_id: deviceId,
      lat: point.lat,
      lng: point.lng,
      speed: point.speed,
      heading: point.heading,
      battery,
      accuracy,
      timestamp: new Date().toISOString()
    };

    const result = await producer.send({
      topic: config.kafkaTopic,
      messages: [{ key: deviceId, value: JSON.stringify(payload) }]
    });

    console.log(
      `heading=${point.heading} lat=${point.lat} lng=${point.lng} offset=${result[0]?.offset ?? "-"}`
    );

    await sleep(intervalMs);
  }

  await producer.disconnect();
}

function buildSaslOptions(): SASLOptions | undefined {
  if (!config.kafkaSaslMechanism || !config.kafkaSaslUsername || !config.kafkaSaslPassword) {
    return undefined;
  }

  if (config.kafkaSaslMechanism === "plain") {
    return {
      mechanism: "plain",
      username: config.kafkaSaslUsername,
      password: config.kafkaSaslPassword
    };
  }

  if (config.kafkaSaslMechanism === "scram-sha-256" || config.kafkaSaslMechanism === "scram-sha-512") {
    return {
      mechanism: config.kafkaSaslMechanism,
      username: config.kafkaSaslUsername,
      password: config.kafkaSaslPassword
    };
  }

  throw new Error(`Mecanismo SASL nao suportado: ${config.kafkaSaslMechanism}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("Falha ao enviar demo de heading para Kafka", error);
  process.exit(1);
});
