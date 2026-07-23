import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import type { AuthUser } from "./types.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const allLegacyAdminPermissions = [
  "trackflow:view",
  "trackflow:manage-delivery-people",
  "trackflow:manage-deliveries",
  "trackflow:view-reports",
  "trackflow:create-public-links",
  "trackflow:revoke-public-links",
  "trackflow:manage-settings",
  "trackflow:admin"
];
const legacyAdminRoles = new Set(["admin", "platform_owner"]);

let oidcJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function legacyPermissions(role: string) {
  return legacyAdminRoles.has(role)
    ? allLegacyAdminPermissions
    : ["trackflow:view", "trackflow:create-public-links"];
}

function permissionsFrom(payload: JWTPayload) {
  const permissions = new Set<string>();
  const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
  const resourceAccess = payload.resource_access as Record<string, { roles?: string[] }> | undefined;

  realmAccess?.roles?.forEach((role) => permissions.add(role));
  resourceAccess?.[config.oidcClientId]?.roles?.forEach((role) => permissions.add(role));
  return [...permissions];
}

function getOidcJwks() {
  if (!config.oidcIssuer) {
    throw new Error("OIDC_ISSUER nao configurado.");
  }
  if (!oidcJwks) {
    const url = config.oidcJwksUrl || `${config.oidcIssuer}/protocol/openid-connect/certs`;
    oidcJwks = createRemoteJWKSet(new URL(url));
  }
  return oidcJwks;
}

async function ensureOidcUser(payload: JWTPayload) {
  const sub = String(payload.sub || "");
  const email = String(payload.email || "").trim().toLowerCase();
  const name = String(payload.name || payload.preferred_username || email || "Usuario");
  if (!sub || !email) {
    throw new Error("Token OIDC sem sub ou email.");
  }

  const bySub = await prisma.user.findUnique({ where: { oidc_sub: sub } });
  if (bySub) {
    return prisma.user.update({
      where: { id: bySub.id },
      data: { name, email }
    });
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { oidc_sub: sub, name }
    });
  }

  try {
    return await prisma.user.create({
      data: {
        oidc_sub: sub,
        name,
        email,
        password_hash: null,
        role: "employee"
      }
    });
  } catch (error) {
    const prismaError = error as { code?: string; meta?: { constraint?: string[] } };
    const companyConstraint = prismaError.meta?.constraint?.includes("company_id");
    if (prismaError.code !== "P2011" || !companyConstraint) throw error;

    type CompanyRow = { company_id: string };
    const configuredCompany = config.oidcDefaultCompanyId;
    const companies = configuredCompany
      ? [{ company_id: configuredCompany }]
      : await prisma.$queryRaw<CompanyRow[]>`
          SELECT "company_id"
          FROM "users"
          WHERE "company_id" IS NOT NULL
          ORDER BY "created_at" ASC
          LIMIT 1
        `;
    const companyId = companies[0]?.company_id;
    if (!companyId) {
      throw new Error("OIDC_DEFAULT_COMPANY_ID e obrigatorio para o schema legado com company_id.");
    }

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "users" ("id", "name", "email", "password_hash", "role", "created_at", "oidc_sub", "company_id")
      VALUES (${id}, ${name}, ${email}, NULL, 'employee', CURRENT_TIMESTAMP, ${sub}, ${companyId})
    `;
    return prisma.user.findUniqueOrThrow({ where: { id } });
  }
}

async function authenticateOidcToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, getOidcJwks(), {
    issuer: config.oidcIssuer,
    audience: config.oidcAudience
  });
  const user = await ensureOidcUser(payload);
  return {
    id: user.id,
    sub: String(payload.sub),
    name: user.name,
    email: user.email,
    permissions: permissionsFrom(payload),
    authType: "oidc"
  };
}

async function authenticateLegacyToken(token: string): Promise<AuthUser> {
  const payload = jwt.verify(token, config.jwtSecret) as {
    id?: string;
    email?: string;
    role?: string;
  };
  if (!payload.id) throw new Error("Token legado sem usuario.");

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) throw new Error("Usuario legado nao encontrado.");

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: legacyPermissions(user.role),
    authType: "legacy"
  };
}

export async function authenticateToken(token: string): Promise<AuthUser> {
  const errors: unknown[] = [];

  if (config.authMode !== "legacy") {
    try {
      return await authenticateOidcToken(token);
    } catch (error) {
      errors.push(error);
    }
  }

  if (config.authMode !== "oidc") {
    try {
      return await authenticateLegacyToken(token);
    } catch (error) {
      errors.push(error);
    }
  }

  throw new AggregateError(errors, "Token rejeitado pelos modos de autenticacao configurados.");
}

export function signInternalToken(user: AuthUser) {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign(user, config.jwtSecret, options);
}

export function authConfig(_req: Request, res: Response) {
  return res.json({
    mode: config.authMode,
    issuer: config.oidcIssuer,
    clientId: config.oidcClientId,
    scope: "openid profile email",
    portalUrl: config.portalUrl
  });
}

export async function login(req: Request, res: Response) {
  if (config.authMode === "oidc") {
    return res.status(404).json({ message: "Login local desativado." });
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Credenciais invalidas." });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.password_hash || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    return res.status(401).json({ message: "Email ou senha incorretos." });
  }

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: legacyPermissions(user.role),
    authType: "legacy"
  };
  return res.json({
    token: signInternalToken(authUser),
    user: authUser
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ message: "Autenticacao obrigatoria." });
  }

  try {
    req.user = await authenticateToken(token);
    return next();
  } catch (error) {
    console.warn("Falha ao autenticar token:", error);
    return res.status(401).json({ message: "Token invalido ou expirado." });
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Autenticacao obrigatoria." });
    }
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ message: "Seu usuario nao possui permissao para esta acao." });
    }
    return next();
  };
}

export const requireAdmin = requirePermission("trackflow:admin");

export function currentUser(req: Request, res: Response) {
  return res.json({ user: req.user });
}

export async function verifyAdminPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password_hash || !legacyAdminRoles.has(user.role)) return false;
  return bcrypt.compare(password, user.password_hash);
}


