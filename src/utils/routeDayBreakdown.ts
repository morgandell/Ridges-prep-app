import { Route, RoutePoint } from "../types/route";

export interface DayWithStats {
  dayStops: RoutePoint[];
  firstStopIndex: number;
  lastStopIndex: number;
  dayMiles: number;
  dayElevation: number;
  isFinalLegDay: boolean;
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

  let lastCampIdx = -1;
  for (let i = route.stops.length - 1; i >= 0; i--) {
    if (route.stops[i].type === "campsite") {
      lastCampIdx = i;
      break;
    }
  }
  if (lastCampIdx >= 0) {
    const stopsAfterLastCamp = route.stops.slice(lastCampIdx + 1);
    if (stopsAfterLastCamp.length === 0) {
      days.push([]);
    }
  }
  return days;
}

export function getLastCampsiteIndex(route: Route): number {
  if (!route?.stops) return -1;
  for (let i = route.stops.length - 1; i >= 0; i--) {
    if (route.stops[i].type === "campsite") return i;
  }
  return -1;
}

export function getDaysWithStats(route: Route): DayWithStats[] {
  if (!route?.stops?.length || !route?.segments?.length) return [];
  const stopsByDay = getStopsByDay(route);
  if (!stopsByDay.length) return [];
  const lastCampsiteIndex = getLastCampsiteIndex(route);
  const segs = route.segments;

  return stopsByDay.map((dayStops, dayIndex) => {
    const isFinalLegDay = dayStops.length === 0 && lastCampsiteIndex >= 0;
    const firstStopIndex =
      dayStops.length > 0 ? route.stops!.indexOf(dayStops[0]) : lastCampsiteIndex + 1;
    const lastStopIndex =
      dayStops.length > 0 ? route.stops!.indexOf(dayStops[dayStops.length - 1]) : -1;
    const startSeg = dayIndex === 0 ? 0 : isFinalLegDay ? lastCampsiteIndex + 1 : firstStopIndex;
    const isLastDay = dayIndex === stopsByDay.length - 1;
    const endSeg = isFinalLegDay || isLastDay ? segs.length - 1 : lastStopIndex;
    let dayMiles = 0;
    let dayElevation = 0;
    for (let i = startSeg; i <= endSeg && i < segs.length; i++) {
      dayMiles += segs[i].mileage || 0;
      dayElevation += segs[i].elevationGainFt || 0;
    }
    return {
      dayStops,
      firstStopIndex: dayStops.length > 0 ? firstStopIndex : lastCampsiteIndex + 1,
      lastStopIndex,
      dayMiles,
      dayElevation,
      isFinalLegDay,
    };
  });
}

export function getDayCount(route: Route): number {
  return getDaysWithStats(route).length || 0;
}
