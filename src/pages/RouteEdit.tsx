import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from "react-leaflet";
import { LatLngBounds, divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Route, RoutePoint, RouteSegment } from "../types/route";
import "./RouteEdit.css";


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
    startLat: "",
    startLng: "",
    startLabel: "",
    endLat: "",
    endLng: "",
    endLabel: "",
    notes: "",
    ageGroup: "" as "Intro" | "Middle School" | "High School",
  });
  const [stops, setStops] = useState<RoutePoint[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const [draggedPoint, setDraggedPoint] = useState<number | "start" | "end" | null>(null);

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
          startLat: route.startPoint?.lat?.toString() || "",
          startLng: route.startPoint?.lng?.toString() || "",
          startLabel: route.startPoint?.label || "",
          endLat: route.endPoint?.lat?.toString() || "",
          endLng: route.endPoint?.lng?.toString() || "",
          endLabel: route.endPoint?.label || "",
          notes: route.notes || "",
          ageGroup:
            route.ageGroup || "Middle School",
        });
        setStops((route.stops || []).map((s) => {
          const type = s.type ?? (s as { stopType?: string }).stopType ?? "view";
          const { stopType: _st, ...rest } = s as RoutePoint & { stopType?: string };
          return { ...rest, type: type as "campsite" | "view" };
        }));
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
    // Sequential point placement
    if (!formData.startLat || !formData.startLng) {
      // Set start point
      setFormData({ ...formData, startLat: lat.toString(), startLng: lng.toString() });
    } else if (!formData.endLat || !formData.endLng) {
      // Set end point
      setFormData({ ...formData, endLat: lat.toString(), endLng: lng.toString() });
      // Initialize first segment
      if (segments.length === 0) {
        setSegments([{ mileage: 0, elevationGainFt: 0 }]);
      }
    } else {
      // Add stop before the end point
      const newStop: RoutePoint = { lat, lng, label: "", type: "campsite", id: Date.now().toString() };
      setStops([...stops, newStop]);
      // Add segment for this new stop
      setSegments([...segments, { mileage: 0, elevationGainFt: 0 }]);
    }
  }

  function handleRemovePoint(type: "start" | "end" | number) {
    if (type === "start") {
      // Clear start point
      setFormData({ ...formData, startLat: "", startLng: "", startLabel: "" });
      // Also clear everything else since start is required first
      setFormData({ name: formData.name, startLat: "", startLng: "", startLabel: "", endLat: "", endLng: "", endLabel: "", notes: formData.notes, ageGroup: formData.ageGroup });
      setStops([]);
      setSegments([]);
    } else if (type === "end") {
      // Clear end point
      setFormData({ ...formData, endLat: "", endLng: "", endLabel: "" });
    } else {
      // Remove stop at index
      const newStops = stops.filter((_, i) => i !== type);
      setStops(newStops);
      // Adjust segments
      const newSegments = [...segments];
      newSegments.splice(type + 1, 1);
      setSegments(newSegments);
    }
  }

  function handleDragStart(type: "start" | "end" | number) {
    setDraggedPoint(type);
  }

  function handleDragOver(e: React.DragEvent, type: "start" | "end" | number) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent, dropTargetType: "start" | "end" | number) {
    e.preventDefault();
    
    if (draggedPoint === null || draggedPoint === dropTargetType) return;
    
    // Can only reorder stops, not start/end
    if (typeof draggedPoint === "number" && typeof dropTargetType === "number") {
      const newStops = [...stops];
      const [draggedStop] = newStops.splice(draggedPoint, 1);
      newStops.splice(dropTargetType, 0, draggedStop);
      setStops(newStops);
      
      // Also reorder the corresponding segments
      const newSegments = [...segments];
      const [draggedSegment] = newSegments.splice(draggedPoint + 1, 1);
      newSegments.splice(dropTargetType + 1, 0, draggedSegment);
      setSegments(newSegments);
    }
    
    setDraggedPoint(null);
  }

  function handleMarkerDragEnd(index: number | "start" | "end", lat: number, lng: number) {
    if (index === "start") {
      setFormData({ ...formData, startLat: lat.toString(), startLng: lng.toString() });
    } else if (index === "end") {
      setFormData({ ...formData, endLat: lat.toString(), endLng: lng.toString() });
    } else {
      const newStops = [...stops];
      newStops[index] = { ...newStops[index], lat, lng };
      setStops(newStops);
    }
  }

  // Build array of all points for map display
  const allPoints = useMemo(() => {
    const points: Array<{ lat: number; lng: number; type: "start" | "stop" | "end"; index?: number }> = [];
    
    if (formData.startLat && formData.startLng) {
      points.push({ 
        lat: parseFloat(formData.startLat) || 0, 
        lng: parseFloat(formData.startLng) || 0, 
        type: "start" 
      });
    }
    
    stops.forEach((stop, index) => {
      points.push({ ...stop, type: "stop", index });
    });
    
    if (formData.endLat && formData.endLng) {
      points.push({ 
        lat: parseFloat(formData.endLat) || 0, 
        lng: parseFloat(formData.endLng) || 0, 
        type: "end" 
      });
    }
    
    return points;
  }, [formData.startLat, formData.startLng, formData.endLat, formData.endLng, stops]);

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

  // Get next instruction text
  const getNextInstruction = () => {
    if (!formData.startLat || !formData.startLng) {
      return "Click on the map to set your START point";
    } else if (!formData.endLat || !formData.endLng) {
      return "Click on the map to set your END point";
    } else {
      return "Click on the map to add stops between start and end";
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Route name is required");
      return;
    }

    const startLat = parseFloat(formData.startLat);
    const startLng = parseFloat(formData.startLng);
    const endLat = parseFloat(formData.endLat);
    const endLng = parseFloat(formData.endLng);

    if (isNaN(startLat) || isNaN(startLng)) {
      setError("Start point coordinates are required");
      return;
    }

    if (isNaN(endLat) || isNaN(endLng)) {
      setError("End point coordinates are required");
      return;
    }

    // Ensure segments array matches: one per stop + one for final leg to end
    const numSegmentsNeeded = stops.length + 1;
    const adjustedSegments = [...segments];
    while (adjustedSegments.length < numSegmentsNeeded) {
      adjustedSegments.push({ mileage: 0, elevationGainFt: 0 });
    }
    if (adjustedSegments.length > numSegmentsNeeded) {
      adjustedSegments.splice(numSegmentsNeeded);
    }

    const route: Route = {
      id: id || Date.now().toString(),
      name: formData.name.trim(),
      startPoint: {
        id: "start",
        lat: startLat,
        lng: startLng,
        label: formData.startLabel.trim() || undefined,
      },
      endPoint: {
        id: "end",
        lat: endLat,
        lng: endLng,
        label: formData.endLabel.trim() || undefined,
      },
      stops: stops,
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
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          onChange={() => setFormData({ ...formData, ageGroup: "Intro" })}
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
            setFormData({ ...formData, ageGroup: "Middle School" });
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
            setFormData({ ...formData, ageGroup: "High School" });
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
                    : stopIcon;

                const index =
                  point.type === "start"
                    ? "start"
                    : point.type === "end"
                    ? "end"
                    : point.index!;

                return (
                  <Marker
                    key={i}
                    position={[point.lat, point.lng]}
                    icon={icon}
                    draggable
                    eventHandlers={{
                      dragend: (e) => {
                        const latlng = e.target.getLatLng();
                        handleMarkerDragEnd(index as any, latlng.lat, latlng.lng);
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

          {/* Visual point list */}
          <div className="points-summary">
            <div className="points-list">
              {formData.startLat && formData.startLng && (
                <div className="point-chip start-chip">
                  <span className="point-marker">🟢</span>
                  <span className="point-label">Start</span>
                  <span className="point-coords">{parseFloat(formData.startLat).toFixed(4)}, {parseFloat(formData.startLng).toFixed(4)}</span>
                  <button type="button" className="remove-chip" onClick={() => handleRemovePoint("start")}>✕</button>
                </div>
              )}
              
              {stops.map((stop, index) => (
                <div 
                  key={index} 
                  className={`point-chip stop-chip ${draggedPoint === index ? 'dragging' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <span className="drag-handle">⋮⋮</span>
                  <span className="point-marker">🔵</span>
                  <span className="point-label">Stop {index + 1}</span>
                  <span className="point-coords">{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</span>
                  <button type="button" className="remove-chip" onClick={() => handleRemovePoint(index)}>✕</button>
                </div>
              ))}

              {formData.endLat && formData.endLng && (
                <div className="point-chip end-chip">
                  <span className="point-marker">🔴</span>
                  <span className="point-label">End</span>
                  <span className="point-coords">{parseFloat(formData.endLat).toFixed(4)}, {parseFloat(formData.endLng).toFixed(4)}</span>
                  <button type="button" className="remove-chip" onClick={() => handleRemovePoint("end")}>✕</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* POINT DETAILS */}
        {formData.startLat && formData.startLng && (
          <div className="form-section">
            <h3>🟢 Start Point Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.startLat}
                  onChange={(e) => setFormData({ ...formData, startLat: e.target.value })}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.startLng}
                  onChange={(e) => setFormData({ ...formData, startLng: e.target.value })}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Label (optional)</label>
                <input
                  type="text"
                  value={formData.startLabel}
                  onChange={(e) => setFormData({ ...formData, startLabel: e.target.value })}
                  placeholder="e.g., Trailhead"
                />
              </div>
            </div>
            {formData.endLat && formData.endLng && (
              <div className="form-row">
                <div className="form-group">
                  <label>Distance to {stops.length > 0 ? "first stop" : "end"} (miles)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={segments[0]?.mileage || ""}
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
                    value={segments[0]?.elevationGainFt || ""}
                    onChange={(e) => handleUpdateSegment(0, "elevationGainFt", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {stops.map((stop, index) => (
          <div key={index} className="form-section">
            <h3>🔵 Stop {index + 1} Details</h3>
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
          onChange={() => {
            setStops(
              stops.map((s) =>
                s.id === stop.id ? { ...s, type: "campsite" } : s
              )
            );
          }}
        />
        🏕 Campsite
      </label>

      <label>
        <input
          type="radio"
          name={`stop-type-${stop.id}`}
          value="view"
          checked={stop.type === "view"}
          onChange={() => {
            setStops(
              stops.map((s) =>
                s.id === stop.id ? { ...s, type: "view" } : s
              )
            );
          }}
        />
        👀 View
      </label>
    </div>
  </div>
</div>

<div className="form-row">
  <div className="form-group">
    <label>Latitude</label>
    <div className="form-value">{stop.lat.toFixed(5)}</div>
  </div>

  <div className="form-group">
    <label>Longitude</label>
    <div className="form-value">{stop.lng.toFixed(5)}</div>
  </div>
</div>
{/* <div className="form-row">
  <div className="form-group">
    <label>Distance</label>
    <div className="form-value">
      {stop.distanceMiles != null
        ? `${stop.distanceMiles.toFixed(2)} mi`
        : "—"}
    </div>
  </div>

  <div className="form-group">
    <label>Elevation Gain</label>
    <div className="form-value">
      {stop.elevationGainFt != null
        ? `${stop.elevationGainFt} ft`
        : "—"}
    </div>
  </div>
</div> */}


<div className="form-group">
  <label>Stop Note (optional)</label>
  <textarea
    rows={2}
    placeholder="Water source, tent sites, exposure, etc."
    value={stop.note || ""}
    onChange={(e) => {
      const value = e.target.value;
      setStops(
        stops.map((s) =>
          s.id === stop.id ? { ...s, note: value } : s
        )
      );
    }}
  />
</div>

          </div>
        ))}

        {formData.endLat && formData.endLng && (
          <div className="form-section">
            <h3>🔴 End Point Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.endLat}
                  onChange={(e) => setFormData({ ...formData, endLat: e.target.value })}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.endLng}
                  onChange={(e) => setFormData({ ...formData, endLng: e.target.value })}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Label (optional)</label>
                <input
                  type="text"
                  value={formData.endLabel}
                  onChange={(e) => setFormData({ ...formData, endLabel: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
            disabled={saving || !formData.name.trim() || !formData.startLat || !formData.startLng || !formData.endLat || !formData.endLng}
          >
            {saving ? "Saving..." : isEditing ? "Update Route" : "Save Route"}
          </button>
        </div>
      </form>
    </div>
  );
}