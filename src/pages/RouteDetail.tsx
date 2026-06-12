import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBinoculars, faCampground, faSignsPost, faCircleExclamation} from "@fortawesome/free-solid-svg-icons";
import "leaflet/dist/leaflet.css";
import { Route, RoutePoint, EvacPoint } from "../types/route";
import CommentsSection from "../components/CommentsSection";
import { WeekStats } from "../types/weekStats";
import { calculateDriveMileage } from "../utils/driveMileage";
import { formatLocalDate } from "../utils/formatLocalDate";
import { getRoutePointMarkerIcon } from "../utils/routeMapMarkers";
import {
  getDaysWithStats,
  getLastCampsiteIndex,
  isPickupDay,
} from "../utils/routeDayBreakdown";
import "./styles/RouteDetail.css";

// Fix for default marker icons in React-Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const [weeks, setWeeks] = useState<WeekStats[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [weeksLoading, setWeeksLoading] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [driveMileage, setDriveMileage] = useState<number | null>(null);
  const [driveMileageLoading, setDriveMileageLoading] = useState(false);
  const [driveMileageError, setDriveMileageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [routeImagePreviews, setRouteImagePreviews] = useState<Record<string, string>>({});
  const [imageDescriptionDrafts, setImageDescriptionDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadRoute() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const result = await window.electronAPI.getRoute(id);
        if (result.success && result.route) {
          setRoute(result.route);
        } else {
          console.error("Error loading route:", result.error);
        }
      } catch (error) {
        console.error("Error loading route:", error);
      } finally {
        setLoading(false);
      }
    }

    loadRoute();
  }, [id]);

  // Use saved driveMileage when available; otherwise fetch from API
  useEffect(() => {
    if (
      !route?.startPoint?.lat ||
      !route?.startPoint?.lng ||
      !route?.endPoint?.lat ||
      !route?.endPoint?.lng ||
      !route.transportMode
    ) {
      setDriveMileage(null);
      setDriveMileageError(null);
      setDriveMileageLoading(false);
      return;
    }
    if (typeof route.driveMileage === "number") {
      setDriveMileage(route.driveMileage);
      setDriveMileageError(null);
      setDriveMileageLoading(false);
      return;
    }
    let cancelled = false;
    setDriveMileageLoading(true);
    setDriveMileageError(null);
    calculateDriveMileage(
      route.transportMode,
      route.startPoint.lat,
      route.startPoint.lng,
      route.endPoint.lat,
      route.endPoint.lng
    )
      .then((mi) => {
        if (!cancelled) setDriveMileage(mi);
      })
      .catch((err) => {
        if (!cancelled) setDriveMileageError(err?.message || "Failed to load drive mileage");
      })
      .finally(() => {
        if (!cancelled) setDriveMileageLoading(false);
      });
    return () => { cancelled = true; };
  }, [
    route?.id,
    route?.driveMileage,
    route?.transportMode,
    route?.startPoint?.lat,
    route?.startPoint?.lng,
    route?.endPoint?.lat,
    route?.endPoint?.lng,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!route?.id) {
      setRouteImagePreviews({});
      return;
    }
    const images = route.images ?? [];
    if (images.length === 0) {
      setRouteImagePreviews({});
      return;
    }
    (async () => {
      const entries = await Promise.all(
        images.map(async (img) => {
          const res = await window.electronAPI.getRouteImagePreview(route.id, img.id);
          return [img.id, res.success ? res.dataUrl || "" : ""] as const;
        })
      );
      if (!cancelled) {
        const map: Record<string, string> = {};
        for (const [imgId, dataUrl] of entries) {
          if (dataUrl) map[imgId] = dataUrl;
        }
        setRouteImagePreviews(map);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route?.id, route?.images]);

  useEffect(() => {
    const images = route?.images ?? [];
    const next: Record<string, string> = {};
    for (const img of images) {
      next[img.id] = img.description || "";
    }
    setImageDescriptionDrafts(next);
  }, [route?.images]);

  const handleBack = () => {
    if (location.state?.fromEdit) {
      navigate("/routes");
    } else {
      navigate(-1);
    }
  };

  const handleEdit = () => {
    navigate(`/routes/${id}/edit`, { state: { fromDetail: true } });
  };

  async function openAssignModal() {
    setAssignError(null);
    setAssignModalOpen(true);

    if (weeks.length > 0) return;

    setWeeksLoading(true);
    try {
      const result = await window.electronAPI.getWeekStats();
      if (result.success && result.weeks) {
        const sorted = result.weeks
          .slice()
          .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
        setWeeks(sorted);
      } else {
        setWeeks([]);
        setAssignError(result.error || "Failed to load weeks.");
      }
    } catch (err) {
      console.error("Error loading weeks:", err);
      setWeeks([]);
      setAssignError("Failed to load weeks.");
    } finally {
      setWeeksLoading(false);
    }
  }

  async function assignRouteToSelectedWeek() {
    if (!route) return;
    if (!selectedWeekId) {
      setAssignError("Please select a week.");
      return;
    }

    const week = weeks.find(w => w.id === selectedWeekId);
    if (!week) {
      setAssignError("Selected week not found.");
      return;
    }

    if (week.routeId && String(week.routeId) !== String(route.id)) {
      const ok = window.confirm(
        `That week already has a route assigned.\n\nReplace it with "${route.name}"?`
      );
      if (!ok) return;
    }

    setAssignSaving(true);
    setAssignError(null);
    try {
      const updatedWeek: WeekStats = { ...week, routeId: route.id };
      const saveResult = await window.electronAPI.saveWeekStats(updatedWeek);
      if (!saveResult.success) {
        setAssignError(saveResult.error || "Failed to assign route to week.");
        return;
      }

      setWeeks(prev => prev.map(w => (w.id === updatedWeek.id ? updatedWeek : w)));
      setAssignModalOpen(false);
      navigate(`/weeks/${updatedWeek.id}`, { state: { fromRoute: true } });
    } catch (err) {
      console.error("Error assigning route to week:", err);
      setAssignError("Failed to assign route to week.");
    } finally {
      setAssignSaving(false);
    }
  }

  async function handleDelete() {
    if (!route || !window.confirm("Are you sure you want to delete this route?")) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteRoute(route.id);
      if (result.success) {
        navigate("/routes");
      } else {
        alert("Failed to delete route: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting route:", error);
      alert("Failed to delete route");
    }
  }

  // Build array of all points in order: start, stops, end
  const allPoints = useMemo(() => {
    if (!route) return [];

    const points: Array<{
      lat: number;
      lng: number;
      label?: string;
      type: "start" | "stop" | "end";
      index?: number;
    }> = [];

    if (route.startPoint) {
      points.push({ ...route.startPoint, type: "start" });
    }

    if (route.stops) {
      route.stops.forEach((stop, index) => {
        points.push({ ...stop, type: "stop", index });
      });
    }

    if (route.endPoint) {
      points.push({ ...route.endPoint, type: "end" });
    }

    return points;
  }, [route]);

  const mapCenter: [number, number] = useMemo(() => {
    if (allPoints.length === 0) return [40.7608, -111.8910];
    const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length;
    return [avgLat, avgLng];
  }, [allPoints]);

  const bounds = useMemo(() => {
    if (allPoints.length === 0) return undefined;
    const lats = allPoints.map(p => p.lat);
    const lngs = allPoints.map(p => p.lng);
    return new LatLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  }, [allPoints]);



  const lastCampsiteIndex = route ? getLastCampsiteIndex(route) : -1;



  const daysWithStats = route ? getDaysWithStats(route) : [];




  // Fetch route geometry for trail-following polyline
  useEffect(() => {
    async function fetchRouteGeometry() {
      if (allPoints.length < 2) {
        setRouteGeometry([]);
        return;
      }

      setFetchingRoute(true);
      try {
        const coordinates = allPoints.map(p => [p.lng, p.lat]);
        
        const url = 'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson';
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
            'Authorization': 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjgzMGYzYWU5NmNkYjQxYjJiNmYwZWQxMmUzYTFhNzYwIiwiaCI6Im11cm11cjY0In0='  // Replace with your OpenRouteService API key
          },
          body: JSON.stringify({
            coordinates: coordinates,
            preference: 'recommended',
            units: 'mi',
            elevation: true
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const geometry = data.features[0].geometry.coordinates;
          const leafletCoords: [number, number][] = geometry.map((coord: number[]) => [coord[1], coord[0]]);
          setRouteGeometry(leafletCoords);
        } else {
          // Fallback to straight lines
          setRouteGeometry(allPoints.map(p => [p.lat, p.lng]));
        }
      } catch (error) {
        console.error('Error fetching hiking route:', error);
        // Fallback to straight lines
        setRouteGeometry(allPoints.map(p => [p.lat, p.lng]));
      } finally {
        setFetchingRoute(false);
      }
    }

    fetchRouteGeometry();
  }, [allPoints]);

  if (loading) {
    return <div className="route-detail">Loading...</div>;
  }

  if (!route) {
    return (
      <div className="route-detail">
        <h1>Route not found</h1>
        <button onClick={handleBack}>Back</button>
      </div>
    );
  }

  const totalMiles = route.segments?.reduce((sum, seg) => sum + (seg.mileage || 0), 0) || 0;
  const totalElevation = route.segments?.reduce((sum, seg) => sum + (seg.elevationGainFt || 0), 0) || 0;
  const evacPoints: EvacPoint[] = route.evacPoints || [];
  const weeksUsingThisRoute = weeks.filter(w => String(w.routeId) === String(route.id));


  // Component to fit bounds after map loads
  function FitBounds({ bounds }: { bounds: LatLngBounds | undefined }) {
    const map = useMap();
    useEffect(() => {
      if (bounds) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [bounds, map]);
    return null;
  }

  return (
    <div className="route-detail">
      <div className="route-detail-header">
        <button className="back-button" onClick={handleBack}>
          ← Back
        </button>
        <div className="route-actions">
          <button className="assign-button" onClick={openAssignModal}>
            Add to Week
          </button>
          <button className="edit-button" onClick={handleEdit}>
            Edit
          </button>
          <button className="delete-button" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {assignModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!assignSaving) setAssignModalOpen(false);
          }}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add route to a week</h2>
              <button
                className="modal-close"
                type="button"
                onClick={() => setAssignModalOpen(false)}
                disabled={assignSaving}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-row">
                <label htmlFor="assign-week">Week</label>
                <select
                  id="assign-week"
                  value={selectedWeekId}
                  onChange={(e) => setSelectedWeekId(e.target.value)}
                  disabled={weeksLoading || assignSaving}
                >
                  <option value="">{weeksLoading ? "Loading weeks..." : "Select a week"}</option>
                  {weeks.map(w => (
                    <option key={w.id} value={w.id}>
                      {formatLocalDate(w.weekStart)} — {w.ageGroup}
                      {w.routeId ? " (has route)" : ""}
                    </option>
                  ))}
                </select>
                {assignError && <div className="modal-error">{assignError}</div>}
              </div>

              {weeksUsingThisRoute.length > 0 && (
                <div className="modal-hint">
                  Already assigned to:{" "}
                  {weeksUsingThisRoute
                    .map(w => `${formatLocalDate(w.weekStart)} (${w.ageGroup})`)
                    .join(", ")}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setAssignModalOpen(false)}
                disabled={assignSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={assignRouteToSelectedWeek}
                disabled={assignSaving || weeksLoading}
              >
                {assignSaving ? "Assigning..." : "Assign route"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="route-header">
        <h1>{route.name}</h1>
      </div>

      <div className="route-totals">
        <div className="total-item">
          <span className="total-label">Total Distance:</span>
          <span className="total-value">{totalMiles.toFixed(2)} miles</span>
        </div>
        <div className="total-item">
          <span className="total-label">Total Elevation Gain:</span>
          <span className="total-value">{totalElevation.toLocaleString()} ft</span>
        </div>
        {/* {route.ageGroup && ( */}
          <div className="total-item">
            <span className="total-label">Age Group:</span>
            <span className="total-value">{route.ageGroup}</span>
          </div>
        {/* )} */}
        {route.transportMode && (
          <div className={`total-item${driveMileageError ? " total-error" : ""}`}>
            <span className="total-label">Drive mileage:</span>
            <span>
              {driveMileageLoading && <span className="total-hint">Loading…</span>}
              {!driveMileageLoading && driveMileage != null && (
                <span className="total-value">{driveMileage.toFixed(1)} mi</span>
              )}
              {!driveMileageLoading && driveMileageError && (
                <span className="total-value">{driveMileageError}</span>
              )}
              {!driveMileageLoading && driveMileage != null && (
                <span className="total-hint">
                  {" "}({route.transportMode === "park" ? "base → start & back" : "base → start & end"})
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {allPoints.length > 0 && (
        <div className="route-section">
          <h2>Route Map</h2>
          <div className="route-map-container">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: "500px", width: "100%", borderRadius: "8px" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                crossOrigin="anonymous"
              />
              
              {allPoints.map((point, index) => {
                let popupText = "";

                if (point.type === "start") {
                  popupText = `Start${point.label ? `: ${point.label}` : ""}\n${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
                } else if (point.type === "end") {
                  popupText = `End${point.label ? `: ${point.label}` : ""}\n${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
                } else {
                  popupText = `Stop ${(point.index || 0) + 1}${point.label ? `: ${point.label}` : ""}\n${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
                }

                const stopType =
                  point.type === "stop" && route?.stops
                    ? route.stops[point.index ?? 0]?.type
                    : undefined;
                const icon = getRoutePointMarkerIcon(index, allPoints.length, stopType);

                return (
                  <Marker
                    key={index}
                    position={[point.lat, point.lng]}
                    icon={icon}
                  >
                    <Popup>
                      <div style={{ whiteSpace: "pre-line" }}>{popupText}</div>
                    </Popup>
                  </Marker>
                );
              })}

              {routeGeometry.length > 0 && (
                <Polyline
                  positions={routeGeometry}
                  color="#3b82f6"
                  weight={4}
                  opacity={0.8}
                />
              )}

              {fetchingRoute && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  zIndex: 1000,
                  fontSize: '14px'
                }}>
                  Loading trail route...
                </div>
              )}

              <FitBounds bounds={bounds} />
            </MapContainer>
          </div>
        </div>
      )}

      {daysWithStats.length > 0 ? (
        <div className="route-section">
          <h2>Route by day</h2>
          {daysWithStats.map((day, dayIndex) => (
            <div key={dayIndex} className="stops-by-day">
              <div className="day-summary">
              <h3 className="day-heading">Day {dayIndex + 1}</h3>
              <div className="day-summary-meta">
                <span>{day.dayMiles.toFixed(2)} miles</span>
                <span>{day.dayElevation.toLocaleString()} ft elevation gain</span>
                </div>
              </div>
              {(() => {
                const evac = evacPoints[dayIndex] || route.startPoint;
                if (!evac) return null;
                return (
                  <div className="stop-details">
                    <h4>
                        <FontAwesomeIcon icon={faCircleExclamation} className="icon-evac" /> Evacuation point
                    </h4>
                    <div className="coordinate-display coordinate-compact">
                      <div>
                        <strong>Location:</strong>{" "}
                        {evac.label || "Unlabeled point"}
                      </div>
                      <div>
                        <strong>Lat/Lng:</strong>{" "}
                        {evac.lat.toFixed(6)}, {evac.lng.toFixed(6)}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {dayIndex === 0 && (
                <div className="stop-details">
                  <h4><FontAwesomeIcon icon={faSignsPost} className="icon-secondary" /> Drop Off: {route.startPoint?.label ? `: ${route.startPoint.label}` : ""}
                      {" "} {"("} {route.startPoint?.lat?.toFixed(6)}, {route.startPoint?.lng?.toFixed(6)} {")"} </h4>
                  {route.startPoint?.note && (
                    <p className="point-note"><strong>Note:</strong> {route.startPoint.note}</p>
                  )}
                </div>
              )}
             {day.dayStops.map((stop, indexInDay) => {
                const globalIndex = day.firstStopIndex + indexInDay;
                const segment = route.segments?.[globalIndex];
                const isCampsite = (stop as RoutePoint).type === "campsite";
                const lastStop = route.stops?.[globalIndex - 1] || route.startPoint;
                // const fromLabel = globalIndex === 0 ? "start" : `stop ${globalIndex}`;
                return (
                  <div key={globalIndex} className="stop-details">
                    <h4> 
                      {isCampsite ? <FontAwesomeIcon icon={faCampground} className="icon-secondary" /> :<FontAwesomeIcon icon={faBinoculars} className="icon-secondary"/>
}
                      {" "} {stop.label ? ` ${stop.label}` : ""}
                      {" "} {"("} {stop.lat.toFixed(6)}, {stop.lng.toFixed(6)} {")"}
                      {stop.note && (
                    <p className="point-note"><strong>Note:</strong> {stop.note}</p>
                  )}
                    </h4>
                    {segment && (
                      <div className="segment-info">
                        <div>Distance from {lastStop.label ? ` ${lastStop.label}` : ""}: {segment.mileage.toFixed(2)} mi</div>
                        <div>Elevation gain: {segment.elevationGainFt.toLocaleString()} ft</div>
                      </div>
                    )}
                  </div>
                );
              })}
              {route.endPoint && isPickupDay(day, dayIndex, daysWithStats) && (() => {
                const lastMiddleStop =
                  route.stops && route.stops.length > 0
                    ? route.stops[route.stops.length - 1]
                    : null;
                const distanceLabel = lastMiddleStop
                  ? lastMiddleStop.label || `Stop ${route.stops!.length}`
                  : route.startPoint?.label || "drop off";
                const pickupLegSegment = day.includesPickup
                  ? route.segments?.[route.stops!.length]
                  : null;
                const pickupMiles = day.isFinalLegDay
                  ? day.dayMiles
                  : pickupLegSegment?.mileage ?? 0;
                const pickupElevation = day.isFinalLegDay
                  ? day.dayElevation
                  : pickupLegSegment?.elevationGainFt ?? 0;

                return (
                  <div className="stop-details">
                    <h4>
                      <FontAwesomeIcon icon={faSignsPost} className="icon-secondary" />
                      {" "}Pick up
                      {route.endPoint.label ? `: ${route.endPoint.label}` : ""}
                      {" "}(
                      {route.endPoint.lat.toFixed(6)}, {route.endPoint.lng.toFixed(6)})
                    </h4>
                    {route.endPoint.note && (
                      <p className="point-note"><strong>Note:</strong> {route.endPoint.note}</p>
                    )}
                    {(pickupMiles > 0 || pickupElevation > 0) && (
                      <div className="segment-info">
                        <div>
                          <strong>Distance from {distanceLabel}:</strong>{" "}
                          {pickupMiles.toFixed(2)} mi
                        </div>
                        <div>
                          <strong>Elevation gain:</strong>{" "}
                          {pickupElevation.toLocaleString()} ft
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* <div className="route-section">
            <h2><FontAwesomeIcon icon={faSignsPost} className="icon-secondary" /> Start Point</h2>
            <div className="coordinate-display">
              <div><strong>Latitude:</strong> {route.startPoint?.lat?.toFixed(6)}</div>
              <div><strong>Longitude:</strong> {route.startPoint?.lng?.toFixed(6)}</div>
              {route.startPoint?.label && (
                <div><strong>Label:</strong> {route.startPoint.label}</div>
              )}
            </div>
            {route.segments && route.segments[0] && (
              <div className="segment-info">
                <div><strong>Distance to {route.stops?.length ? "first stop" : "end"}:</strong> {route.segments[0].mileage.toFixed(2)} mi</div>
                <div><strong>Elevation gain:</strong> {route.segments[0].elevationGainFt.toLocaleString()} ft</div>
              </div>
            )}
          </div> */}
          {route.stops && route.stops.length > 0 && (
            <div className="route-section">
              <h2>Stops</h2>
              {route.stops.map((stop, index) => {
                const segment = route.segments?.[index];
                const fromLabel = index === 0 ? "start" : `stop ${index}`;
                return (
                  <div key={index} className="stop-details">
                    <h3>🔵 Stop {index + 1}{stop.label ? `: ${stop.label}` : ""}</h3>
                    <div className="coordinate-display">
                      <div><strong>Latitude:</strong> {stop.lat.toFixed(6)}</div>
                      <div><strong>Longitude:</strong> {stop.lng.toFixed(6)}</div>
                      <div><strong>Label:</strong> {stop.label || "—"}</div>
                    </div>
                    {segment && (
                      <div className="segment-info">
                        <div><strong>Distance from {fromLabel}:</strong> {segment.mileage.toFixed(2)} mi</div>
                        <div><strong>Elevation gain:</strong> {segment.elevationGainFt.toLocaleString()} ft</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* <div className="route-section">
        <h2><FontAwesomeIcon icon={faSignsPost} className="icon-primary" /> End Point</h2>
        <div className="coordinate-display">
          <div><strong>Latitude:</strong> {route.endPoint?.lat?.toFixed(6)}</div>
          <div><strong>Longitude:</strong> {route.endPoint?.lng?.toFixed(6)}</div>
          {route.endPoint?.label && (
            <div><strong>Label:</strong> {route.endPoint.label}</div>
          )}
        </div>
      </div> */}

      {route.notes && (
        <div className="route-section">
          <h2>Notes</h2>
          <p className="route-notes">{route.notes}</p>
        </div>
      )}

      <div className="route-section">
        <h2>Route Images (optional)</h2>

        {(route.images ?? []).length === 0 ? (
          <p className="route-image-muted">No images attached.</p>
        ) : (
          <div className="route-image-gallery">
            {(route.images ?? []).map((img) => (
              <div key={img.id} className="route-image-card">
                <div className="route-image-row">
                  <div>
                    <strong>Attached:</strong> {img.name || "route-image"}
                  </div>
                  <div className="route-image-actions">
                    <button
                      type="button"
                      className="route-image-button"
                      onClick={async () => {
                        const res = await window.electronAPI.openPath(img.path);
                        if (!res.success) alert(res.error || "Could not open image.");
                      }}
                    >
                      Open image
                    </button>
                    <button
                      type="button"
                      className="route-image-remove"
                      onClick={async () => {
                        if (!window.confirm("Remove this image?")) return;
                        const res = await window.electronAPI.removeRouteImage(route.id, img.id);
                        if (res.success && res.route) {
                          setRoute(res.route);
                        } else {
                          alert(res.error || "Could not remove image.");
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {routeImagePreviews[img.id] && (
                  <div className="route-image-preview-wrap">
                    <img
                      src={routeImagePreviews[img.id]}
                      alt={img.description || img.name || "Route attachment"}
                      className="route-image-preview"
                    />
                  </div>
                )}

                <div className="route-image-description-edit">
                  <label>
                    Description (optional)
                    <input
                      type="text"
                      className="route-image-description-input"
                      value={imageDescriptionDrafts[img.id] ?? ""}
                      onChange={(e) =>
                        setImageDescriptionDrafts((prev) => ({ ...prev, [img.id]: e.target.value }))
                      }
                      placeholder="Add a short caption..."
                    />
                  </label>
                  <button
                    type="button"
                    className="route-image-button"
                    onClick={async () => {
                      const res = await window.electronAPI.updateRouteImageDescription(
                        route.id,
                        img.id,
                        imageDescriptionDrafts[img.id] ?? ""
                      );
                      if (res.success && res.route) {
                        setRoute(res.route);
                      } else {
                        alert(res.error || "Could not save description.");
                      }
                    }}
                  >
                    Save description
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="route-image-upload">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const bytes = new Uint8Array(await f.arrayBuffer());
                const res = await window.electronAPI.attachRouteImage(
                  route.id,
                  f.name,
                  f.type || "image/jpeg",
                  bytes,
                  ""
                );
                if (res.success && res.route) {
                  setRoute(res.route);
                  if (imageInputRef.current) imageInputRef.current.value = "";
                } else {
                  alert(res.error || "Could not upload image.");
                }
              } catch (err) {
                console.error(err);
                alert("Could not upload image.");
              }
            }}
          />
          <small className="route-image-hint">
            You can upload multiple images. Add an optional description to each.
          </small>
        </div>
      </div>

      <div className="route-section">
        <CommentsSection
          comments={route.comments ?? []}
          onAdd={async (comment) => {
            const next = [...(route.comments ?? []), comment];
            const res = await window.electronAPI.saveRoute({ ...route, comments: next });
            if (res.success && res.route) {
              setRoute(res.route);
            } else {
              alert(res.error || "Could not save comment");
            }
          }}
        />
      </div>
    </div>
  );
}