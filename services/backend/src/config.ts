import "dotenv/config";

const nodeEnv = process.env.NODE_ENV ?? "development";

function required(name: string, fallback: string): string {
  const value = process.env[name] ?? fallback;
  if (nodeEnv === "production" && (!value || value.startsWith("troque_") || value === "change-me")) {
    throw new Error(`Variavel obrigatoria invalida em producao: ${name}`);
  }
  return value;
}

export const config = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "https://track.3dhmanaus.shop",
  jwtSecret: required("JWT_SECRET", "change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  corsOrigin: process.env.CORS_ORIGIN ?? "https://track.3dhmanaus.shop",
  redisUrl: process.env.REDIS_URL ?? "redis://redis:6379",
  kafkaEnabled: process.env.KAFKA_ENABLED !== "false",
  kafkaBrokers: (process.env.KAFKA_BROKER ?? process.env.KAFKA_BROKERS ?? "kafka:9092")
    .split(",")
    .map((broker) => broker.trim()),
  kafkaTopic: process.env.KAFKA_TOPIC ?? "rastreamento",
  kafkaClientId: process.env.KAFKA_CLIENT_ID ?? "trackflow-backend",
  kafkaGroupId: process.env.KAFKA_GROUP_ID ?? "trackflow-consumer-group",
  kafkaSsl: process.env.KAFKA_SSL === "true",
  kafkaSaslMechanism: process.env.KAFKA_SASL_MECHANISM,
  kafkaSaslUsername: process.env.KAFKA_SASL_USERNAME,
  kafkaSaslPassword: process.env.KAFKA_SASL_PASSWORD,
  mobileRegistrationSecret: process.env.MOBILE_REGISTRATION_SECRET
};
