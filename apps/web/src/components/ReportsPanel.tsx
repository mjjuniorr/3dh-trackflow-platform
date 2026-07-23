import { BarChart3, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listDeliveryReport, type DeliveryReportFilters } from "../api";
import { localDateKey } from "../local-date-key";
import type { DeliveryPerson, DeliveryReportResponse } from "../types";

const initialReport: DeliveryReportResponse = {
  filters: { from: localDateKey(), to: localDateKey(), driverId: null, invoiceNumber: null, status: "all" },
  pagination: { page: 1, pageSize: 25, totalItems: 0, totalPages: 1 },
  summary: { total: 0, active: 0, cancelled: 0, by_delivery_person: [] },
  records: []
};

function fmtDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function statusText(cancelledAt?: string | null) {
  return cancelledAt ? "Cancelada" : "Ativa";
}

export function ReportsPanel({ deliveryPeople }: { deliveryPeople: DeliveryPerson[] }) {
  const today = useMemo(() => localDateKey(), []);
  const [filters, setFilters] = useState<DeliveryReportFilters>({ from: today, to: today, status: "all", page: 1, pageSize: 25 });
  const [draft, setDraft] = useState<DeliveryReportFilters>({ from: today, to: today, status: "all", pageSize: 25 });
  const [report, setReport] = useState<DeliveryReportResponse>(initialReport);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load(nextFilters = filters) {
    setLoading(true);
    setMessage("");
    try {
      const response = await listDeliveryReport(nextFilters);
      setReport(response);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel carregar o relatorio.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  function applyFilters() {
    const next = { ...draft, page: 1, pageSize: draft.pageSize ?? 25 };
    setFilters(next);
    void load(next);
  }

  function changePage(page: number) {
    const next = { ...filters, page };
    setFilters(next);
    void load(next);
  }

  return (
    <section className="min-h-[calc(100vh-73px)] overflow-auto bg-panel px-5 py-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="brand-kicker">Relatorios</p>
          <h2 className="text-xl font-semibold">Controle operacional diario</h2>
          <p className="text-sm text-muted">Consulta baseada nas NFs registradas manualmente no TrackFlow.</p>
        </div>
        <button className="app-chrome-button inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold" onClick={() => load()} disabled={loading}>
          <BarChart3 size={16} />
          Atualizar
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm md:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        <label className="text-xs font-semibold text-muted">
          De
          <input className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" type="date" value={draft.from ?? today} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} />
        </label>
        <label className="text-xs font-semibold text-muted">
          Ate
          <input className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" type="date" value={draft.to ?? draft.from ?? today} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} />
        </label>
        <label className="text-xs font-semibold text-muted">
          Entregador
          <select className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" value={draft.driverId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, driverId: event.target.value || undefined }))}>
            <option value="">Todos</option>
            {deliveryPeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          NF
          <input className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" placeholder="Numero" value={draft.invoiceNumber ?? ""} onChange={(event) => setDraft((current) => ({ ...current, invoiceNumber: event.target.value || undefined }))} />
        </label>
        <label className="text-xs font-semibold text-muted">
          Status
          <select className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" value={draft.status ?? "all"} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as DeliveryReportFilters["status"] }))}>
            <option value="all">Todos</option>
            <option value="active">Ativas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </label>
        <button className="btn-primary mt-auto inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50" onClick={applyFilters} disabled={loading}>
          <Search size={16} />
          Consultar
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm"><span className="text-xs text-muted">Total</span><strong className="block text-2xl">{report.summary.total}</strong></div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm"><span className="text-xs text-muted">Ativas</span><strong className="block text-2xl">{report.summary.active}</strong></div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm"><span className="text-xs text-muted">Canceladas</span><strong className="block text-2xl">{report.summary.cancelled}</strong></div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm"><span className="text-xs text-muted">Entregadores</span><strong className="block text-2xl">{report.summary.by_delivery_person.length}</strong></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
          <div className="overflow-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-line bg-panel text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">NF</th>
                  <th className="px-4 py-3">Entregador</th>
                  <th className="px-4 py-3">Lancamento</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Observacao</th>
                </tr>
              </thead>
              <tbody>
                {report.records.length ? report.records.map((record) => (
                  <tr key={record.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold">{record.invoice_number}</td>
                    <td className="px-4 py-3">{record.delivery_person.name}</td>
                    <td className="px-4 py-3">{fmtDateTime(record.created_at)}</td>
                    <td className="px-4 py-3">{record.created_by_user.name}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${record.cancelled_at ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{statusText(record.cancelled_at)}</span></td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-muted">{record.notes || "-"}</td>
                  </tr>
                )) : (
                  <tr><td className="px-4 py-6 text-center text-muted" colSpan={6}>Nenhuma entrega encontrada para os filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
            <span className="text-muted">{report.pagination.totalItems} registros - pagina {report.pagination.page} de {report.pagination.totalPages}</span>
            <div className="flex items-center gap-2">
              <button className="rounded-md border border-line p-2 disabled:opacity-40" disabled={loading || report.pagination.page <= 1} onClick={() => changePage(report.pagination.page - 1)} aria-label="Pagina anterior"><ChevronLeft size={16} /></button>
              <button className="rounded-md border border-line p-2 disabled:opacity-40" disabled={loading || report.pagination.page >= report.pagination.totalPages} onClick={() => changePage(report.pagination.page + 1)} aria-label="Proxima pagina"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Total por entregador</h3>
          <div className="space-y-3">
            {report.summary.by_delivery_person.length ? report.summary.by_delivery_person.map((item) => (
              <div key={item.delivery_person_id}>
                <div className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold">{item.name}</span><strong>{item.total}</strong></div>
                <p className="text-xs text-muted">{item.active} ativas - {item.cancelled} canceladas</p>
              </div>
            )) : <p className="text-sm text-muted">Sem dados para o periodo.</p>}
          </div>
        </aside>
      </div>
      {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
    </section>
  );
}
