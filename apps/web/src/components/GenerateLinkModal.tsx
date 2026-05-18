import { Copy, ExternalLink, Link2, X } from "lucide-react";
import { useState } from "react";
import { createTrackingSession } from "../api";
import type { DeliveryPerson } from "../types";

const presets = [
  { label: "15 minutos", value: 15 },
  { label: "30 minutos", value: 30 },
  { label: "1 hora", value: 60 },
  { label: "2 horas", value: 120 }
];

export function GenerateLinkModal({ person, onClose }: { person: DeliveryPerson; onClose: () => void }) {
  const [minutes, setMinutes] = useState(30);
  const [custom, setCustom] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [copyError, setCopyError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const value = custom ? Number(custom) : minutes;
      const response = await createTrackingSession(person.id, value, `Rastreio ${person.name}`);
      const path = response.public_path ?? (response.public_url ? new URL(response.public_url).pathname : "");
      if (!path) {
        throw new Error("O backend nao retornou o caminho publico do rastreio.");
      }
      setPublicUrl(`${window.location.origin}${path}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel gerar o link.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    setCopyError("");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        const input = document.createElement("textarea");
        input.value = publicUrl;
        input.setAttribute("readonly", "true");
        input.style.position = "fixed";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
    } catch {
      setCopyError("Nao foi possivel copiar automaticamente. Selecione o link e copie manualmente.");
    }
  }

  function openLink() {
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-surface text-ink shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Gerar link de rastreio</h2>
            <p className="text-sm text-muted">{person.name} · {person.device_id}</p>
          </div>
          <button className="rounded-md p-2 hover:bg-panel" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.value}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${minutes === preset.value && !custom ? "border-accent bg-accent text-white" : "border-line bg-surface"}`}
                onClick={() => {
                  setMinutes(preset.value);
                  setCustom("");
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium">
            Personalizado em minutos
            <input
              className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
              min={1}
              max={1440}
              type="number"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="Ex.: 45"
            />
          </label>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          {publicUrl ? (
            <div className="rounded-md border border-line bg-panel p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Link2 size={16} />
                Link pronto
              </div>
              <div className="break-all rounded bg-surface px-3 py-2 text-sm">{publicUrl}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" onClick={copy}>
                  <Copy size={16} />
                  {copied ? "Copiado" : "Copiar link"}
                </button>
                <button className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold" onClick={openLink}>
                  <ExternalLink size={16} />
                  Abrir link
                </button>
              </div>
              {copyError ? <p className="mt-2 text-sm text-red-700">{copyError}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={onClose}>Fechar</button>
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={submit} disabled={loading}>
            {loading ? "Gerando..." : "Gerar link"}
          </button>
        </div>
      </div>
    </div>
  );
}
