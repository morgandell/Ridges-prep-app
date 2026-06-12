import { milesBetweenPoints } from "./geoDistance";

/** Drop off / pick up required when trail endpoints are farther apart than this. */
export const ENDPOINTS_DROP_OFF_THRESHOLD_MI = 1;

export function resolveTransportModeForRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  current?: "park" | "dropOff",
): "park" | "dropOff" {
  if (
    milesBetweenPoints(start.lat, start.lng, end.lat, end.lng) >
    ENDPOINTS_DROP_OFF_THRESHOLD_MI
  ) {
    return "dropOff";
  }
  return current === "dropOff" ? "dropOff" : "park";
}

export function getTransportModeLabel(mode?: "park" | "dropOff"): string {
  if (mode === "dropOff") return "Drop off & pick up";
  if (mode === "park") return "Park van at trailhead";
  return "Not set";
}
