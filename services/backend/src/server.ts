import http from "node:http";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { Server } from "socket.io";
import { config } from "./config.js";
import { createRouter } from "./routes.js";
import { startKafkaConsumerWithRetry } from "./kafka.js";
import { registerSocketHandlers } from "./realtime.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    credentials: true
  }
});

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", createRouter(io));

registerSocketHandlers(io);

server.listen(config.port, () => {
  console.log(`Tracking API ouvindo na porta ${config.port}`);
});

if (config.kafkaEnabled) {
  startKafkaConsumerWithRetry(io);
} else {
  console.log("Consumidor Kafka desativado por KAFKA_ENABLED=false");
}
