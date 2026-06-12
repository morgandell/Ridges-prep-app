import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WeekStats } from "../types/weekStats";
import { Route, EvacPoint } from "../types/route";
import { DayWithStats, getDaysWithStats } from "../utils/routeDayBreakdown";
import { calculateDriveMileage } from "../utils/driveMileage";
import { formatLocalDate } from "../utils/formatLocalDate";
import { getTransportModeLabel } from "../utils/transportMode";
import "./styles/routesPrint.css";

interface RouteWithWeeks {
  route: Route;
  weeks: WeekStats[];
}

function DayDestinationList({ day, route }: { day: DayWithStats; route: Route }) {
  if (day.isFinalLegDay) {
    return (
      <span className="day-destination-muted">
        Pick up: {route.endPoint?.label || "End"}
      </span>
    );
  }

  const listedStops = day.dayStops.filter(
    stop => stop.type === "view" || stop.type === "campsite",
  );

  if (listedStops.length === 0 && !day.includesPickup) {
    return <>—</>;
  }

  return (
    <ul className="day-destination-list">
      {listedStops.map((stop, index) => (
        <li key={stop.id || `${stop.type}-${index}`}>
          {stop.type === "view" ? "View" : "Campsite"}: {stop.label || "—"}
        </li>
      ))}
      {day.includesPickup && route.endPoint && (
        <li>Pick up: {route.endPoint.label || "End"}</li>
      )}
    </ul>
  );
}

export default function RoutesPrint() {
  const navigate = useNavigate();
  const [routeData, setRouteData] = useState<RouteWithWeeks[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamFilter, setTeamFilter] = useState<"both" | WeekStats["team"]>("both");
  const [driveMilesByRouteId, setDriveMilesByRouteId] = useState<
    Record<string, number | null | undefined>
  >({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (loading) return;
    loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamFilter]);

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
      const filteredWeeks =
        teamFilter === "both" ? weeks : weeks.filter((w) => (w.team || "A") === teamFilter);
      const weekRouteMap = new Map<string, { route: Route; weeks: WeekStats[] }>();

      for (const week of filteredWeeks) {
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

  let totalDriveMiles = 0;
  let driveMilesPending = false;
  let anyRouteWithTransport = false;
  for (const { route, weeks } of routeData) {
    if (!route.transportMode) continue;
    anyRouteWithTransport = true;
    const v = driveMilesByRouteId[route.id];
    const weekCount = weeks.length;
    if (v === undefined) driveMilesPending = true;
    else if (typeof v === "number") totalDriveMiles += v * weekCount;
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
          <div className="section-selectors no-print">
            <span className="section-selectors-label">Weeks:</span>
            <label className="section-checkbox">
              <input
                type="radio"
                name="routesPrintTeamFilter"
                checked={teamFilter === "both"}
                onChange={() => setTeamFilter("both")}
              />
              Both
            </label>
            <label className="section-checkbox">
              <input
                type="radio"
                name="routesPrintTeamFilter"
                checked={teamFilter === "A"}
                onChange={() => setTeamFilter("A")}
              />
              Team A
            </label>
            <label className="section-checkbox">
              <input
                type="radio"
                name="routesPrintTeamFilter"
                checked={teamFilter === "B"}
                onChange={() => setTeamFilter("B")}
              />
              Team B
            </label>
          </div>
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
              <strong>Total drive mileage (summer, counting each week):</strong>{" "}
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
  driveMileageResolved,
}: {
  route: Route;
  weeks: WeekStats[];
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

      {route.transportMode && (
        <p className="route-transport-summary">
          <strong>Van plan:</strong> {getTransportModeLabel(route.transportMode)}
        </p>
      )}

      <h3>Used by weeks</h3>
      <ul className="weeks-list">
        {weeks.map((w) => (
          <li key={w.id}>
            {formatLocalDate(w.weekStart)} — {w.ageGroup} ({w.numberOfCampers} campers)
          </li>
        ))}
      </ul>

      {daysWithStats.length > 0 ? (
        <>
          {route.startPoint && (
            <div className="route-drop-off-block route-simple-points">
              <h3>Drop off</h3>
              <div className="point-block">
                <strong>{route.startPoint.label || "Start"}</strong>{" "}
                ({route.startPoint.lat.toFixed(6)}, {route.startPoint.lng.toFixed(6)})
                {route.startPoint.note && (
                  <div className="point-note">Note: {route.startPoint.note}</div>
                )}
              </div>
            </div>
          )}
          <h3>Route by day</h3>
          <table className="route-days-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Mileage</th>
                <th>Elevation</th>
                <th>Evac Point</th>
                <th>Campsite / Endpoint</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {daysWithStats.map((day, dayIndex) => {
                const evac = evacPoints[dayIndex] || route.startPoint;
                const evacLabel = evac
                  ? evac.label || `${evac.lat.toFixed(4)}, ${evac.lng.toFixed(4)}`
                  : "—";
                return (
                  <tr key={dayIndex}>
                    <td>{dayIndex + 1}</td>
                    <td>{day.dayMiles.toFixed(2)} mi</td>
                    <td>{day.dayElevation.toLocaleString()} ft</td>
                    <td>{evacLabel}</td>
                    <td>
                      <DayDestinationList day={day} route={route} />
                    </td>
                    <td>
                      <div style={{ whiteSpace: "pre-line" }}>
                        {day.notes || "—"}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {route.endPoint && (
            <div className="route-pick-up-block route-simple-points">
              <h3>Pick up</h3>
              <div className="point-block">
                <strong>{route.endPoint.label || "End"}</strong>{" "}
                ({route.endPoint.lat.toFixed(6)}, {route.endPoint.lng.toFixed(6)})
                {route.endPoint.note && (
                  <div className="point-note">Note: {route.endPoint.note}</div>
                )}
              </div>
            </div>
          )}
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

