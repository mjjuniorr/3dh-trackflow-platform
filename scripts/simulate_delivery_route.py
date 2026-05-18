from __future__ import annotations

import argparse
import json
import math
import os
import signal
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from kafka import KafkaProducer


@dataclass(frozen=True)
class Point:
    lat: float
    lng: float


# Rota de exemplo em Manaus: sai da regiao do Amazonas Shopping, passa por vias proximas
# ao Manauara e retorna em direcao ao eixo centro-sul. Ajuste os pontos se quiser simular
# uma entrega especifica.
DEFAULT_ROUTE = [
    Point(-3.094167, -60.021944),  # Amazonas Shopping
    Point(-3.096250, -60.019650),
    Point(-3.099450, -60.016980),
    Point(-3.104040, -60.011800),  # Shopping Manauara
    Point(-3.107400, -60.014150),
    Point(-3.111300, -60.018500),
    Point(-3.119000, -60.021700),
]

running = True


def main() -> int:
    args = parse_args()
    install_signal_handlers()

    route = load_route(args.route_json) if args.route_json else DEFAULT_ROUTE
    samples = max(2, int(args.duration_minutes * 60 / args.interval_seconds) + 1)
    producer = KafkaProducer(
        bootstrap_servers=[args.broker],
        value_serializer=lambda value: json.dumps(value, ensure_ascii=False).encode("utf-8"),
        key_serializer=lambda value: value.encode("utf-8"),
        acks="all",
        retries=5,
        linger_ms=50,
    )

    print(
        f"Simulando {args.duration_minutes} min para {args.device_id} "
        f"em {args.topic} via {args.broker}. Intervalo: {args.interval_seconds}s",
        flush=True,
    )

    try:
        for index in range(samples):
            if not running:
                break

            progress = index / (samples - 1)
            current = interpolate_route(route, progress)
            previous = interpolate_route(route, max(0.0, progress - (1 / (samples - 1))))
            heading = calculate_heading(previous, current)
            battery = max(args.end_battery, round(args.start_battery - ((args.start_battery - args.end_battery) * progress)))

            payload = {
                "device_id": args.device_id,
                "lat": round(current.lat, 6),
                "lng": round(current.lng, 6),
                "speed": args.speed,
                "heading": round(heading),
                "battery": battery,
                "accuracy": args.accuracy,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            metadata = producer.send(args.topic, key=args.device_id, value=payload).get(timeout=15)
            print(
                f"[{index + 1:03d}/{samples:03d}] offset={metadata.offset} "
                f"lat={payload['lat']} lng={payload['lng']} heading={payload['heading']} "
                f"battery={payload['battery']} timestamp={payload['timestamp']}",
                flush=True,
            )

            if index < samples - 1:
                time.sleep(args.interval_seconds)
    finally:
        producer.flush()
        producer.close()

    print("Simulacao finalizada.", flush=True)
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Simula uma rota de entrega publicando localizacoes no Kafka.")
    parser.add_argument("--broker", default=os.getenv("KAFKA_BROKER", "72.60.245.62:19092"))
    parser.add_argument("--topic", default=os.getenv("KAFKA_TOPIC", "rastreamento"))
    parser.add_argument("--device-id", default=os.getenv("TEST_DEVICE_ID", "entregador_001"))
    parser.add_argument("--duration-minutes", type=float, default=float(os.getenv("SIM_DURATION_MINUTES", "30")))
    parser.add_argument("--interval-seconds", type=float, default=float(os.getenv("SIM_INTERVAL_SECONDS", "5")))
    parser.add_argument("--speed", type=float, default=float(os.getenv("SIM_SPEED", "32")))
    parser.add_argument("--accuracy", type=float, default=float(os.getenv("SIM_ACCURACY", "8")))
    parser.add_argument("--start-battery", type=int, default=int(os.getenv("SIM_START_BATTERY", "92")))
    parser.add_argument("--end-battery", type=int, default=int(os.getenv("SIM_END_BATTERY", "86")))
    parser.add_argument(
        "--route-json",
        help='JSON com lista de pontos: [{"lat": -3.094, "lng": -60.021}, ...]',
        default=os.getenv("SIM_ROUTE_JSON"),
    )
    return parser.parse_args()


def load_route(raw_json: str) -> list[Point]:
    data = json.loads(raw_json)
    if not isinstance(data, list) or len(data) < 2:
        raise ValueError("route-json deve conter pelo menos dois pontos.")
    return [Point(float(item["lat"]), float(item["lng"])) for item in data]


def interpolate_route(route: list[Point], progress: float) -> Point:
    progress = min(max(progress, 0.0), 1.0)
    segment_count = len(route) - 1
    raw_position = progress * segment_count
    segment_index = min(int(raw_position), segment_count - 1)
    local_progress = raw_position - segment_index
    start = route[segment_index]
    end = route[segment_index + 1]
    return Point(
        lat=start.lat + ((end.lat - start.lat) * local_progress),
        lng=start.lng + ((end.lng - start.lng) * local_progress),
    )


def calculate_heading(start: Point, end: Point) -> float:
    lat1 = math.radians(start.lat)
    lat2 = math.radians(end.lat)
    delta_lng = math.radians(end.lng - start.lng)
    y = math.sin(delta_lng) * math.cos(lat2)
    x = (math.cos(lat1) * math.sin(lat2)) - (math.sin(lat1) * math.cos(lat2) * math.cos(delta_lng))
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360) % 360


def install_signal_handlers() -> None:
    def stop(_signum, _frame) -> None:
        global running
        running = False

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)


if __name__ == "__main__":
    sys.exit(main())
