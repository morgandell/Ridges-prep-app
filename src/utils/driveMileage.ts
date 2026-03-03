/** Base location for all drives (camp/office). */
export const BASE_LAT = 43.9281;
export const BASE_LNG = -114.8402;

// const ORS_API_KEY =
//   "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjgzMGYzYWU5NmNkYjQxYjJiNmYwZWQxMmUzYTFhNzYwIiwiaCI6Im11cm11cjY0In0=";
const ORS_API_KEY = atob(
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjgzMGYzYWU5NmNkYjQxYjJiNmYwZWQxMmUzYTFhNzYwIiwiaCI6Im11cm11cjY0In0="
);

async function fetchDrivingDistanceMiles(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<number> {
  const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: ORS_API_KEY,
    },
    body: JSON.stringify({
      coordinates: [
        [fromLng, fromLat],
        [toLng, toLat],
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Drive distance API error: ${response.status}`);
  }

  const data = await response.json();
  const distanceMeters =
    data?.features?.[0]?.properties?.segments?.[0]?.distance ??
    data?.features?.[0]?.properties?.summary?.distance ??
    0;
  return distanceMeters / 1609.344; // meters to miles
}

/**
 * Calculates total driving mileage from base to route points and back.
 * Base: 43.9281° N, 114.8402° W
 * - park: round trip base ↔ start point
 * - dropOff: round trip base ↔ start + round trip base ↔ end
 */
export async function calculateDriveMileage(
  transportMode: "park" | "dropOff",
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<number> {
  const baseToStart = await fetchDrivingDistanceMiles(BASE_LAT, BASE_LNG, startLat, startLng);
  const roundTripStart = baseToStart * 2;

  if (transportMode === "park") {
    return Math.round(roundTripStart * 10) / 10;
  }

  const baseToEnd = await fetchDrivingDistanceMiles(BASE_LAT, BASE_LNG, endLat, endLng);
  const roundTripEnd = baseToEnd * 2;
  return Math.round((roundTripStart + roundTripEnd) * 10) / 10;
}
