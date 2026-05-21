import { Route, RoutePoint } from "../types/route";

export interface DayWithStats {
  dayStops: RoutePoint[];
  firstStopIndex: number;
  lastStopIndex: number;
  dayMiles: number;
  dayElevation: number;
  isFinalLegDay: boolean;
}

export function getLastCampsiteIndex(route: Route): number {
  if (!route?.stops) return -1;
  for (let i = route.stops.length - 1; i >= 0; i--) {
    if (route.stops[i].type === "campsite") return i;
  }
  return -1;
}

/** First segment index for the leg from last campsite (or last stop after it) to the end point. */
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
  if (!route?.stops?.length) return [];
  const days: RoutePoint[][] = [];
  let currentDay: RoutePoint[] = [];
  for (const stop of route.stops) {
    currentDay.push(stop);
    if (stop.type === "campsite") {
      days.push([...currentDay]);
      currentDay = [];
    }
  }
  if (currentDay.length > 0) days.push(currentDay);

  const lastCampsiteIndex = getLastCampsiteIndex(route);
  if (lastCampsiteIndex >= 0) {
    days.push([]);
  }
  return days;
}

export function getDaysWithStats(route: Route): DayWithStats[] {
  if (!route?.stops?.length || !route?.segments?.length) return [];
  const stopsByDay = getStopsByDay(route);
  if (!stopsByDay.length) return [];
  const lastCampsiteIndex = getLastCampsiteIndex(route);
  const segs = route.segments;
  const stops = route.stops;

  return stopsByDay.map((dayStops, dayIndex) => {
    const isFinalLegDay = dayStops.length === 0 && lastCampsiteIndex >= 0;

    if (isFinalLegDay) {
      const startSeg = getFinalLegStartSegmentIndex(route, lastCampsiteIndex);
      const endSeg = segs.length - 1;
      let dayMiles = 0;
      let dayElevation = 0;
      for (let i = startSeg; i <= endSeg && i < segs.length; i++) {
        dayMiles += segs[i].mileage || 0;
        dayElevation += segs[i].elevationGainFt || 0;
      }
      return {
        dayStops,
        firstStopIndex: lastCampsiteIndex + 1,
        lastStopIndex: -1,
        dayMiles,
        dayElevation,
        isFinalLegDay: true,
      };
    }

    const firstStopIndex = stops.indexOf(dayStops[0]);
    const lastStopIndex = stops.indexOf(dayStops[dayStops.length - 1]);
    const startSeg = dayIndex === 0 ? 0 : firstStopIndex;
    const endSeg = lastStopIndex;
    let dayMiles = 0;
    let dayElevation = 0;
    for (let i = startSeg; i <= endSeg && i < segs.length; i++) {
      dayMiles += segs[i].mileage || 0;
      dayElevation += segs[i].elevationGainFt || 0;
    }
    return {
      dayStops,
      firstStopIndex,
      lastStopIndex,
      dayMiles,
      dayElevation,
      isFinalLegDay: false,
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
  if (day.isFinalLegDay) return true;
  if (!daysWithStats.some((d) => d.isFinalLegDay)) {
    return dayIndex === daysWithStats.length - 1;
  }
  return false;
}
