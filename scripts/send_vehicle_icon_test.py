import argparse
import json
import os
from datetime import datetime, timezone

from kafka import KafkaProducer


VEHICLES = [
    {
        "device_id": "icon_test_moto",
        "delivery_person_name": "Teste Moto",
        "vehicle_type": "motorcycle",
        "lat": -3.0660,
        "lng": -60.1070,
        "heading": 95,
        "place": "Ponta Negra",
    },
    {
        "device_id": "icon_test_carro",
        "delivery_person_name": "Teste Carro",
        "vehicle_type": "car",
        "lat": -3.0898,
        "lng": -60.0269,
        "heading": 80,
        "place": "Amazonas Shopping",
    },
    {
        "device_id": "icon_test_barco",
        "delivery_person_name": "Teste Barco",
        "vehicle_type": "boat",
        "lat": -3.1385,
        "lng": -60.0234,
        "heading": 270,
        "place": "Porto de Manaus",
    },
    {
        "device_id": "icon_test_aviao",
        "delivery_person_name": "Teste Aviao",
        "vehicle_type": "airplane",
        "lat": -3.0386,
        "lng": -60.0497,
        "heading": 20,
        "place": "Aeroporto Eduardo Gomes",
    },
    {
        "device_id": "icon_test_onibus",
        "delivery_person_name": "Teste Onibus",
        "vehicle_type": "bus",
        "lat": -3.0808,
        "lng": -59.9576,
        "heading": 120,
        "place": "Terminal Sao Jose",
    },
]


def build_payload(vehicle: dict) -> dict:
    return {
        "device_id": vehicle["device_id"],
        "delivery_person_name": vehicle["delivery_person_name"],
        "vehicle_type": vehicle["vehicle_type"],
        "lat": vehicle["lat"],
        "lng": vehicle["lng"],
        "speed": 12,
        "heading": vehicle["heading"],
        "battery": 91,
        "accuracy": 8,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Publica um teste com um marcador de cada tipo de veiculo.")
    parser.add_argument("--broker", default=os.getenv("KAFKA_BROKER", "72.60.245.62:19092"))
    parser.add_argument("--topic", default=os.getenv("KAFKA_TOPIC", "rastreamento"))
    args = parser.parse_args()

    producer = KafkaProducer(
        bootstrap_servers=args.broker,
        value_serializer=lambda value: json.dumps(value).encode("utf-8"),
    )

    for vehicle in VEHICLES:
        payload = build_payload(vehicle)
        producer.send(args.topic, payload)
        print(f"Enviado {vehicle['delivery_person_name']} ({vehicle['vehicle_type']}) em {vehicle['place']}")

    producer.flush()
    producer.close()
    print(f"Teste publicado no topico {args.topic} via broker {args.broker}.")


if __name__ == "__main__":
    main()
