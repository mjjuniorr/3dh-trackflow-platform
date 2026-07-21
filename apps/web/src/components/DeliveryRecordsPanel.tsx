import { Ban, ClipboardList, Plus, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cancelDeliveryRecord, createDeliveryRecord, listDeliveryRecords } from "../api";
import type { DeliveryPerson, DeliveryRecord, DeliveryRecordSummary } from "../types";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function DeliveryRecordsPanel({
  deliveryPeople,
  canManageDeliveries
}: {
  deliveryPeople: DeliveryPerson[];
  canManageDeliveries: boolean;
}) {
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [summary, setSummary] = useState<DeliveryRecordSummary>({ total: 0, by_delivery_person: [] });
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [deliveryPersonId, setDeliveryPersonId] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const activePeople = useMemo(() => deliveryPeople.filter((person) => person.is_active !== false), [deliveryPeople]);

  useEffect(() => {
    if (!deliveryPersonId && activePeople[0]) setDeliveryPersonId(activePeople[0].id);
  }, [activePeople, deliveryPersonId]);

  async function refresh() {
    const response = await listDeliveryRecords(todayKey());
    setRecords(response.records);
    setSummary(response.summary);
  }

  useEffect(() => {
    refresh().catch((error) => setMessage(error instanceof Error ? error.message : "Nao foi possivel carregar as entregas."));
  }, []);

  async function submit() {
    if (!invoiceNumber.trim() || !deliveryPersonId) return;
    setLoading(true);
    setMessage("");
    try {
      await createDeliveryRecord({
        invoice_number: invoiceNumber,
        delivery_person_id: deliveryPersonId,
        notes: notes.trim() || undefined
      });
      setInvoiceNumber("");
      setNotes("");
      setMessage("Entrega registrada.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel registrar a entrega.");
    } finally {
      setLoading(false);
    }
  }

  async function cancel(record: DeliveryRecord) {
    if (!window.confirm(`Cancelar lancamento da NF ${record.invoice_number}?`)) return;
    setLoading(true);
    setMessage("");
    try {
      await cancelDeliveryRecord(record.id);
      setMessage("Lancamento cancelado.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel cancelar o lancamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="brand-kicker">Entregas</p>
            <h2 className="text-base font-semibold">Notas fiscais do dia</h2>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-line px-2 py-1 text-xs font-semibold" onClick={refresh} disabled={loading}>
            <RefreshCcw size={14} />
            Atualizar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md border border-line p-3">
            <span className="text-xs text-muted">Total hoje</span>
            <strong className="block text-2xl leading-tight">{summary.total}</strong>
          </div>
          <div className="rounded-md border border-line p-3">
            <span className="text-xs text-muted">Motoboys</span>
            <strong className="block text-2xl leading-tight">{summary.by_delivery_person.length}</strong>
          </div>
        </div>
      </div>

      {canManageDeliveries ? (
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <ClipboardList size={16} />
            Registrar NF
          </div>
          <div className="space-y-2">
            <input className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Numero da NF" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} />
            <select className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" value={deliveryPersonId} onChange={(event) => setDeliveryPersonId(event.target.value)}>
              {activePeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
            <input className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Observacao opcional" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <button className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50" onClick={submit} disabled={loading || !invoiceNumber.trim() || !deliveryPersonId}>
              <Plus size={16} />
              Registrar entrega
            </button>
          </div>
          {message ? <p className="mt-2 text-sm text-muted">{message}</p> : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Ranking do dia</h3>
        <div className="space-y-2">
          {summary.by_delivery_person.length ? summary.by_delivery_person.map((item) => (
            <div key={item.delivery_person_id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{item.name}</span>
              <strong>{item.total}</strong>
            </div>
          )) : <p className="text-sm text-muted">Nenhuma entrega registrada hoje.</p>}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Ultimas NFs</h3>
        <div className="space-y-2">
          {records.length ? records.slice(0, 12).map((record) => (
            <div key={record.id} className={`rounded-md border border-line p-3 text-sm ${record.cancelled_at ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <strong className="block truncate">NF {record.invoice_number}</strong>
                  <span className="text-xs text-muted">{fmtTime(record.created_at)} - {record.delivery_person.name}</span>
                  <span className="block text-xs text-muted">Lancado por {record.created_by_user.name}</span>
                  {record.cancelled_at ? <span className="block text-xs font-semibold text-red-500">Cancelada</span> : null}
                </div>
                {canManageDeliveries && !record.cancelled_at ? (
                  <button className="rounded-md border border-line p-2 text-red-500" onClick={() => cancel(record)} disabled={loading} aria-label="Cancelar lancamento">
                    <Ban size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          )) : <p className="text-sm text-muted">Nenhuma NF lancada hoje.</p>}
        </div>
      </div>
    </div>
  );
}
