import { ItemComment } from "./itemComment";

export type StopType = "campsite" | "view";
export type AgeGroup = "Intro" | "Middle School" | "High School";

export interface RoutePoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  type?: StopType;
  note?: string;
}

export interface RouteSegment {
  mileage: number;
  elevationGainFt: number;
}

export interface EvacPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface Route {
  id: string;
  name: string;
  startPoint: RoutePoint;
  endPoint: RoutePoint;
  stops: RoutePoint[];
  segments: RouteSegment[]; // One segment per stop (start->stop1, stop1->stop2, ..., stopN->end)
  notes?: string;
  ageGroup?: AgeGroup;
  /**
   * Optional evacuation points per day.
   * Index corresponds to day index in the "route by day" breakdown.
   */
  evacPoints?: EvacPoint[];
  /** How the group gets to/from the trail: van parked at start, or dropped off & picked up */
  transportMode?: "park" | "dropOff";
  /** Cached drive mileage (round trip from base). Persisted on save to avoid refetching. */
  driveMileage?: number;
  comments?: ItemComment[];
}

