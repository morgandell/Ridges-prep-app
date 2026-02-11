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

export interface Route {
  id: string;
  name: string;
  startPoint: RoutePoint;
  endPoint: RoutePoint;
  stops: RoutePoint[];
  segments: RouteSegment[]; // One segment per stop (start->stop1, stop1->stop2, ..., stopN->end)
  notes?: string;
  ageGroup?: AgeGroup;
}

