import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const names = ["Entregador 1", "Entregador 2", "Entregador 3", "Entregador 4", "Entregador 5"];

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@3dhmanaus.com.br";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Administrador",
      email,
      password_hash: await bcrypt.hash(password, 12),
      role: "admin"
    }
  });

  for (let index = 0; index < names.length; index += 1) {
    const deviceId = `entregador_${String(index + 1).padStart(3, "0")}`;
    await prisma.deliveryPerson.upsert({
      where: { device_id: deviceId },
      update: { name: names[index] },
      create: {
        name: names[index],
        device_id: deviceId,
        phone: `+55929999999${index}`,
        status: "offline"
      }
    });
  }
}

main().finally(async () => prisma.$disconnect());
