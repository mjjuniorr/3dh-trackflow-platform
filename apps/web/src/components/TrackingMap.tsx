import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { DeliveryPerson, LocationEvent, VehicleType } from "../types";
import { useEffect } from "react";

const MANAUS: [number, number] = [-3.119, -60.0217];
const VEHICLE_ICON: Record<VehicleType, string> = {
  motorcycle: "/assets/courier-top.png",
  car: "/assets/vehicle-car.png",
  boat: "/assets/vehicle-boat.svg",
  airplane: "/assets/vehicle-airplane.png",
  bus: "/assets/vehicle-bus.png"
};

function markerIcon(status: string, heading?: number | null, vehicleType: VehicleType = "motorcycle") {
  const className = status === "sem sinal" ? "sem-sinal" : status;
  const rotation = Number.isFinite(heading) ? Number(heading) : 0;
  const src = VEHICLE_ICON[vehicleType] ?? VEHICLE_ICON.motorcycle;
  const sizeByType: Record<VehicleType, [number, number]> = {
    motorcycle: [42, 58],
    car: [62, 42],
    boat: [46, 68],
    airplane: [72, 48],
    bus: [110, 32]
  };
  const iconSize = sizeByType[vehicleType] ?? sizeByType.motorcycle;
  const iconAnchor: [number, number] = [iconSize[0] / 2, iconSize[1] / 2];
  return L.divIcon({
    className: "",
    html: `<img class="courier-marker ${className}" src="${src}" alt="" style="width:${iconSize[0]}px;height:${iconSize[1]}px;transform: rotate(${rotation}deg)" />`,
    iconSize,
    iconAnchor
  });
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
  }, [map, points]);
  return null;
}

function formatSpeed(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "0.0";
  return Math.max(0, Math.min(220, value)).toFixed(1);
}

export function TrackingMap({ deliveryPeople }: { deliveryPeople: DeliveryPerson[] }) {
  const visible = deliveryPeople.filter((person) => person.last_location);
  const points = visible.map((person) => [person.last_location!.lat, person.last_location!.lng] as [number, number]);

  return (
    <MapContainer center={points[0] ?? MANAUS} zoom={13} scrollWheelZoom className="h-full min-h-[420px]">
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {visible.map((person) => (
        <Marker
          key={person.id}
          position={[person.last_location!.lat, person.last_location!.lng]}
          icon={markerIcon(person.computed_status, person.last_location?.heading, person.vehicle_type)}
        >
          <Popup>
            <strong>{person.name}</strong>
            <br />
            {person.device_id}
            <br />
            Bateria: {person.last_location?.battery ?? "-"}%
            <br />
            Velocidade: {formatSpeed(person.last_location?.speed)} km/h
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export function PublicMap({ location, status, name, vehicleType = "motorcycle" }: { location: LocationEvent | null; status: string; name: string; vehicleType?: VehicleType }) {
  const points = location ? ([[location.lat, location.lng]] as Array<[number, number]>) : [];
  return (
    <MapContainer center={points[0] ?? MANAUS} zoom={14} scrollWheelZoom className="h-full min-h-[360px] sm:min-h-[460px]">
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {location ? (
        <Marker position={[location.lat, location.lng]} icon={markerIcon(status, location.heading, vehicleType)}>
          <Popup>
            <strong>{name}</strong>
            <br />
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
