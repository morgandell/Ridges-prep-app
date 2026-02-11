import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBounds, divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Route, RoutePoint } from "../types/route";
import "./RouteDetail.css";

// Fix for default marker icons in React-Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Create custom colored div icons
const startIcon = divIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: #22c55e;
    width: 30px;
    height: 30px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const endIcon = divIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: #ef4444;
    width: 30px;
    height: 30px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const stopIcon = divIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: #3b82f6;
    width: 30px;
    height: 30px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [fetchingRoute, setFetchingRoute] = useState(false);

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

  const stopsByDay = useMemo(() => {
  if (!route?.stops?.length) return [];
  const days: RoutePoint[][] = [];
  let currentDay: RoutePoint[] = [];
  for (const stop of route.stops) {
    currentDay.push(stop);
    const isCampsite = stop.type === "campsite";
    if (isCampsite) {
      days.push([...currentDay]);
      currentDay = [];
    }
  }
  if (currentDay.length > 0) days.push(currentDay);
  
  // Add a final day for the leg from last campsite to endpoint
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
      days.push([]); // last stop is campsite → add empty "day" for campsite → end
    }
  }
  return days;
}, [route]);

const lastCampsiteIndex = useMemo(() => {
  if (!route?.stops) return -1;
  for (let i = route.stops.length - 1; i >= 0; i--) {
    if (route.stops[i].type === "campsite") {
      return i;
    }
  }
  return -1;
}, [route?.stops]);

  // Per-day stats: segment indices and summed distance/elevation for each day
  const daysWithStats = useMemo(() => {
    if (!route?.stops?.length || !route?.segments?.length || !stopsByDay.length) return [];
    const segs = route.segments;
    return stopsByDay.map((dayStops, dayIndex) => {
      const isFinalLegDay = dayStops.length === 0 && lastCampsiteIndex >= 0;
      const firstStopIndex = dayStops.length > 0 ? route.stops!.indexOf(dayStops[0]) : lastCampsiteIndex + 1;
      const lastStopIndex = dayStops.length > 0 ? route.stops!.indexOf(dayStops[dayStops.length - 1]) : -1;
      const startSeg = dayIndex === 0 ? 0 : isFinalLegDay ? lastCampsiteIndex + 1 : firstStopIndex;
      const endSeg = isFinalLegDay ? segs.length - 1 : lastStopIndex;
      let dayMiles = 0;
      let dayElevation = 0;
      for (let i = startSeg; i <= endSeg && i < segs.length; i++) {
        dayMiles += segs[i].mileage || 0;
        dayElevation += segs[i].elevationGainFt || 0;
      }
      return {
        dayStops,
        firstStopIndex: dayStops.length > 0 ? firstStopIndex : lastCampsiteIndex + 1,
        lastStopIndex,
        dayMiles,
        dayElevation,
        isFinalLegDay,
      };
    });
  }, [route?.stops, route?.segments, stopsByDay, lastCampsiteIndex]);


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
          <button className="edit-button" onClick={handleEdit}>
            Edit
          </button>
          <button className="delete-button" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

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
                let icon = stopIcon;
                let popupText = "";
                
                if (point.type === "start") {
                  icon = startIcon;
                  popupText = `Start${point.label ? `: ${point.label}` : ""}\n${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
                } else if (point.type === "end") {
                  icon = endIcon;
                  popupText = `End${point.label ? `: ${point.label}` : ""}\n${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
                } else {
                  popupText = `Stop ${(point.index || 0) + 1}${point.label ? `: ${point.label}` : ""}\n${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
                }

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
              <h3 className="day-heading">Day {dayIndex + 1}</h3>
              <div className="day-summary">
                <span>{day.dayMiles.toFixed(2)} miles</span>
                <span>{day.dayElevation.toLocaleString()} ft elevation gain</span>
              </div>
              {dayIndex === 0 && (
                <div className="day-start-block">
                  <h4>🟢 Start</h4>
                  <div className="coordinate-display coordinate-compact">
                    <div><strong>Lat:</strong> {route.startPoint?.lat?.toFixed(6)} <strong>Lng:</strong> {route.startPoint?.lng?.toFixed(6)}</div>
                    {route.startPoint?.label && <div><strong>Label:</strong> {route.startPoint.label}</div>}
                  </div>
                </div>
              )}
              {dayIndex > 0 && !day.isFinalLegDay && (
                <div className="day-campsite-labels">
                  <div className="day-label-row">
                    <strong>Starting at:</strong>{" "}
                    {(() => {
                      const prev = stopsByDay[dayIndex - 1];
                      const lastPrev = prev?.[prev.length - 1];
                      if (!lastPrev) return "—";
                      const idx = route.stops!.indexOf(lastPrev) + 1;
                      return `Stop ${idx}${lastPrev.label ? ` — ${lastPrev.label}` : ""} (campsite)`;
                    })()}
                  </div>
                  <div className="day-label-row">
                    <strong>Ending at:</strong>{" "}
                    {(() => {
                      const lastStop = day.dayStops[day.dayStops.length - 1];
                      if (!lastStop) return "—";
                      const idx = route.stops!.indexOf(lastStop) + 1;
                      return `Stop ${idx}${lastStop.label ? ` — ${lastStop.label}` : ""} (campsite)`;
                    })()}
                  </div>
                </div>
              )}
              {day.isFinalLegDay && (
                <div className="day-campsite-labels">
                  <div className="day-label-row">
                    <strong>Starting at:</strong>{" "}
                    {(() => {
                      const lastCamp = route.stops![lastCampsiteIndex];
                      if (!lastCamp) return "—";
                      const idx = lastCampsiteIndex + 1;
                      return `Stop ${idx}${lastCamp.label ? ` — ${lastCamp.label}` : ""} (campsite)`;
                    })()}
                  </div>
                  <div className="day-label-row">
                    <strong>Ending at:</strong> End point
                  </div>
                </div>
              )}
              {day.isFinalLegDay && (
                <div className="day-start-block">
                  <h4>🔴 End Point</h4>
                  <div className="coordinate-display coordinate-compact">
                    <div><strong>Lat:</strong> {route.endPoint?.lat?.toFixed(6)} <strong>Lng:</strong> {route.endPoint?.lng?.toFixed(6)}</div>
                    {route.endPoint?.label && <div><strong>Label:</strong> {route.endPoint.label}</div>}
                  </div>
                </div>
              )}
              {day.dayStops.map((stop, indexInDay) => {
                const globalIndex = day.firstStopIndex + indexInDay;
                const segment = route.segments?.[globalIndex + 1];
                const isCampsite = (stop as RoutePoint).type === "campsite";
                return (
                  <div key={globalIndex} className="stop-item">
                    <h4>
                      {isCampsite ? "🏕 " : "🔵 "}
                      Stop {globalIndex + 1}{stop.label ? `: ${stop.label}` : ""}
                      {isCampsite ? " (Campsite)" : ""}
                    </h4>
                    <div className="coordinate-display">
                      <div><strong>Latitude:</strong> {stop.lat.toFixed(6)}</div>
                      <div><strong>Longitude:</strong> {stop.lng.toFixed(6)}</div>
                      <div><strong>Label:</strong> {stop.label || "—"}</div>
                    </div>
                    {segment && (
                      <div className="segment-info">
                        <div><strong>Distance to {globalIndex === route.stops!.length - 1 ? "end" : `stop ${globalIndex + 2}`}:</strong> {segment.mileage.toFixed(2)} mi</div>
                        <div><strong>Elevation gain:</strong> {segment.elevationGainFt.toLocaleString()} ft</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="route-section">
            <h2>🟢 Start Point</h2>
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
          </div>
          {route.stops && route.stops.length > 0 && (
            <div className="route-section">
              <h2>Stops</h2>
              {route.stops.map((stop, index) => {
                const segment = route.segments?.[index + 1];
                return (
                  <div key={index} className="stop-item">
                    <h3>🔵 Stop {index + 1}{stop.label ? `: ${stop.label}` : ""}</h3>
                    <div className="coordinate-display">
                      <div><strong>Latitude:</strong> {stop.lat.toFixed(6)}</div>
                      <div><strong>Longitude:</strong> {stop.lng.toFixed(6)}</div>
                      <div><strong>Label:</strong> {stop.label || "—"}</div>
                    </div>
                    {segment && (
                      <div className="segment-info">
                        <div><strong>Distance to {index === route.stops.length - 1 ? "end" : `stop ${index + 2}`}:</strong> {segment.mileage.toFixed(2)} mi</div>
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

      <div className="route-section">
        <h2>🔴 End Point</h2>
        <div className="coordinate-display">
          <div><strong>Latitude:</strong> {route.endPoint?.lat?.toFixed(6)}</div>
          <div><strong>Longitude:</strong> {route.endPoint?.lng?.toFixed(6)}</div>
          {route.endPoint?.label && (
            <div><strong>Label:</strong> {route.endPoint.label}</div>
          )}
        </div>
      </div>

      {route.notes && (
        <div className="route-section">
          <h2>Notes</h2>
          <p className="route-notes">{route.notes}</p>
        </div>
      )}
    </div>
  );
}