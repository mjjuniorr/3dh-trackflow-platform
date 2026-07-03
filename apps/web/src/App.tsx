import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { PublicTracking } from "./pages/PublicTracking";
import { getToken } from "./api";
import { hasPermission, logout, restoreAuthentication } from "./auth";
import { useEffect, useState } from "react";

export function App() {
  const path = window.location.pathname;
  const publicTracking = path.startsWith("/t/");
  const [authReady, setAuthReady] = useState(publicTracking);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem("tracking_theme") === "dark" ? "dark" : "classic";
    if (publicTracking) return;
    restoreAuthentication()
      .catch((error) => setAuthError(error instanceof Error ? error.message : "Falha ao restaurar sessao."))
      .finally(() => setAuthReady(true));
  }, [publicTracking]);

  if (publicTracking) {
    return <PublicTracking publicToken={path.split("/").filter(Boolean)[1]} />;
  }

  if (!authReady) {
    return <main className="flex min-h-screen items-center justify-center bg-panel text-ink">Carregando acesso...</main>;
  }

  if (authError) {
    return <main className="flex min-h-screen items-center justify-center bg-panel p-4 text-center text-red-600">{authError}</main>;
  }

  if (getToken() && !hasPermission("trackflow:view")) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-panel p-4 text-center text-ink">
        <section>
          <h1 className="text-xl font-semibold">Acesso ao TrackFlow nao liberado</h1>
          <p className="mt-2 text-muted">Solicite a permissao trackflow:view no Portal 3DH.</p>
          <button className="btn-primary mt-4 rounded-md px-4 py-2 font-semibold" onClick={() => logout().catch(console.error)}>
            Sair
          </button>
        </section>
      </main>
    );
  }

  if (path === "/login") {
    if (getToken()) {
      window.history.replaceState(null, "", "/dashboard");
      return <Dashboard />;
    }
    return <Login />;
  }

  if (path === "/dashboard" && getToken()) {
    return <Dashboard />;
  }

  window.history.replaceState(null, "", getToken() ? "/dashboard" : "/login");
  return getToken() ? <Dashboard /> : <Login />;
}
