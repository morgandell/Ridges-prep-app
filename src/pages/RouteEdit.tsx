import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from "react-leaflet";
import { LatLngBounds, divIcon } from "leaflet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBinoculars, faCampground, faSignsPost } from "@fortawesome/free-solid-svg-icons";
import "leaflet/dist/leaflet.css";
import { Route, RoutePoint, RouteSegment } from "../types/route";
import "./RouteEdit.css";


// Create custom colored div icons
const startIcon = divIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: var(--color-breakfast);
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

function makeStopIcon(iconClass: string, color = "#3b82f6") {
  return divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <i class="${iconClass}" style="
          color: white;
          font-size: 14px;
          transform: rotate(45deg);
        "></i>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}

const campsiteIcon = makeStopIcon("fa-solid fa-campground", "#a31676");
const poiIcon = makeStopIcon("fa-solid fa-binoculars", "#3b82f6");


// Component to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to fit bounds
function FitBounds({ bounds }: { bounds: LatLngBounds | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function RouteEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: "",
    notes: "",
    ageGroup: "" as "Intro" | "Middle School" | "High School",
  });
  // Single ordered list: first = start, last = end, middle = stops. Add by clicking in order; reorder any point.
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const startPoint = points[0];
  const endPoint = points.length > 1 ? points[points.length - 1] : null;
  const stops = points.length <= 2 ? [] : points.slice(1, -1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const [draggedPoint, setDraggedPoint] = useState<number | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      loadRoute();
    }
  }, [id, isEditing]);

  async function loadRoute() {
    if (!id) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.getRoute(id);
      if (result.success && result.route) {
        const route = result.route;
        setFormData({
          name: route.name,
          notes: route.notes || "",
          ageGroup: route.ageGroup || "Middle School",
        });
        const start = route.startPoint ? { id: route.startPoint.id || "start", lat: route.startPoint.lat, lng: route.startPoint.lng, label: route.startPoint.label } : null;
        const end = route.endPoint ? { id: route.endPoint.id || "end", lat: route.endPoint.lat, lng: route.endPoint.lng, label: route.endPoint.label } : null;
        const midStops = (route.stops || [])
          .filter((s): s is RoutePoint & { stopType?: string } => s != null && typeof s === "object")
          .map((s) => {
            const type = s.type ?? (s as RoutePoint & { stopType?: string }).stopType ?? "view";
            const { stopType: _st, ...rest } = s;
            return { ...rest, type: type as "campsite" | "view" };
          });
        if (start && end) {
          setPoints([start, ...midStops, end]);
        } else if (start) {
          setPoints([start]);
        } else {
          setPoints([]);
        }
        setSegments(route.segments || []);
      }
    } catch (error) {
      console.error("Error loading route:", error);
      setError("Failed to load route");
    } finally {
      setLoading(false);
    }
  }

  function handleMapClick(lat: number, lng: number) {
    // Add next point in order: 1st = start, 2nd = end, 3rd+ = stop
    const isStop = points.length >= 2;
    const newPoint: RoutePoint = {
      id: `point-${Date.now()}-${points.length}`,
      lat,
      lng,
      label: "",
      type: isStop ? "view" : undefined,
    };
    setPoints((prev) => [...prev, newPoint]);
    if (points.length >= 1) {
      setSegments((prev) => [...prev, { mileage: 0, elevationGainFt: 0 }]);
    }
  }

  function handleRemovePoint(index: number) {
    if (index < 0 || index >= points.length) return;
    const newPoints = points.filter((_, i) => i !== index);
    setPoints(newPoints);
    if (index === 0) {
      setSegments(segments.slice(1));
    } else if (index === points.length - 1) {
      setSegments(segments.slice(0, -1));
    } else {
      const merged = {
        mileage: (segments[index - 1]?.mileage || 0) + (segments[index]?.mileage || 0),
        elevationGainFt: (segments[index - 1]?.elevationGainFt || 0) + (segments[index]?.elevationGainFt || 0),
      };
      setSegments([...segments.slice(0, index - 1), merged, ...segments.slice(index + 1)]);
    }
  }

  function handleDragStart(index: number) {
    setDraggedPoint(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (draggedPoint === null || draggedPoint === dropIndex) {
      setDraggedPoint(null);
      return;
    }
    const newPoints = [...points];
    const [moved] = newPoints.splice(draggedPoint, 1);
    newPoints.splice(dropIndex, 0, moved);
    setPoints(newPoints);
    setDraggedPoint(null);
    // Segments no longer match point order; reset and let route fetch refill
    setSegments(newPoints.length <= 1 ? [] : newPoints.slice(0, -1).map(() => ({ mileage: 0, elevationGainFt: 0 })));
  }

  function handleMarkerDragEnd(index: number, lat: number, lng: number) {
    setPoints((prev) => prev.map((p, i) => (i === index ? { ...p, lat, lng } : p)));
  }

  // Build array of all points for map display (same order as points; type by position)
  const allPoints = useMemo(() => {
    return points.map((p, i) => ({
      ...p,
      type: i === 0 ? "start" : i === points.length - 1 ? "end" : "stop",
      index: i === 0 || i === points.length - 1 ? undefined : i - 1,
    })) as Array<{ lat: number; lng: number; type: "start" | "stop" | "end"; index?: number }>;
  }, [points]);

  // Calculate map center and bounds
  const mapCenter: [number, number] = useMemo(() => {
    if (allPoints.length === 0) return [43.9274, -114.838]; // Salt Lake City default
    const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length;
    return [avgLat, avgLng];
  }, [allPoints]);

  const bounds = useMemo(() => {
    if (allPoints.length < 2) return undefined;
    const lats = allPoints.map(p => p.lat);
    const lngs = allPoints.map(p => p.lng);
    return new LatLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  }, [allPoints]);

  // Fetch route geometry when points change
  useEffect(() => {
    async function fetchRouteGeometry() {
      if (allPoints.length < 2) {
        setRouteGeometry([]);
        return;
      }

      setFetchingRoute(true);
      try {
        // Use OpenRouteService for hiking trails
        const coordinates = allPoints.map(p => [p.lng, p.lat]);
        
        const url = 'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson';
        
        console.log('Fetching hiking route from OpenRouteService');
        
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
            elevation: true  // Request elevation data
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        console.log('OpenRouteService response:', data);

        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const geometry = feature.geometry.coordinates;
          
          // Convert [lng, lat] to [lat, lng] for Leaflet
          const leafletCoords: [number, number][] = geometry.map((coord: number[]) => [coord[1], coord[0]]);
          console.log('Hiking route geometry points:', leafletCoords.length);
          setRouteGeometry(leafletCoords);

          // Extract segments data (distance and elevation between waypoints)
          const summary = feature.properties.summary;
          const segmentsData = feature.properties.segments;
          
          console.log('Segments data:', segmentsData);
          console.log('Summary:', summary);
          
          if (segmentsData && segmentsData.length > 0) {
            const newSegments: RouteSegment[] = [];
            
            // Each segment in the response represents the route between consecutive waypoints
            segmentsData.forEach((segment: any) => {
              console.log('Processing segment:', segment);
              
              // Distance is in KILOMETERS, convert to miles
              const distanceMeters = segment.distance || 0;
              const distanceInMiles = distanceMeters / 1609.344;

              
              // Elevation is in meters, convert to feet
              const elevationGainFt = Math.round((segment.ascent || 0) * 3.28084);
              
              console.log(`Distance: ${distanceMeters}m = ${distanceInMiles.toFixed(2)}mi, Elevation: ${segment.ascent}m = ${elevationGainFt}ft`);
              
              newSegments.push({
                mileage: parseFloat(distanceInMiles.toFixed(2)),
                elevationGainFt: elevationGainFt
              });
            });
            
            console.log('Auto-filled segments:', newSegments);
            
            // Make sure we have the right number of segments
            // We need stops.length + 1 segments (one for each leg of the journey)
            const numSegmentsNeeded = allPoints.length - 1;
            while (newSegments.length < numSegmentsNeeded) {
              newSegments.push({ mileage: 0, elevationGainFt: 0 });
            }
            
            setSegments(newSegments);
          } else if (summary) {
            // Fallback: if no segment data, use summary for total and divide evenly
            const totalDistanceInMiles =
               (summary.distance || 0) / 1609.344; // km to miles
            const totalElevationFt = Math.round((summary.ascent || 0) * 3.28084);
            const numSegmentsNeeded = allPoints.length - 1;
            
            const newSegments: RouteSegment[] = [];
            for (let i = 0; i < numSegmentsNeeded; i++) {
              newSegments.push({
                mileage: parseFloat((totalDistanceInMiles / numSegmentsNeeded).toFixed(2)),
                elevationGainFt: Math.round(totalElevationFt / numSegmentsNeeded)
              });
            }
            
            console.log('Using summary data, segments:', newSegments);
            setSegments(newSegments);
          }
        } else {
          console.warn('No hiking route found, using straight lines');
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

  function handleUpdateSegment(index: number, field: "mileage" | "elevationGainFt", value: string) {
    const updated = [...segments];
    if (!updated[index]) {
      updated[index] = { mileage: 0, elevationGainFt: 0 };
    }
    updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    setSegments(updated);
  }

  // Calculate totals
  const totalMiles = segments.reduce((sum, seg) => sum + (seg.mileage || 0), 0);
  const totalElevation = segments.reduce((sum, seg) => sum + (seg.elevationGainFt || 0), 0);

  // Day split preview: same logic as RouteDetail — days break at campsites
  const stopsByDay = useMemo(() => {
    if (!stops?.length) return [];
    const days: RoutePoint[][] = [];
    let currentDay: RoutePoint[] = [];
    for (const stop of stops) {
      currentDay.push(stop);
      if (stop.type === "campsite") {
        days.push([...currentDay]);
        currentDay = [];
      }
    }
    if (currentDay.length > 0) days.push(currentDay);
    let lastCampIdx = -1;
    for (let i = stops.length - 1; i >= 0; i--) {
      if (stops[i].type === "campsite") {
        lastCampIdx = i;
        break;
      }
    }
    if (lastCampIdx >= 0 && stops.slice(lastCampIdx + 1).length === 0) {
      days.push([]);
    }
    return days;
  }, [stops]);

  const lastCampsiteIndex = useMemo(() => {
    if (!stops?.length) return -1;
    for (let i = stops.length - 1; i >= 0; i--) {
      if (stops[i].type === "campsite") return i;
    }
    return -1;
  }, [stops]);

  const daysWithStats = useMemo(() => {
    if (!stops?.length || !segments?.length || !stopsByDay.length) return [];
    const segs = segments;
    return stopsByDay.map((dayStops, dayIndex) => {
      const isFinalLegDay = dayStops.length === 0 && lastCampsiteIndex >= 0;
      const firstStopIndex = dayStops.length > 0 ? stops.indexOf(dayStops[0]) : lastCampsiteIndex + 1;
      const lastStopIndex = dayStops.length > 0 ? stops.indexOf(dayStops[dayStops.length - 1]) : -1;
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
  }, [stops, segments, stopsByDay, lastCampsiteIndex]);

  const getNextInstruction = () => {
    if (points.length === 0) return "Click on the map to add the first point (start)";
    if (points.length === 1) return "Click to add the second point (end). Add more clicks for stops in between.";
    return "Click to add another stop, or drag points in the list to reorder (including start/end).";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Route name is required");
      return;
    }

    if (points.length < 2) {
      setError("Add at least two points (start and end) on the map");
      return;
    }

    const start = points[0];
    const end = points[points.length - 1];
    const startLat = start.lat;
    const startLng = start.lng;
    const endLat = end.lat;
    const endLng = end.lng;
    const routeStops = points.slice(1, -1);

    // Ensure segments array matches: one per leg (points.length - 1)
    const numSegmentsNeeded = points.length - 1;
    const adjustedSegments = [...segments];
    while (adjustedSegments.length < numSegmentsNeeded) {
      adjustedSegments.push({ mileage: 0, elevationGainFt: 0 });
    }
    if (adjustedSegments.length > numSegmentsNeeded) {
      adjustedSegments.splice(numSegmentsNeeded);
    }

    const route: Route = {
      id: id || `route-${Date.now()}`,
      name: formData.name.trim(),
      startPoint: {
        id: "start",
        lat: startLat,
        lng: startLng,
        label: start.label?.trim() || undefined,
      },
      endPoint: {
        id: "end",
        lat: endLat,
        lng: endLng,
        label: end.label?.trim() || undefined,
      },
      stops: routeStops,
      segments: adjustedSegments,
      notes: formData.notes.trim() || undefined,
      ageGroup: formData.ageGroup,
    };

    setSaving(true);
    try {
      const result = await window.electronAPI.saveRoute(route);
      if (result.success && result.route) {
        navigate(`/routes/${result.route.id}`, { state: { fromEdit: true } });
      } else {
        setError(result.error || "Failed to save route");
      }
    } catch (err) {
      console.error("Error saving route:", err);
      setError("Failed to save route");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="route-edit">Loading route...</div>;
  }

  return (
    <div className="route-edit">
      <div className="route-edit-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>{isEditing ? "Edit Route" : "New Route"}</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form className="route-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="route-name">Route Name *</label>
          <input
            id="route-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Mount Washington Trail"
            required
          />
        </div>

        <div className="radio-group">
      <label>
        <input
          type="radio"
          name={`age-group${formData.name}`}
      
          value="Intro"
          checked={formData.ageGroup === "Intro"}
          onChange={() => setFormData((prev) => ({ ...prev, ageGroup: "Intro" }))}
        />
        🧒 Intro
      </label>

      <label>
        <input
          type="radio"
          name={`age-group${formData.name}`}
          value="Middle School"
          checked={formData.ageGroup === "Middle School"}
          onChange={() => {
            setFormData((prev) => ({ ...prev, ageGroup: "Middle School" }));
          }}
        />
        👨‍🎓 Middle School
      </label>

      <label>
        <input
          type="radio"
          name={`age-group${formData.name}`}
          value="High School"
          checked={formData.ageGroup === "High School"}
          onChange={() => {
            setFormData((prev) => ({ ...prev, ageGroup: "High School" }));
          }}
        />
        🎓 High School
      </label>
          </div>

        {/* MAP SECTION AT TOP */}
        <div className="map-section-top">
          <div className="map-instruction-banner">
            <div className="instruction-icon">📍</div>
            <div className="instruction-text">{getNextInstruction()}</div>
          </div>

          <div className="route-map-container">
            <MapContainer
              center={mapCenter}
              zoom={allPoints.length === 0 ? 10 : undefined}
              bounds={bounds}
              style={{ height: "500px", width: "100%", borderRadius: "8px" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                crossOrigin="anonymous"
              />

              <MapClickHandler onMapClick={handleMapClick} />
              {bounds && <FitBounds bounds={bounds} />}

              {allPoints.map((point, i) => {
                const icon =
                  point.type === "start"
                    ? startIcon
                    : point.type === "end"
                    ? endIcon
                    : campsiteIcon;

                return (
                  <Marker
                    key={points[i]?.id ?? i}
                    position={[point.lat, point.lng]}
                    icon={icon}
                    draggable
                    eventHandlers={{
                      dragend: (e) => {
                        const latlng = e.target.getLatLng();
                        handleMarkerDragEnd(i, latlng.lat, latlng.lng);
                      },
                    }}
                  />
                );
              })}

              {allPoints.length > 1 && routeGeometry.length > 0 && (
                <Polyline
                  positions={routeGeometry}
                  color="#3b82f6"
                  weight={4}
                  opacity={0.8}
                />
              )}

              {fetchingRoute && allPoints.length > 1 && (
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
                  Finding trail route...
                </div>
              )}
            </MapContainer>
          </div>

          {/* Visual point list — all points in order; drag to reorder (including start/end) */}
          <div className="points-summary">
            <p className="points-instruction">{getNextInstruction()}</p>
            <div className="points-list">
              {points.map((point, index) => {
                const isStart = index === 0;
                const isEnd = index === points.length - 1;
                const chipClass = isStart ? "start-chip" : isEnd ? "end-chip" : "stop-chip";
                const label = isStart ? "Start" : isEnd ? "End" : `Stop ${index}`;
                const marker = isStart ? "🟢" : isEnd ? "🔴" : "🔵";
                return (
                  <div
                    key={point.id}
                    className={`point-chip ${chipClass} ${draggedPoint === index ? "dragging" : ""}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <span className="drag-handle">⋮⋮</span>
                    <span className="point-marker">{marker}</span>
                    <span className="point-label">{label}</span>
                    <span className="point-coords">{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</span>
                    <button type="button" className="remove-chip" onClick={() => handleRemovePoint(index)} aria-label="Remove">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* POINT DETAILS */}
        {startPoint && (
          <div className="form-section">
            <h3>🟢 Start Point Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Latitude</label>
                <input type="number" step="any" value={startPoint.lat} readOnly />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input type="number" step="any" value={startPoint.lng} readOnly />
              </div>
              <div className="form-group">
                <label>Label (optional)</label>
                <input
                  type="text"
                  value={startPoint.label ?? ""}
                  onChange={(e) => setPoints((prev) => prev.map((p, i) => (i === 0 ? { ...p, label: e.target.value.trim() || undefined } : p)))}
                  placeholder="e.g., Trailhead"
                />
              </div>
            </div>
            {points.length >= 2 && (
              <div className="form-row">
                <div className="form-group">
                  <label>Distance to {stops.length > 0 ? "first stop" : "end"} (miles)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={segments[0]?.mileage ?? ""}
                    onChange={(e) => handleUpdateSegment(0, "mileage", e.target.value)}
                    placeholder="0.0"
                  />
                </div>
                <div className="form-group">
                  <label>Elevation Gain (ft)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={segments[0]?.elevationGainFt ?? ""}
                    onChange={(e) => handleUpdateSegment(0, "elevationGainFt", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {stops.length > 0 && daysWithStats.length > 0 && (
          <div className="form-section route-by-day-preview">
            <h3>Route by day</h3>
            <p className="day-preview-hint">Days are split at campsites. Edit each stop below; changing type to Campsite updates the day breakdown.</p>
            {daysWithStats.map((day, dayIndex) => (
              <div key={dayIndex} className="stops-by-day">
                <div className="day-summary">
                  <h4 className="day-heading">Day {dayIndex + 1}</h4>
                  <div className="day-summary-meta">
                    <span>{day.dayMiles.toFixed(2)} miles</span>
                    <span>{day.dayElevation.toLocaleString()} ft elevation gain</span>
                  </div>
                </div>
                {dayIndex === 0 && (
                  <div className="stop-details stop-details-readonly">
                    <h4><FontAwesomeIcon icon={faSignsPost} className="icon-secondary" /> Drop off: {startPoint?.label || "Start"}{" "}({startPoint?.lat.toFixed(6)}, {startPoint?.lng.toFixed(6)})</h4>
                  </div>
                )}
                {day.isFinalLegDay && (() => {
                  const segment = segments?.[lastCampsiteIndex + 1];
                  const lastCamp = lastCampsiteIndex >= 0 ? stops[lastCampsiteIndex] : null;
                  if (!segment || !lastCamp) return null;
                  return (
                    <div className="stop-details stop-details-readonly">
                      <h4>
                        <FontAwesomeIcon icon={faSignsPost} className="icon-secondary" /> Pick up
                        {endPoint?.label ? `: ${endPoint.label}` : ""}{" "}
                        ({endPoint?.lat.toFixed(6)}, {endPoint?.lng.toFixed(6)})
                      </h4>
                      <div className="segment-info">
                        <div><strong>Distance from {lastCamp.label || "last campsite"}:</strong> {segment.mileage.toFixed(2)} mi</div>
                        <div><strong>Elevation gain:</strong> {segment.elevationGainFt.toLocaleString()} ft</div>
                      </div>
                    </div>
                  );
                })()}
                {day.dayStops.map((stop, indexInDay) => {
                  const globalIndex = day.firstStopIndex + indexInDay;
                  const segment = segments?.[globalIndex];
                  const isCampsite = stop.type === "campsite";
                  const fromPoint = globalIndex === 0 ? { label: startPoint?.label || "Start" } : stops[globalIndex - 1];
                  return (
                    <div key={stop.id} className="stop-details stop-details-editable">
                      <h4 className="stop-details-title">
                        {isCampsite ? <FontAwesomeIcon icon={faCampground} className="icon-secondary" /> : <FontAwesomeIcon icon={faBinoculars} className="icon-secondary" />}
                        {" "}Stop {globalIndex + 1} {" ("} {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)} {")"}
                      </h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Stop Type</label>
                          <div className="radio-group">
                            <label>
                              <input
                                type="radio"
                                name={`stop-type-${stop.id}`}
                                value="campsite"
                                checked={stop.type === "campsite"}
                                onChange={() => setPoints((prev) => prev.map((p) => (p.id === stop.id ? { ...p, type: "campsite" } : p)))}
                              />
                              <FontAwesomeIcon icon={faCampground} className="icon-primary" /> Campsite
                            </label>
                            <label>
                              <input
                                type="radio"
                                name={`stop-type-${stop.id}`}
                                value="view"
                                checked={stop.type === "view"}
                                onChange={() => setPoints((prev) => prev.map((p) => (p.id === stop.id ? { ...p, type: "view" } : p)))}
                              />
                               <FontAwesomeIcon icon={faBinoculars} className="icon-primary" /> View
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Label (optional)</label>
                        <input
                          type="text"
                          placeholder="e.g., Lake Camp, Summit View"
                          value={stop.label || ""}
                          onChange={(e) => setPoints((prev) => prev.map((p) => (p.id === stop.id ? { ...p, label: e.target.value.trim() || undefined } : p)))}
                        />
                      </div>
                      {segment && (
                        <div className="segment-info">
                          <div>Distance from {fromPoint?.label || (globalIndex === 0 ? "start" : `stop ${globalIndex}`)}: {segment.mileage.toFixed(2)} mi</div>
                          <div>Elevation gain: {segment.elevationGainFt.toLocaleString()} ft</div>
                        </div>
                      )}
                      <div className="form-group">
                        <label>Stop Note (optional)</label>
                        <textarea
                          rows={2}
                          placeholder="Water source, tent sites, exposure, etc."
                          value={stop.note || ""}
                          onChange={(e) => setPoints((prev) => prev.map((p) => (p.id === stop.id ? { ...p, note: e.target.value } : p)))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {endPoint && (
          <div className="form-section">
            <h3>🔴 End Point Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Latitude</label>
                <input type="number" step="any" value={endPoint.lat} readOnly />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input type="number" step="any" value={endPoint.lng} readOnly />
              </div>
              <div className="form-group">
                <label>Label (optional)</label>
                <input
                  type="text"
                  value={endPoint.label ?? ""}
                  onChange={(e) => setPoints((prev) => prev.map((p, i) => (i === prev.length - 1 ? { ...p, label: e.target.value.trim() || undefined } : p)))}
                  placeholder="e.g., Summit"
                />
              </div>
            </div>
          </div>
        )}

        <div className="totals-section">
          <h3>Route Totals</h3>
          <div className="totals-display">
            <div className="total-item">
              <span className="total-label">Total Distance:</span>
              <span className="total-value">{totalMiles.toFixed(1)} miles</span>
            </div>
            <div className="total-item">
              <span className="total-label">Total Elevation Gain:</span>
              <span className="total-value">{totalElevation} ft</span>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Add notes about water sources, campsites, hazards, etc."
            rows={4}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="save-button"
            disabled={saving || !formData.name.trim() || points.length < 2}
          >
            {saving ? "Saving..." : isEditing ? "Update Route" : "Save Route"}
          </button>
        </div>
      </form>
    </div>
  );
}