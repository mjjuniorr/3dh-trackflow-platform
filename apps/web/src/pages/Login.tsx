import { LockKeyhole } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { login, setToken } from "../api";
import { getAuthConfig, loginWithPortal, type AuthConfig } from "../auth";

export function Login() {
  const legacyRequested = new URLSearchParams(window.location.search).get("legacy") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    getAuthConfig()
      .then((loadedConfig) => {
        setConfig(loadedConfig);
        if (loadedConfig.mode !== "legacy" && !legacyRequested) {
          return loginWithPortal();
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar autenticacao."));
  }, [legacyRequested]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await login(email, password);
      setToken(response.token);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  }

  if (!config && !error) {
    return <main className="flex min-h-screen items-center justify-center bg-panel text-ink">Carregando acesso...</main>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-panel p-4">
      <form onSubmit={submit} className="brand-card w-full max-w-sm rounded-lg border border-line bg-surface p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="brand-mark">3DH</div>
          <div>
            <p className="brand-kicker">TrackFlow</p>
            <h1 className="text-xl font-semibold">Painel interno</h1>
            <p className="text-sm text-muted">track.3dhmanaus.com.br</p>
          </div>
        </div>
        <div className="mb-5 flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
          <div className="rounded-md bg-accent p-1.5 text-white">
            <LockKeyhole size={22} />
          </div>
          Acesso restrito para equipe autorizada.
        </div>
        {config?.mode !== "legacy" && legacyRequested ? (
          <button
            className="btn-primary mb-4 w-full rounded-md px-4 py-2 font-semibold disabled:opacity-60"
            type="button"
            disabled={loading}
            onClick={() => loginWithPortal().catch((err) => setError(err instanceof Error ? err.message : "Nao foi possivel abrir o Portal."))}
          >
            Entrar com minha conta 3DH
          </button>
        ) : null}
        {config?.mode === "hybrid" && legacyRequested ? <div className="mb-4 border-t border-line pt-4 text-center text-xs text-muted">Acesso legado temporario</div> : null}
        {config?.mode !== "oidc" && (config?.mode === "legacy" || legacyRequested) ? (
          <>
            <label className="mb-4 block text-sm font-medium">
              Email
              <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </label>
            <label className="mb-4 block text-sm font-medium">
              Senha
              <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
            </label>
          </>
        ) : null}
        {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {config?.mode !== "oidc" && (config?.mode === "legacy" || legacyRequested) ? (
          <button className="btn-primary w-full rounded-md px-4 py-2 font-semibold disabled:opacity-60" disabled={loading}>
            {loading ? "Entrando..." : "Entrar com acesso legado"}
          </button>
        ) : null}
      </form>
    </main>
  );
}
