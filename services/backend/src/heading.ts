type Point = {
  lat: number;
  lng: number;
};

type PreviousPoint = Point & {
  heading?: number | null;
};

type ResolveStableHeadingInput = {
  incomingHeading?: number | null;
  speed: number;
  previous?: PreviousPoint | null;
  current: Point;
};

const STOPPED_SPEED_KMH = 3;
const RELIABLE_HEADING_SPEED_KMH = 5;
const MIN_BEARING_DISTANCE_METERS = 8;

export function resolveStableHeading(input: ResolveStableHeadingInput) {
  const previousHeading = normalizeHeading(input.previous?.heading);
  const incomingHeading = normalizeHeading(input.incomingHeading);

  if (input.speed < STOPPED_SPEED_KMH && previousHeading !== undefined) {
    return previousHeading;
  }

  if (input.speed >= RELIABLE_HEADING_SPEED_KMH && incomingHeading !== undefined) {
    return incomingHeading;
  }

  if (input.previous) {
    const distance = distanceMeters(input.previous, input.current);
    if (distance >= MIN_BEARING_DISTANCE_METERS) {
      return calculateBearing(input.previous, input.current);
    }
  }

  return incomingHeading ?? previousHeading;
}

function normalizeHeading(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.round(((value % 360) + 360) % 360);
}

function calculateBearing(from: Point, to: Point) {
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);
  return normalizeHeading(toDegrees(Math.atan2(y, x))) ?? 0;
}

function distanceMeters(from: Point, to: Point) {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}
