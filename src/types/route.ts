export interface RoutePoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface Route {
  id: string;
  name: string;
  points: RoutePoint[];
  distanceMiles?: number;
  elevationGainFt?: number;
  notes?: string;
}

