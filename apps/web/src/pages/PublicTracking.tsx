import { Clock, Navigation } from "lucide-react";
import { useEffect, useState } from "react";
import { getPublicTracking } from "../api";
import { PublicMap } from "../components/TrackingMap";
import { createSocket } from "../socket";
import type { PublicTrackingPayload } from "../types";

function fmt(date?: string) {
  return date ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(date)) : "-";
}

export function PublicTracking({ publicToken }: { publicToken: string }) {
  const [data, setData] = useState<PublicTrackingPayload | null>(null);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getPublicTracking(publicToken)
      .then(setData)
      .catch((err) => {
        if (err instanceof Error && err.message.includes("expirou")) setExpired(true);
        else setError(err instanceof Error ? err.message : "Link invalido.");
      });

    const socket = createSocket();
    socket.emit("tracking:join", { public_token: publicToken });
    socket.on("tracking:expired", () => setExpired(true));
    socket.on("location:update", (payload) => {
      setData((current) => current ? { ...current, ...payload } : current);
    });
    return () => {
      socket.disconnect();
    };
  }, [publicToken]);

  if (expired) {
    return <main className="flex min-h-screen items-center justify-center bg-panel p-4 text-center text-xl font-semibold">Este link de rastreamento expirou.</main>;
  }

  if (error) {
    return <main className="flex min-h-screen items-center justify-center bg-panel p-4 text-center text-lg font-semibold">{error}</main>;
  }

  return (
    <main className="grid min-h-[100dvh] grid-rows-[auto_1fr] bg-panel text-ink">
      <header className="app-chrome border-b px-5 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="brand-mark">3DH</div>
            <div className="rounded-md bg-accent p-2 text-white">
              <Navigation size={22} />
            </div>
            <div className="min-w-0">
              <p className="brand-kicker">TrackFlow</p>
              <h1 className="truncate text-lg font-semibold sm:text-xl">{data?.delivery_person.name ?? "Rastreamento"}</h1>
              <p className="text-sm text-muted">Atualizacao em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs sm:text-sm">
            <Clock size={16} />
            Expira em {fmt(data?.expires_at)}
          </div>
        </div>
      </header>

      <section className="grid grid-rows-[1fr_auto]">
        <PublicMap
          location={data?.last_location ?? null}
          status={data?.delivery_person.status ?? "offline"}
          name={data?.delivery_person.name ?? "Entregador"}
        />
        <div className="app-footer border-t px-4 py-4 sm:px-5">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><strong>Device</strong><br />{data?.delivery_person.device_id ?? "-"}</div>
            <div><strong>Bateria</strong><br />{data?.last_location?.battery ?? "-"}%</div>
            <div><strong>Velocidade</strong><br />{data?.last_location?.speed ?? 0} km/h</div>
            <div><strong>Ultima atualizacao</strong><br />{fmt(data?.last_location?.timestamp)}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
