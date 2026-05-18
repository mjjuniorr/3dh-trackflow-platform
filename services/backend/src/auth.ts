import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import type { AuthUser } from "./types.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export function signInternalToken(user: AuthUser) {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign(user, config.jwtSecret, options);
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Credenciais invalidas." });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    return res.status(401).json({ message: "Email ou senha incorretos." });
  }

  const authUser = { id: user.id, email: user.email, role: user.role };
  return res.json({
    token: signInternalToken(authUser),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ message: "Autenticacao obrigatoria." });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret) as unknown as AuthUser;
    return next();
  } catch {
    return res.status(401).json({ message: "Token invalido ou expirado." });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticacao obrigatoria." });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Acesso restrito ao administrador." });
  }
  return next();
}

export async function verifyAdminPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") return false;
  return bcrypt.compare(password, user.password_hash);
}
