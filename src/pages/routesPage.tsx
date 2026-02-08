import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Route } from "../types/route";
import "./routes.css";

export default function RoutesPage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoutes();
  }, []);

  async function loadRoutes() {
    try {
      const result = await window.electronAPI.getRoutes();
      if (result.success && result.routes) {
        setRoutes(result.routes);
      }
    } catch (error) {
      console.error("Error loading routes:", error);
    } finally {
      setLoading(false);
    }
  }

  function calculateTotals(route: Route) {
    const totalMiles = route.segments?.reduce((sum, seg) => sum + (seg.mileage || 0), 0) || 0;
    const totalElevation = route.segments?.reduce((sum, seg) => sum + (seg.elevationGainFt || 0), 0) || 0;
    return { totalMiles, totalElevation };
  }

  return (
    <div className="routes-page">
      <div className="routes-header">
        <h1>Routes</h1>
        <button className="new-route-button" onClick={() => navigate("/routes/new")}>
          + New Route
        </button>
      </div>

      {loading ? (
        <div className="routes-loading">Loading routes...</div>
      ) : routes.length === 0 ? (
        <div className="routes-empty">
          <p>No routes yet. Create your first route!</p>
          <button className="new-route-button" onClick={() => navigate("/routes/new")}>
            Create Route
          </button>
        </div>
      ) : (
        <div className="routes-grid">
          {routes.map(route => {
            const { totalMiles, totalElevation } = calculateTotals(route);
            return (
              <div
                key={route.id}
                className="route-card"
                onClick={() => navigate(`/routes/${route.id}`)}
              >
                <div className="route-card-header">
                  <h3>{route.name}</h3>
                </div>
                <div className="route-card-body">
                  {totalMiles > 0 && (
                    <div className="route-stat">
                      <strong>Distance:</strong> {totalMiles.toFixed(1)} mi
                    </div>
                  )}
                  {totalElevation > 0 && (
                    <div className="route-stat">
                      <strong>Elevation:</strong> {totalElevation} ft
                    </div>
                  )}
                  {route.stops && route.stops.length > 0 && (
                    <div className="route-stat">
                      <strong>Stops:</strong> {route.stops.length}
                    </div>
                  )}
                  <div className="route-stat">
                    <strong>Start:</strong>{" "}
                    {route.startPoint?.label
                      ? route.startPoint.label
                      : `${route.startPoint?.lat?.toFixed(4)}, ${route.startPoint?.lng?.toFixed(4)}`}
                  </div>

                  <div className="route-stat">
                    <strong>End:</strong>{" "}
                    {route.endPoint?.label
                      ? route.endPoint.label
                      : `${route.endPoint?.lat?.toFixed(4)}, ${route.endPoint?.lng?.toFixed(4)}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
