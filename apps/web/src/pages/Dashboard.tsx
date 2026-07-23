import { BarChart3, LogOut, Map, RefreshCcw, Send, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clearToken, getToken, listDeliveryPeople } from "../api";
import { getAuthType, hasPermission, logout } from "../auth";
import { DeliveryRecordsPanel } from "../components/DeliveryRecordsPanel";
import { GenerateLinkModal } from "../components/GenerateLinkModal";
import { ReportsPanel } from "../components/ReportsPanel";
import { SettingsModal } from "../components/SettingsModal";
import { TrackingMap } from "../components/TrackingMap";
import { createSocket } from "../socket";
import type { DeliveryPerson } from "../types";

function fmt(date?: string) {
  return date ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(date)) : "-";
}

function statusLabel(status: string) {
  if (status === "sem sinal") return "sem sinal";
  return status;
}

function statusClass(status: string) {
  if (status === "online") return "status-online";
  if (status === "sem sinal") return "status-signal";
  return "status-offline";
}

function batteryClass(value?: number | null) {
  if (value == null) return "battery-low";
  if (value >= 65) return "battery-good";
  if (value >= 30) return "battery-mid";
  return "battery-low";
}

function formatSpeed(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "0";
  return Math.max(0, Math.min(220, value)).toFixed(1);
}

export function Dashboard() {
  const [people, setPeople] = useState<DeliveryPerson[]>([]);
  const [selected, setSelected] = useState<DeliveryPerson | null>(null);
  const [modalPerson, setModalPerson] = useState<DeliveryPerson | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<"classic" | "dark">(() => localStorage.getItem("tracking_theme") === "dark" ? "dark" : "classic");
  const [view, setView] = useState<"tracking" | "reports">(() => window.location.pathname === "/dashboard/reports" && hasPermission("trackflow:view-reports") ? "reports" : "tracking");
  const selectedPerson = selected ?? people[0] ?? null;
  const canManageFleet = hasPermission("trackflow:manage-delivery-people");
  const canCreatePublicLinks = hasPermission("trackflow:create-public-links");
  const canManageSettings = hasPermission("trackflow:manage-settings");
  const canManageDeliveries = hasPermission("trackflow:manage-deliveries");
  const canViewReports = hasPermission("trackflow:view-reports");

  async function refresh() {
    const response = await listDeliveryPeople();
    setPeople(response.delivery_people);
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tracking_theme", theme);
  }, [theme]);

  useEffect(() => {
    refresh().catch(console.error);
    const socket = createSocket();
    socket.emit("dashboard:join", { token: getToken() });
    socket.on("location:update", (payload: { delivery_people: DeliveryPerson[] }) => setPeople(payload.delivery_people));
    socket.on("auth:error", () => {
      clearToken();
      window.location.href = "/login";
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const counts = useMemo(() => ({
    online: people.filter((person) => person.computed_status === "online").length,
    offline: people.filter((person) => person.computed_status === "offline").length,
    signal: people.filter((person) => person.computed_status === "sem sinal").length
  }), [people]);
  useEffect(() => {
    if (view === "reports" && !canViewReports) switchView("tracking");
  }, [canViewReports, view]);

  function switchView(nextView: "tracking" | "reports") {
    if (nextView === "reports" && !canViewReports) return;
    setView(nextView);
    window.history.replaceState(null, "", nextView === "reports" ? "/dashboard/reports" : "/dashboard");
  }
  return (
    <main className="min-h-screen bg-panel text-ink">
      <header className="app-chrome flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <a className="brand-logo-link" href="https://portal.3dhmanaus.com.br" title="Voltar ao Portal 3DH" aria-label="Voltar ao Portal 3DH"><img className="brand-logo-image" src="/assets/logo-3dh-manaus.png" alt="3DH Manaus" /></a>
          <div>
            <p className="brand-kicker">TrackFlow</p>
            <h1 className="text-xl font-semibold">Rastreamento em tempo real</h1>
            <p className="text-sm text-muted">Painel interno de entregadores ativos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="app-chrome-button inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold" onClick={refresh}>
            <RefreshCcw size={16} />
            Atualizar
          </button>
          {canViewReports ? (
            <button className="app-chrome-button inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold" onClick={() => switchView(view === "reports" ? "tracking" : "reports")}>
              {view === "reports" ? <Map size={16} /> : <BarChart3 size={16} />}
              {view === "reports" ? "Mapa" : "Relatorios"}
            </button>
          ) : null}
          {canManageFleet || canManageSettings ? (
            <button className="app-chrome-button inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold" onClick={() => setSettingsOpen(true)} aria-label="Configuracoes">
              <Settings size={16} />
            </button>
          ) : null}
          <button className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" onClick={() => logout().catch(console.error)}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      <section className={`grid min-h-[calc(100vh-73px)] grid-cols-1 ${view === "reports" ? "xl:grid-cols-[360px_minmax(0,1fr)]" : "xl:grid-cols-[360px_minmax(520px,1fr)_340px]"}`}>
        <aside className="app-sidebar border-r border-line">
          <div className="app-sidebar-header border-b px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="brand-kicker">Fleet control</p>
                <h2 className="text-base font-semibold">Entregadores</h2>
              </div>
              <span className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold">{people.length} ativos</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="fleet-stat"><strong>{counts.online}</strong><span>online</span></div>
              <div className="fleet-stat"><strong>{counts.signal}</strong><span>sem sinal</span></div>
              <div className="fleet-stat"><strong>{counts.offline}</strong><span>offline</span></div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-150px)] overflow-auto">
            {people.map((person) => (
              <button
                key={person.id}
                className={`fleet-card w-full border-b border-line px-4 py-4 text-left ${selectedPerson?.id === person.id ? "selected" : ""}`}
                onClick={() => setSelected(person)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{person.name}</h2>
                    <p className="text-xs text-muted">{person.device_id}</p>
                  </div>
                  <span className={`status-pill ${statusClass(person.computed_status)}`}>
                    <span />
                    {statusLabel(person.computed_status)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted">
                      <span>Bateria</span>
                      <strong className="text-ink">{person.last_location?.battery ?? "-"}%</strong>
                    </div>
                    <div className="battery-track">
                      <div
                        className={`battery-fill ${batteryClass(person.last_location?.battery)}`}
                        style={{ width: `${Math.max(0, Math.min(100, person.last_location?.battery ?? 0))}%` }}
                      />
                    </div>
                  </div>
                  <div className="speed-box">
                    <strong>{formatSpeed(person.last_location?.speed)}</strong>
                    <span>km/h</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted">
                  <p>Ultima: {fmt(person.last_location?.timestamp)}</p>
                  <p>
                    Local: {person.last_location ? `${person.last_location.lat.toFixed(5)}, ${person.last_location.lng.toFixed(5)}` : "-"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {view === "reports" ? (
          <ReportsPanel deliveryPeople={people} />
        ) : (
          <>
            <section className="grid min-h-[520px] grid-rows-[1fr_auto]">
              <TrackingMap deliveryPeople={people} />
              <div className="app-footer flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
                <div>
                  <p className="text-sm font-semibold">{selectedPerson?.name ?? "Selecione um entregador"}</p>
                  <p className="text-xs text-muted">{selectedPerson?.device_id ?? "Nenhum device selecionado"}</p>
                </div>
                {canCreatePublicLinks ? (
                  <button
                    className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    disabled={!selectedPerson}
                    onClick={() => selectedPerson && setModalPerson(selectedPerson)}
                  >
                    <Send size={16} />
                    Gerar link de rastreio
                  </button>
                ) : null}
              </div>
            </section>

            <aside className="border-l border-line bg-panel">
              <DeliveryRecordsPanel deliveryPeople={people} canManageDeliveries={canManageDeliveries} canViewReports={canViewReports} onOpenReports={() => switchView("reports")} />
            </aside>
          </>
        )}
      </section>

      {modalPerson ? <GenerateLinkModal person={modalPerson} onClose={() => setModalPerson(null)} /> : null}
      {settingsOpen ? (
        <SettingsModal
          theme={theme}
          onThemeChange={setTheme}
          onClose={() => setSettingsOpen(false)}
          deliveryPeople={people}
          onDeliveryPeopleChange={refresh}
          canManageFleet={canManageFleet}
          canAdmin={canManageSettings}
          legacyAdminPasswordRequired={getAuthType() === "legacy"}
        />
      ) : null}
    </main>
  );
}





