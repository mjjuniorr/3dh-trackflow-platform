import { LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { login, setToken } from "../api";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-panel p-4">
      <form onSubmit={submit} className="brand-card w-full max-w-sm rounded-lg border border-line bg-surface p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="brand-mark">3DH</div>
          <div>
            <p className="brand-kicker">TrackFlow</p>
            <h1 className="text-xl font-semibold">Painel interno</h1>
            <p className="text-sm text-muted">track.3dhmanaus.shop</p>
          </div>
        </div>
        <div className="mb-5 flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
          <div className="rounded-md bg-accent p-1.5 text-white">
            <LockKeyhole size={22} />
          </div>
          Acesso restrito para equipe autorizada.
        </div>
        <label className="mb-4 block text-sm font-medium">
          Email
          <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label className="mb-4 block text-sm font-medium">
          Senha
          <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <button className="btn-primary w-full rounded-md px-4 py-2 font-semibold disabled:opacity-60" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
