export type AuthUser = {
  id: string;
  sub?: string;
  name: string;
  email: string;
  role?: string;
  permissions: string[];
  authType: "legacy" | "oidc";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
