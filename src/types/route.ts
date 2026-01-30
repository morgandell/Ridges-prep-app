export interface RoutePoint {
  lat: number;
  lng: number;
  label?: string;
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
}

