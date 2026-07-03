import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

export type AuthMode = "legacy" | "hybrid" | "oidc";

export type AuthConfig = {
  mode: AuthMode;
  issuer: string;
  clientId: string;
  scope: string;
  portalUrl: string;
};

let configPromise: Promise<AuthConfig> | null = null;
let manager: UserManager | null = null;
let oidcUser: User | null = null;

export function getAuthConfig() {
  configPromise ??= fetch("/api/auth/config").then(async (response) => {
    if (!response.ok) throw new Error("Nao foi possivel carregar a configuracao de acesso.");
    return response.json() as Promise<AuthConfig>;
  });
  return configPromise;
}

async function getAuthManager() {
  if (manager) return manager;
  const config = await getAuthConfig();
  if (config.mode === "legacy") {
    throw new Error("Login central nao esta habilitado.");
  }

  manager = new UserManager({
    authority: config.issuer,
    client_id: config.clientId,
    redirect_uri: window.location.origin,
    post_logout_redirect_uri: window.location.origin,
    response_type: "code",
    scope: config.scope,
    automaticSilentRenew: false,
    userStore: new WebStorageStateStore({ store: window.sessionStorage })
  });
  return manager;
}

export async function restoreAuthentication() {
  const config = await getAuthConfig();
  if (config.mode === "legacy") return null;

  const auth = await getAuthManager();
  if (window.location.search.includes("code=") || window.location.search.includes("error=")) {
    try {
      oidcUser = await auth.signinRedirectCallback();
      window.history.replaceState({}, document.title, "/dashboard");
    } catch (error) {
      if (error instanceof Error && error.message.includes("No matching state")) {
        oidcUser = await auth.getUser();
      } else {
        throw error;
      }
    }
  } else {
    oidcUser = await auth.getUser();
  }

  if (oidcUser?.expired) oidcUser = null;
  return oidcUser;
}

export async function loginWithPortal() {
  const auth = await getAuthManager();
  await auth.signinRedirect();
}

export async function logout() {
  localStorage.removeItem("tracking_token");
  if (oidcUser) {
    const auth = await getAuthManager();
    await auth.signoutRedirect();
    return;
  }
  window.location.href = "/login";
}

export function getAccessToken() {
  return oidcUser?.access_token || localStorage.getItem("tracking_token");
}

export function setLegacyToken(token: string) {
  localStorage.setItem("tracking_token", token);
}

export function clearAuthentication() {
  oidcUser = null;
  localStorage.removeItem("tracking_token");
}

function tokenPayload() {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const encoded = raw.padEnd(Math.ceil(raw.length / 4) * 4, "=");
    return JSON.parse(atob(encoded)) as {
      authType?: "legacy" | "oidc";
      role?: string;
      permissions?: string[];
      resource_access?: Record<string, { roles?: string[] }>;
    };
  } catch {
    return null;
  }
}

export function getAuthType() {
  return oidcUser ? "oidc" : tokenPayload()?.authType ?? "legacy";
}

export function getPermissions() {
  const payload = tokenPayload();
  if (!payload) return [];
  if (payload.permissions?.length) return payload.permissions;

  const oidcRoles = payload.resource_access?.["trackflow-web"]?.roles ?? [];
  if (oidcRoles.length) return oidcRoles;

  return payload.role === "admin" || payload.role === "platform_owner"
    ? ["trackflow:view", "trackflow:manage-delivery-people", "trackflow:create-public-links", "trackflow:revoke-public-links", "trackflow:manage-settings", "trackflow:admin"]
    : ["trackflow:view", "trackflow:create-public-links"];
}

export function hasPermission(permission: string) {
  return getPermissions().includes(permission);
}
