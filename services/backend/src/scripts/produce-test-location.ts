import "dotenv/config";
import { Kafka, type SASLOptions } from "kafkajs";
import { config } from "../config.js";

const payload = {
  device_id: process.env.TEST_DEVICE_ID ?? "entregador_001",
  lat: Number(process.env.TEST_LAT ?? -3.1190),
  lng: Number(process.env.TEST_LNG ?? -60.0217),
  speed: Number(process.env.TEST_SPEED ?? 0),
  heading: Number(process.env.TEST_HEADING ?? 120),
  battery: Number(process.env.TEST_BATTERY ?? 87),
  accuracy: Number(process.env.TEST_ACCURACY ?? 8),
  timestamp: process.env.TEST_TIMESTAMP ?? "2026-05-17T18:00:00-04:00"
};

async function main() {
  const kafka = new Kafka({
    clientId: `${config.kafkaClientId}-test-producer`,
    brokers: config.kafkaBrokers,
    ssl: config.kafkaSsl,
    sasl: buildSaslOptions()
  });

  const producer = kafka.producer();
  await producer.connect();
  await producer.send({
    topic: config.kafkaTopic,
    messages: [
      {
        key: payload.device_id,
        value: JSON.stringify(payload)
      }
    ]
  });
  await producer.disconnect();

  console.log(`Mensagem enviada para ${config.kafkaTopic} via ${config.kafkaBrokers.join(",")}`);
  console.log(JSON.stringify(payload, null, 2));
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

main().catch((error) => {
  console.error("Falha ao enviar mensagem Kafka", error);
  process.exit(1);
});
