type RouteStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
};

type HikingRoute = {
  id: string;
  name: string;
  stops: RouteStop[];
};
