import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AgeGroup, Route } from "../types/route";
import "./styles/routes.css";

type AgeGroupFilter = "all" | AgeGroup | "unassigned";

const AGE_GROUP_FILTERS: { value: AgeGroupFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Intro", label: "Intro" },
  { value: "Middle School", label: "Middle School" },
  { value: "High School", label: "High School" },
  { value: "unassigned", label: "Unassigned" },
];

export default function RoutesPage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [ageGroupFilter, setAgeGroupFilter] = useState<AgeGroupFilter>("all");

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

  function calculateDayCount(route: Route) {
    if (!route.stops || route.stops.length === 0) return 0;

    const days: Route["stops"][] = [];
    let currentDay: Route["stops"] = [];

    for (const stop of route.stops) {
      currentDay.push(stop);
      if (stop.type === "campsite") {
        days.push([...currentDay]);
        currentDay = [];
      }
    }

    if (currentDay.length > 0) {
      days.push(currentDay);
    }

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

    return days.length;
  }

  const filteredRoutes = routes.filter(route => {
    if (ageGroupFilter === "all") return true;
    if (ageGroupFilter === "unassigned") return !route.ageGroup;
    return route.ageGroup === ageGroupFilter;
  });

  return (
    <div className="routes-page">
      <div className="routes-header">
        <h1>Routes</h1>
        <button className="new-route-button" onClick={() => navigate("/routes/new")}>
          + New Route
        </button>
      </div>

      {!loading && routes.length > 0 && (
        <div className="routes-filters">
          {AGE_GROUP_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={ageGroupFilter === value ? "active" : ""}
              onClick={() => setAgeGroupFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="routes-loading">Loading routes...</div>
      ) : routes.length === 0 ? (
        <div className="routes-empty">
          <p>No routes yet. Create your first route!</p>
          <button className="new-route-button" onClick={() => navigate("/routes/new")}>
            Create Route
          </button>
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="routes-filter-empty">
          <p>No routes match this age group filter.</p>
          <button
            type="button"
            className="new-route-button"
            onClick={() => setAgeGroupFilter("all")}
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="routes-grid">
          {filteredRoutes.map(route => {
            const { totalMiles, totalElevation } = calculateTotals(route);
            const dayCount = calculateDayCount(route);
            return (
              <div
                key={route.id}
                className={`route-card ${route.ageGroup || 'default'}`}
                onClick={() => navigate(`/routes/${route.id}`)}
              >
                <div className="route-card-header">
                  <h3>{route.name}</h3>
                  {route.ageGroup && (
                    <span className="route-age-badge">{route.ageGroup}</span>
                  )}
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
                  {dayCount > 0 && (
                    <div className="route-stat">
                      <strong>Days:</strong> {dayCount}
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
