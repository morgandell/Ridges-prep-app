import { Route, RoutePoint } from "../types/route";

export interface DayWithStats {
  dayStops: RoutePoint[];
  firstStopIndex: number;
  lastStopIndex: number;
  dayMiles: number;
  dayElevation: number;
  /** Pick-up only day (no middle stops on this day). */
  isFinalLegDay: boolean;
  /** This hiking day includes the leg to pick-up (merged, not a separate day). */
  includesPickup?: boolean;
  notes?: string;
}

export function getLastCampsiteIndex(route: Route): number {
  if (!route?.stops) return -1;
  for (let i = route.stops.length - 1; i >= 0; i--) {
    if (route.stops[i].type === "campsite") return i;
  }
  return -1;
}

/**
 * Pick-up is its own day only when the last middle stop is a campsite,
 * or when there are no middle stops (drop off → pick up).
 */
export function shouldHaveSeparatePickupDay(route: Route): boolean {
  const stops = route.stops || [];
  if (!stops.length) return true;
  return stops[stops.length - 1].type === "campsite";
}

/** First segment index for the leg from last campsite to the end point. */
export function getFinalLegStartSegmentIndex(
  route: Route,
  lastCampsiteIndex: number,
): number {
  if (lastCampsiteIndex < 0 || !route.stops?.length) return -1;
  if (lastCampsiteIndex < route.stops.length - 1) {
    return route.stops.length;
  }
  return lastCampsiteIndex + 1;
}

export function getStopsByDay(route: Route): RoutePoint[][] {
  const stops = route.stops || [];
  if (!stops.length) return [];

  const days: RoutePoint[][] = [];
  let currentDay: RoutePoint[] = [];
  for (const stop of stops) {
    currentDay.push(stop);
    if (stop.type === "campsite") {
      days.push([...currentDay]);
      currentDay = [];
    }
  }
  if (currentDay.length > 0) days.push(currentDay);

  if (shouldHaveSeparatePickupDay(route)) {
    days.push([]);
  }
  return days;
}

function sumSegments(
  segs: Route["segments"],
  startSeg: number,
  endSeg: number,
): { dayMiles: number; dayElevation: number } {
  let dayMiles = 0;
  let dayElevation = 0;
  for (let i = startSeg; i <= endSeg && i < segs.length; i++) {
    dayMiles += segs[i].mileage || 0;
    dayElevation += segs[i].elevationGainFt || 0;
  }
  return { dayMiles, dayElevation };
}

function getDayNotes(points: RoutePoint[]): string | undefined {
  const notes = points
    .filter((point) => point.note?.trim())
    .map((point, index) => {
      const title =
        point.label?.trim() ||
        `Stop ${index + 1}`;

      return `${title}: ${point.note?.trim()}`;
    });

  return notes.length ? notes.join("\n\n") : undefined;
}

export function getDaysWithStats(route: Route): DayWithStats[] {
  if (!route?.segments?.length) return [];
  const segs = route.segments;
  const stops = route.stops || [];
  const separatePickup = shouldHaveSeparatePickupDay(route);
  

  if (!stops.length) {
    const { dayMiles, dayElevation } = sumSegments(segs, 0, segs.length - 1);
    return [
      {
        dayStops: [],
        firstStopIndex: -1,
        lastStopIndex: -1,
        dayMiles,
        dayElevation,
        isFinalLegDay: true,
        includesPickup: true,
        notes: getDayNotes([]),
      },
    ];
  }

  const stopsByDay = getStopsByDay(route);
  if (!stopsByDay.length) return [];

  const lastCampsiteIndex = getLastCampsiteIndex(route);
  const lastDayIndex = stopsByDay.length - 1;

  return stopsByDay.map((dayStops, dayIndex) => {
  const isFinalLegDay = dayStops.length === 0 && separatePickup;
  const includesPickup =
    !separatePickup &&
    dayIndex === lastDayIndex &&
    Boolean(route.endPoint);

  // Build list of points whose notes belong to this day
  const notePoints: RoutePoint[] = [...dayStops];

  // Include drop-off notes on Day 1
  if (dayIndex === 0 && route.startPoint) {
    notePoints.unshift(route.startPoint);
  }

  // Include pickup notes when pickup is merged into the final hiking day
  if (includesPickup && route.endPoint) {
    notePoints.push(route.endPoint);
  }

  const notes = getDayNotes(notePoints);

  if (isFinalLegDay) {
    const startSeg = getFinalLegStartSegmentIndex(
      route,
      lastCampsiteIndex,
    );

    const { dayMiles, dayElevation } = sumSegments(
      segs,
      startSeg,
      segs.length - 1,
    );

    return {
      dayStops,
      firstStopIndex: lastCampsiteIndex + 1,
      lastStopIndex: -1,
      dayMiles,
      dayElevation,
      isFinalLegDay: true,
      notes: getDayNotes(
        route.endPoint ? [route.endPoint] : [],
      ),
    };
  }

  const firstStopIndex = stops.indexOf(dayStops[0]);
  const lastStopIndex = stops.indexOf(
    dayStops[dayStops.length - 1],
  );

  const startSeg = dayIndex === 0 ? 0 : firstStopIndex;
  const endSeg = includesPickup
    ? segs.length - 1
    : lastStopIndex;

  const { dayMiles, dayElevation } = sumSegments(
    segs,
    startSeg,
    endSeg,
  );

  return {
    dayStops,
    firstStopIndex,
    lastStopIndex,
    dayMiles,
    dayElevation,
    isFinalLegDay: false,
    includesPickup: includesPickup || undefined,
    notes,
  };
  });
}

export function getDayCount(route: Route): number {
  return getDaysWithStats(route).length || 0;
}

/** Whether this day should show pick-up / end-point fields (edit or view). */
export function isPickupDay(
  day: DayWithStats,
  dayIndex: number,
  daysWithStats: DayWithStats[],
): boolean {
  if (day.isFinalLegDay || day.includesPickup) return true;
  if (!daysWithStats.some((d) => d.isFinalLegDay || d.includesPickup)) {
    return dayIndex === daysWithStats.length - 1;
  }
  return false;
}
