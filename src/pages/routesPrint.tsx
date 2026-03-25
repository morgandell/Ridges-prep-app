import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WeekStats } from "../types/weekStats";
import { Route, RoutePoint, EvacPoint } from "../types/route";
import { getDaysWithStats } from "../utils/routeDayBreakdown";
import { calculateDriveMileage } from "../utils/driveMileage";
import "./routesPrint.css";

interface RouteWithWeeks {
  route: Route;
  weeks: WeekStats[];
}

export default function RoutesPrint() {
  const navigate = useNavigate();
  const [routeData, setRouteData] = useState<RouteWithWeeks[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driveMilesByRouteId, setDriveMilesByRouteId] = useState<
    Record<string, number | null | undefined>
  >({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const next: Record<string, number | null | undefined> = {};

    for (const { route } of routeData) {
      const hasCoords =
        route.startPoint?.lat != null &&
        route.startPoint?.lng != null &&
        route.endPoint?.lat != null &&
        route.endPoint?.lng != null;
      if (!route.transportMode || !hasCoords) {
        next[route.id] = null;
      } else if (typeof route.driveMileage === "number") {
        next[route.id] = route.driveMileage;
      } else {
        next[route.id] = undefined;
      }
    }
    setDriveMilesByRouteId(next);

    for (const { route } of routeData) {
      const v = next[route.id];
      if (v === null || typeof v === "number") continue;
      calculateDriveMileage(
        route.transportMode!,
        route.startPoint.lat,
        route.startPoint.lng,
        route.endPoint.lat,
        route.endPoint.lng
      )
        .then((mi) => {
          if (!cancelled) setDriveMilesByRouteId((prev) => ({ ...prev, [route.id]: mi }));
        })
        .catch(() => {
          if (!cancelled) setDriveMilesByRouteId((prev) => ({ ...prev, [route.id]: null }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [routeData]);

  async function loadData(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const [weeksResult, routesResult] = await Promise.all([
        window.electronAPI.getWeekStats(),
        window.electronAPI.getRoutes(),
      ]);
      if (!weeksResult.success || !weeksResult.weeks || !routesResult.success || !routesResult.routes) {
        setRouteData([]);
        return;
      }
      const weeks = weeksResult.weeks;
      const routes = routesResult.routes;
      const weekRouteMap = new Map<string, { route: Route; weeks: WeekStats[] }>();

      for (const week of weeks) {
        const rid = week.routeId;
        if (!rid) continue;
        const route = routes.find((r) => String(r.id) === String(rid));
        if (!route) continue;
        const existing = weekRouteMap.get(route.id);
        if (existing) {
          existing.weeks.push(week);
        } else {
          weekRouteMap.set(route.id, { route, weeks: [week] });
        }
      }

      const list: RouteWithWeeks[] = Array.from(weekRouteMap.values()).sort(
        (a, b) => a.route.name.localeCompare(b.route.name)
      );
      setRouteData(list);
    } catch (err) {
      console.error("Error loading routes print data:", err);
      setRouteData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  let totalDriveMiles = 0;
  let driveMilesPending = false;
  let anyRouteWithTransport = false;
  for (const { route } of routeData) {
    if (!route.transportMode) continue;
    anyRouteWithTransport = true;
    const v = driveMilesByRouteId[route.id];
    if (v === undefined) driveMilesPending = true;
    else if (typeof v === "number") totalDriveMiles += v;
  }

  if (loading) {
    return (
      <div className="routes-print-page">
        <div className="print-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
        <div className="routes-print-loading">Loading routes...</div>
      </div>
    );
  }

  return (
    <div className="routes-print-page">
      <div className="print-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="header-actions">
          <button
            className="refresh-button"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button className="print-button" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="print-content">
        <div className="print-section">
          <h1>Routes Used by Weeks</h1>
          {routeData.length > 0 && anyRouteWithTransport && (
            <p className="print-meta print-totals">
              <strong>Total drive mileage (all routes):</strong>{" "}
              {driveMilesPending ? "…" : `${totalDriveMiles.toFixed(1)} mi`}
            </p>
          )}
          <p className="print-meta">
            Details for each route assigned to at least one week. Use Print / Save as PDF to generate a printable document.
          </p>
        </div>

        {routeData.length === 0 ? (
          <div className="print-section">
            <p className="print-empty">
              No routes are assigned to any week yet. Assign routes to weeks from the Week edit or Route detail pages.
            </p>
          </div>
        ) : (
          routeData.map(({ route, weeks }) => (
            <RoutePrintSection
              key={route.id}
              route={route}
              weeks={weeks}
              formatDate={formatDate}
              driveMileageResolved={driveMilesByRouteId[route.id]}
            />
          ))
        )}
      </div>
    </div>
  );
}

function RoutePrintSection({
  route,
  weeks,
  formatDate,
  driveMileageResolved,
}: {
  route: Route;
  weeks: WeekStats[];
  formatDate: (iso?: string) => string;
  driveMileageResolved?: number | null;
}) {
  const totalMiles = route.segments?.reduce((sum, seg) => sum + (seg.mileage || 0), 0) || 0;
  const totalElevation =
    route.segments?.reduce((sum, seg) => sum + (seg.elevationGainFt || 0), 0) || 0;
  const daysWithStats = getDaysWithStats(route);
  const evacPoints: EvacPoint[] = route.evacPoints || [];
  const driveMileage =
    typeof route.driveMileage === "number" ? route.driveMileage : driveMileageResolved;

  return (
    <div className="print-section page-break">
      <h2>{route.name}</h2>
      <div className="print-meta">
        <span>Age group: {route.ageGroup || "—"}</span>
        <span>•</span>
        <span>Distance: {totalMiles.toFixed(1)} mi</span>
        <span>•</span>
        <span>Elevation gain: {totalElevation.toLocaleString()} ft</span>
        <span>•</span>
        <span>Days: {daysWithStats.length}</span>
        {route.transportMode && (
          <>
            <span>•</span>
            <span>Drive: {driveMileage != null ? `${driveMileage.toFixed(1)} mi` : "—"}</span>
          </>
        )}
      </div>

      <h3>Used by weeks</h3>
      <ul className="weeks-list">
        {weeks.map((w) => (
          <li key={w.id}>
            {formatDate(w.weekStart)} — {w.ageGroup} ({w.numberOfCampers} campers)
          </li>
        ))}
      </ul>

      {daysWithStats.length > 0 ? (
        <>
          <h3>Route by day</h3>
          <table className="route-days-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Mileage</th>
                <th>Elevation</th>
                <th>Evac Point</th>
                <th>Campsite / Endpoint</th>
              </tr>
            </thead>
            <tbody>
              {daysWithStats.map((day, dayIndex) => {
                const evac = (evacPoints[dayIndex] || route.startPoint);
                const evacLabel = evac ? (evac.label || `${evac.lat.toFixed(4)}, ${evac.lng.toFixed(4)}`) : "—";
                let destination = "—";
                if (dayIndex === 0 && route.startPoint) {
                  destination = `Drop off: ${route.startPoint.label || "Start"}`;
                } else if (day.isFinalLegDay && route.endPoint) {
                  destination = `Pick up: ${route.endPoint.label || "End"}`;
                } else if (day.dayStops.length > 0) {
                  const lastStop = day.dayStops[day.dayStops.length - 1];
                  const type = (lastStop as RoutePoint).type === "campsite" ? "Campsite" : "View";
                  destination = `${type}: ${lastStop.label || "—"}`;
                }
                return (
                  <tr key={dayIndex}>
                    <td>{dayIndex + 1}</td>
                    <td>{day.dayMiles.toFixed(2)} mi</td>
                    <td>{day.dayElevation.toLocaleString()} ft</td>
                    <td>{evacLabel}</td>
                    <td>{destination}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : (
        <div className="route-simple-points">
          <h3>Points</h3>
          {route.startPoint && (
            <div className="point-block">
              <strong>Drop off:</strong> {route.startPoint.label || "Start"}{" "}
              ({route.startPoint.lat.toFixed(6)}, {route.startPoint.lng.toFixed(6)})
              {route.startPoint.note && <div className="point-note">Note: {route.startPoint.note}</div>}
            </div>
          )}
          {route.endPoint && (
            <div className="point-block">
              <strong>Pick up:</strong> {route.endPoint.label || "End"}{" "}
              ({route.endPoint.lat.toFixed(6)}, {route.endPoint.lng.toFixed(6)})
              {route.endPoint.note && <div className="point-note">Note: {route.endPoint.note}</div>}
            </div>
          )}
        </div>
      )}

      {route.notes && (
        <div className="route-notes-print">
          <h3>Notes</h3>
          <p>{route.notes}</p>
        </div>
      )}
    </div>
  );
}

