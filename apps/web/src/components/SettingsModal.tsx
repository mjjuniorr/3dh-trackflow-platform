import { CheckCircle2, Plus, Save, ShieldCheck, TestTube2, Trash2, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createDeliveryPerson,
  deactivateDeliveryPerson,
  getKafkaSettings,
  getServiceDomainSettings,
  saveKafkaSettings,
  saveServiceDomainSettings,
  testKafkaSettings,
  updateDeliveryPerson,
  type KafkaSettings,
  type ServiceDomainSettings
} from "../api";
import type { DeliveryPerson, VehicleType } from "../types";

const emptySettings: KafkaSettings = {
  broker: "kafka:9092",
  topic: "rastreamento",
  clientId: "trackflow-backend",
  groupId: "trackflow-consumer-group",
  ssl: false,
  saslMechanism: "",
  saslUsername: "",
  saslPassword: ""
};

const emptyServiceDomains: ServiceDomainSettings = {
  publicBaseUrl: "https://rastreio.3dhmanaus.com.br",
  mobileApiBaseUrl: "https://rastreio.3dhmanaus.com.br",
  kafkaUiUrl: "https://kafka.3dhmanaus.com.br",
  portalUrl: "https://portal.3dhmanaus.com.br",
  authUrl: "https://auth.3dhmanaus.com.br/realms/3dh"
};

const productionBroker = "kafka:9092";
const vehicleOptions: Array<{ value: VehicleType; label: string }> = [
  { value: "motorcycle", label: "Moto" },
  { value: "car", label: "Carro" },
  { value: "boat", label: "Barco" },
  { value: "airplane", label: "Aviao" },
  { value: "bus", label: "Onibus" }
];

type ConnectionState = "idle" | "ok" | "fail";

export function SettingsModal({
  theme,
  onThemeChange,
  onClose,
  deliveryPeople,
  onDeliveryPeopleChange,
  canManageFleet,
  canAdmin,
  legacyAdminPasswordRequired
}: {
  theme: "classic" | "dark";
  onThemeChange: (theme: "classic" | "dark") => void;
  onClose: () => void;
  deliveryPeople: DeliveryPerson[];
  onDeliveryPeopleChange: () => Promise<void>;
  canManageFleet: boolean;
  canAdmin: boolean;
  legacyAdminPasswordRequired: boolean;
}) {
  const [settings, setSettings] = useState<KafkaSettings>(emptySettings);
  const [serviceDomains, setServiceDomains] = useState<ServiceDomainSettings>(emptyServiceDomains);
  const [adminPassword, setAdminPassword] = useState("");
  const [status, setStatus] = useState<ConnectionState>("idle");
  const [message, setMessage] = useState("");
  const [domainsMessage, setDomainsMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState<{ id: string; name: string; device_id: string; phone: string; vehicle_type: VehicleType }>({ id: "", name: "", device_id: "", phone: "", vehicle_type: "motorcycle" });
  const [deliveryMessage, setDeliveryMessage] = useState("");

  useEffect(() => {
    if (!canAdmin) return;
    getKafkaSettings()
      .then((response) => setSettings({ ...emptySettings, ...response.settings, saslPassword: "" }))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Nao foi possivel carregar configuracoes."));
    getServiceDomainSettings()
      .then((response) => setServiceDomains({ ...emptyServiceDomains, ...response.settings }))
      .catch((error) => setDomainsMessage(error instanceof Error ? error.message : "Nao foi possivel carregar dominios."));
  }, [canAdmin]);

  function update<K extends keyof KafkaSettings>(key: K, value: KafkaSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setStatus("idle");
  }

  function updateServiceDomain<K extends keyof ServiceDomainSettings>(key: K, value: ServiceDomainSettings[K]) {
    setServiceDomains((current) => ({ ...current, [key]: value }));
    setDomainsMessage("");
  }

  function applyProductionPreset() {
    setSettings((current) => ({
      ...current,
      broker: productionBroker,
      topic: "rastreamento",
      clientId: "trackflow-backend",
      groupId: "trackflow-consumer-group",
      ssl: false,
      saslMechanism: "",
      saslUsername: "",
      saslPassword: ""
    }));
    setStatus("idle");
    setMessage("Preset de producao aplicado. Salve para reiniciar o consumidor.");
  }

  async function testConnection() {
    setLoading(true);
    setMessage("");
    try {
      const result = await testKafkaSettings(settings, adminPassword);
      setStatus(result.ok ? "ok" : "fail");
      setMessage(result.ok ? (result.topic_exists ? "Conexao estabelecida e topico encontrado." : "Conexao estabelecida, mas o topico nao foi encontrado.") : result.message ?? "Falha na conexao.");
    } catch (error) {
      setStatus("fail");
      setMessage(error instanceof Error ? error.message : "Falha na conexao.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setLoading(true);
    setMessage("");
    try {
      const response = await saveKafkaSettings(settings, adminPassword);
      setSettings({ ...emptySettings, ...response.settings, saslPassword: "" });
      setStatus("ok");
      setMessage(response.message);
    } catch (error) {
      setStatus("fail");
      setMessage(error instanceof Error ? error.message : "Nao foi possivel salvar.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDomains() {
    setLoading(true);
    setDomainsMessage("");
    try {
      const response = await saveServiceDomainSettings(serviceDomains, adminPassword);
      setServiceDomains({ ...emptyServiceDomains, ...response.settings });
      setDomainsMessage(response.message);
    } catch (error) {
      setDomainsMessage(error instanceof Error ? error.message : "Nao foi possivel salvar os dominios.");
    } finally {
      setLoading(false);
    }
  }

  function editDeliveryPerson(person: DeliveryPerson) {
    setDeliveryForm({
      id: person.id,
      name: person.name,
      device_id: person.device_id,
      phone: person.phone ?? "",
      vehicle_type: person.vehicle_type ?? "motorcycle"
    });
    setDeliveryMessage("");
  }

  function clearDeliveryForm() {
    setDeliveryForm({ id: "", name: "", device_id: "", phone: "", vehicle_type: "motorcycle" });
  }

  async function saveDeliveryPerson() {
    setLoading(true);
    setDeliveryMessage("");
    try {
      const payload = {
        name: deliveryForm.name.trim(),
        device_id: deliveryForm.device_id.trim(),
        vehicle_type: deliveryForm.vehicle_type,
        phone: deliveryForm.phone.trim() || undefined
      };
      if (deliveryForm.id) {
        await updateDeliveryPerson(deliveryForm.id, payload);
        setDeliveryMessage("Entregador atualizado.");
      } else {
        await createDeliveryPerson(payload);
        setDeliveryMessage("Entregador cadastrado.");
      }
      clearDeliveryForm();
      await onDeliveryPeopleChange();
    } catch (error) {
      setDeliveryMessage(error instanceof Error ? error.message : "Nao foi possivel salvar o entregador.");
    } finally {
      setLoading(false);
    }
  }

  async function removeDeliveryPerson(person: DeliveryPerson) {
    if (!window.confirm(`Desativar ${person.name}?`)) return;
    setLoading(true);
    setDeliveryMessage("");
    try {
      await deactivateDeliveryPerson(person.id);
      if (deliveryForm.id === person.id) clearDeliveryForm();
      setDeliveryMessage("Entregador desativado.");
      await onDeliveryPeopleChange();
    } catch (error) {
      setDeliveryMessage(error instanceof Error ? error.message : "Nao foi possivel desativar o entregador.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-lg border border-line bg-surface text-ink shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Configuracoes administrativas</h2>
            <p className="text-sm text-muted">Aparencia, frota e integracoes tecnicas conforme suas permissoes</p>
          </div>
          <button className="rounded-md p-2 hover:bg-panel" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <section>
            <h3 className="mb-3 text-sm font-semibold">Aparencia</h3>
            <div className="inline-flex rounded-md border border-line bg-panel p-1">
              <button className={`rounded px-3 py-2 text-sm font-semibold ${theme === "classic" ? "bg-surface shadow-sm" : ""}`} onClick={() => onThemeChange("classic")}>
                Classica
              </button>
              <button className={`rounded px-3 py-2 text-sm font-semibold ${theme === "dark" ? "bg-surface shadow-sm" : ""}`} onClick={() => onThemeChange("dark")}>
                Dark
              </button>
            </div>
          </section>

          {canManageFleet ? <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Entregadores</h3>
                <p className="text-xs text-muted">Cadastro dinamico para Android e operacao web</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold" onClick={clearDeliveryForm}>
                <Plus size={16} />
                Novo
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_150px_auto]">
              <input className="rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Nome" value={deliveryForm.name} onChange={(event) => setDeliveryForm((current) => ({ ...current, name: event.target.value }))} />
              <input className="rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" placeholder="device_id" value={deliveryForm.device_id} onChange={(event) => setDeliveryForm((current) => ({ ...current, device_id: event.target.value }))} />
              <input className="rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Telefone" value={deliveryForm.phone} onChange={(event) => setDeliveryForm((current) => ({ ...current, phone: event.target.value }))} />
              <select className="rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" value={deliveryForm.vehicle_type} onChange={(event) => setDeliveryForm((current) => ({ ...current, vehicle_type: event.target.value as VehicleType }))}>
                {vehicleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <button className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={saveDeliveryPerson} disabled={loading || !deliveryForm.name.trim() || !deliveryForm.device_id.trim()}>
                <Save size={16} />
                {deliveryForm.id ? "Atualizar" : "Criar"}
              </button>
            </div>

            <div className="mt-3 max-h-52 overflow-auto rounded-md border border-line">
              {deliveryPeople.length ? deliveryPeople.map((person) => (
                <div key={person.id} className="grid gap-3 border-b border-line px-3 py-3 text-sm last:border-b-0 sm:grid-cols-[1fr_1fr_90px_auto] sm:items-center">
                  <button className="min-w-0 text-left" onClick={() => editDeliveryPerson(person)}>
                    <strong className="block truncate">{person.name}</strong>
                    <span className="text-xs text-muted">{person.phone || "Sem telefone"}</span>
                  </button>
                  <button className="truncate text-left text-xs text-muted" onClick={() => editDeliveryPerson(person)}>
                    {person.device_id}
                  </button>
                  <button className="text-left text-xs text-muted" onClick={() => editDeliveryPerson(person)}>
                    {vehicleOptions.find((option) => option.value === person.vehicle_type)?.label ?? "Moto"}
                  </button>
                  <button className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-semibold text-red-500" onClick={() => removeDeliveryPerson(person)} disabled={loading}>
                    <Trash2 size={14} />
                    Desativar
                  </button>
                </div>
              )) : (
                <div className="px-3 py-4 text-sm text-muted">Nenhum entregador cadastrado.</div>
              )}
            </div>
            {deliveryMessage ? <p className="mt-2 text-sm text-muted">{deliveryMessage}</p> : null}
          </section> : null}

          {canAdmin ? <>
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold">Dominios dos servicos</h3>
              <p className="text-xs text-muted">Enderecos operacionais usados pela web, links publicos, app mobile e consoles tecnicos</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                TrackFlow publico
                <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={serviceDomains.publicBaseUrl} onChange={(event) => updateServiceDomain("publicBaseUrl", event.target.value)} />
              </label>
              <label className="text-sm font-medium">
                API mobile
                <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={serviceDomains.mobileApiBaseUrl} onChange={(event) => updateServiceDomain("mobileApiBaseUrl", event.target.value)} />
              </label>
              <label className="text-sm font-medium">
                Kafka UI
                <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={serviceDomains.kafkaUiUrl} onChange={(event) => updateServiceDomain("kafkaUiUrl", event.target.value)} />
              </label>
              <label className="text-sm font-medium">
                Portal 3DH
                <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={serviceDomains.portalUrl} onChange={(event) => updateServiceDomain("portalUrl", event.target.value)} />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                Keycloak issuer
                <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={serviceDomains.authUrl} onChange={(event) => updateServiceDomain("authUrl", event.target.value)} />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-panel p-3 text-sm text-muted">
              <span>{domainsMessage || "Esses dominios nao substituem DNS, Traefik ou variaveis de seguranca; eles centralizam os enderecos que o sistema deve divulgar e usar."}</span>
              <button className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={saveDomains} disabled={loading}>
                <Save size={16} />
                Salvar dominios
              </button>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Kafka broker
              <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={settings.broker} onChange={(event) => update("broker", event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Topic
              <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={settings.topic} onChange={(event) => update("topic", event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Client ID
              <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={settings.clientId} onChange={(event) => update("clientId", event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Group ID
              <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={settings.groupId} onChange={(event) => update("groupId", event.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={settings.ssl} onChange={(event) => update("ssl", event.target.checked)} />
              Usar SSL
            </label>
            <label className="text-sm font-medium">
              SASL
              <select className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={settings.saslMechanism ?? ""} onChange={(event) => update("saslMechanism", event.target.value as KafkaSettings["saslMechanism"])}>
                <option value="">Sem SASL</option>
                <option value="plain">plain</option>
                <option value="scram-sha-256">scram-sha-256</option>
                <option value="scram-sha-512">scram-sha-512</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Usuario SASL
              <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" value={settings.saslUsername ?? ""} onChange={(event) => update("saslUsername", event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Senha SASL
              <input className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent" type="password" value={settings.saslPassword ?? ""} onChange={(event) => update("saslPassword", event.target.value)} />
            </label>
          </section>

          <div className="rounded-md border border-line bg-panel p-3 text-sm text-muted">
            <div className="mb-2 font-semibold text-ink">Broker correto para producao</div>
            <p>Backend na VPS: <strong>kafka:9092</strong>. Teste externo Windows: <strong>72.60.245.62:19092</strong>. Kafka UI: <strong>kafka.3dhmanaus.com.br</strong> nao deve ser usado como broker.</p>
            <button className="mt-3 rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink" onClick={applyProductionPreset}>
              Usar preset producao
            </button>
          </div>

          {legacyAdminPasswordRequired ? <label className="block text-sm font-medium">
            Credenciais adm
            <div className="mt-2 flex items-center rounded-md border border-line bg-surface px-3 focus-within:border-accent">
              <ShieldCheck size={16} className="text-muted" />
              <input className="w-full bg-transparent px-3 py-2 outline-none" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Senha do administrador" />
            </div>
          </label> : null}

          <div className="flex items-center gap-2 text-sm">
            {status === "ok" ? <CheckCircle2 className="text-emerald-500" size={18} /> : status === "fail" ? <XCircle className="text-red-500" size={18} /> : <span className="h-[18px] w-[18px] rounded-full border border-line" />}
            <span>{message || "Conexao ainda nao testada."}</span>
          </div>
          </> : null}
        </div>

        {canAdmin ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">
          <button className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={testConnection} disabled={loading}>
            <TestTube2 size={16} />
            Testar conexao
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={save} disabled={loading}>
            <Save size={16} />
            Salvar configuracao
          </button>
        </div> : null}
      </div>
    </div>
  );
}
