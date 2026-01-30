import React, { useEffect, useState } from "react";
import { Route, RoutePoint, RouteSegment } from "../types/route";
import "./routes.css";

export default function Routes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    startLat: "",
    startLng: "",
    endLat: "",
    endLng: "",
    notes: "",
  });
  const [stops, setStops] = useState<RoutePoint[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);

  useEffect(() => {
    loadRoutes();
  }, []);

  async function loadRoutes() {
    setLoading(true);
    try {
      const result = await window.electronAPI.getRoutes();
      if (result.success && result.routes) {
        setRoutes(result.routes);
      } else {
        setError(result.error || "Failed to load routes");
      }
    } catch (err) {
      console.error("Error loading routes:", err);
      setError("Failed to load routes");
    } finally {
      setLoading(false);
    }
  }

  function handleNewRoute() {
    setCurrentRoute(null);
    setStops([]);
    setSegments([]);
    setFormData({
      name: "",
      startLat: "",
      startLng: "",
      endLat: "",
      endLng: "",
      notes: "",
    });
  }

  function handleLoadRoute(route: Route) {
    setCurrentRoute(route);
    setStops(route.stops || []);
    setSegments(route.segments || []);
    setFormData({
      name: route.name,
      startLat: route.startPoint?.lat?.toString() || "",
      startLng: route.startPoint?.lng?.toString() || "",
      endLat: route.endPoint?.lat?.toString() || "",
      endLng: route.endPoint?.lng?.toString() || "",
      notes: route.notes || "",
    });
  }

  function handleAddStop() {
    setStops([...stops, { lat: 0, lng: 0, label: "" }]);
    // Add a corresponding segment
    setSegments([...segments, { mileage: 0, elevationGainFt: 0 }]);
  }

  function handleRemoveStop(index: number) {
    setStops(stops.filter((_, i) => i !== index));
    setSegments(segments.filter((_, i) => i !== index));
  }

  function handleUpdateStop(index: number, field: "lat" | "lng" | "label", value: string) {
    const updated = [...stops];
    if (field === "label") {
      updated[index] = { ...updated[index], label: value };
    } else {
      updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    }
    setStops(updated);
  }

  function handleUpdateSegment(index: number, field: "mileage" | "elevationGainFt", value: string) {
    const updated = [...segments];
    updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    setSegments(updated);
  }

  // Calculate totals
  const totalMiles = segments.reduce((sum, seg) => sum + (seg.mileage || 0), 0);
  const totalElevation = segments.reduce((sum, seg) => sum + (seg.elevationGainFt || 0), 0);

  async function handleSaveRoute() {
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

    // Ensure segments array matches stops (need one segment per stop + one for final leg to end)
    const numSegmentsNeeded = stops.length + 1; // One for each stop-to-stop, plus final stop-to-end
    const adjustedSegments = [...segments];
    while (adjustedSegments.length < numSegmentsNeeded) {
      adjustedSegments.push({ mileage: 0, elevationGainFt: 0 });
    }
    // Trim if too many
    if (adjustedSegments.length > numSegmentsNeeded) {
      adjustedSegments.splice(numSegmentsNeeded);
    }

    const route: Route = {
      id: currentRoute?.id || Date.now().toString(),
      name: formData.name.trim(),
      startPoint: { lat: startLat, lng: startLng },
      endPoint: { lat: endLat, lng: endLng },
      stops: stops,
      segments: adjustedSegments,
      notes: formData.notes.trim() || undefined,
    };

    try {
      const result = await window.electronAPI.saveRoute(route);
      if (result.success && result.route) {
        await loadRoutes();
        setCurrentRoute(result.route);
        setError(null);
      } else {
        setError(result.error || "Failed to save route");
      }
    } catch (err) {
      console.error("Error saving route:", err);
      setError("Failed to save route");
    }
  }

  async function handleDeleteRoute(id: string) {
    if (!window.confirm("Are you sure you want to delete this route?")) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteRoute(id);
      if (result.success) {
        await loadRoutes();
        if (currentRoute?.id === id) {
          handleNewRoute();
        }
      } else {
        setError(result.error || "Failed to delete route");
      }
    } catch (err) {
      console.error("Error deleting route:", err);
      setError("Failed to delete route");
    }
  }

  if (loading) {
    return <div className="routes-page"><div className="loading">Loading routes...</div></div>;
  }

  return (
    <div className="routes-page">
      <div className="routes-header">
        <h1>Hiking Routes</h1>
        <button className="new-route-button" onClick={handleNewRoute}>
          + New Route
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="routes-content">
        <div className="routes-sidebar">
          <h2>Saved Routes</h2>
          {routes.length === 0 ? (
            <div className="empty-state">
              <p>No routes saved yet.</p>
              <p>Create a new route to get started!</p>
            </div>
          ) : (
            <div className="routes-list">
              {routes.map(route => {
                const totalMiles = route.segments?.reduce((sum, seg) => sum + (seg.mileage || 0), 0) || 0;
                const totalElevation = route.segments?.reduce((sum, seg) => sum + (seg.elevationGainFt || 0), 0) || 0;
                return (
                  <div key={route.id} className="route-card">
                    <div className="route-card-header">
                      <h3>{route.name}</h3>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteRoute(route.id)}
                        title="Delete route"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="route-card-info">
                      {totalMiles > 0 && (
                        <span className="route-stat">📏 {totalMiles.toFixed(1)} mi</span>
                      )}
                      {totalElevation > 0 && (
                        <span className="route-stat">⛰️ {totalElevation} ft</span>
                      )}
                      {route.stops && route.stops.length > 0 && (
                        <span className="route-stat">📍 {route.stops.length} stops</span>
                      )}
                    </div>
                    <button
                      className="load-route-button"
                      onClick={() => handleLoadRoute(route)}
                    >
                      Load Route
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="routes-main">
          <div className="route-form">
            <h2>{currentRoute ? "Edit Route" : "New Route"}</h2>
            
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

            <div className="form-section">
              <h3>Start Point</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start-lat">Latitude *</label>
                  <input
                    id="start-lat"
                    type="number"
                    step="any"
                    value={formData.startLat}
                    onChange={(e) => setFormData({ ...formData, startLat: e.target.value })}
                    placeholder="e.g., 44.2706"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="start-lng">Longitude *</label>
                  <input
                    id="start-lng"
                    type="number"
                    step="any"
                    value={formData.startLng}
                    onChange={(e) => setFormData({ ...formData, startLng: e.target.value })}
                    placeholder="e.g., -71.3033"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Stops</h3>
              {stops.length === 0 ? (
                <p className="hint">No stops added. Click "Add Stop" to add intermediate points.</p>
              ) : (
                stops.map((stop, index) => (
                  <div key={index} className="stop-item">
                    <div className="stop-header">
                      <h4>Stop {index + 1}</h4>
                      <button
                        className="remove-button"
                        onClick={() => handleRemoveStop(index)}
                        title="Remove stop"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={stop.lat || ""}
                          onChange={(e) => handleUpdateStop(index, "lat", e.target.value)}
                          placeholder="0.0000"
                        />
                      </div>
                      <div className="form-group">
                        <label>Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={stop.lng || ""}
                          onChange={(e) => handleUpdateStop(index, "lng", e.target.value)}
                          placeholder="0.0000"
                        />
                      </div>
                      <div className="form-group">
                        <label>Label (optional)</label>
                        <input
                          type="text"
                          value={stop.label || ""}
                          onChange={(e) => handleUpdateStop(index, "label", e.target.value)}
                          placeholder="e.g., Water source"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Mileage to next point</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={segments[index]?.mileage || ""}
                          onChange={(e) => handleUpdateSegment(index, "mileage", e.target.value)}
                          placeholder="0.0"
                        />
                      </div>
                      <div className="form-group">
                        <label>Elevation Gain (ft)</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={segments[index]?.elevationGainFt || ""}
                          onChange={(e) => handleUpdateSegment(index, "elevationGainFt", e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
              <button
                type="button"
                className="add-stop-button"
                onClick={handleAddStop}
              >
                + Add Stop
              </button>
            </div>

            <div className="form-section">
              <h3>End Point</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="end-lat">Latitude *</label>
                  <input
                    id="end-lat"
                    type="number"
                    step="any"
                    value={formData.endLat}
                    onChange={(e) => setFormData({ ...formData, endLat: e.target.value })}
                    placeholder="e.g., 44.2706"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="end-lng">Longitude *</label>
                  <input
                    id="end-lng"
                    type="number"
                    step="any"
                    value={formData.endLng}
                    onChange={(e) => setFormData({ ...formData, endLng: e.target.value })}
                    placeholder="e.g., -71.3033"
                    required
                  />
                </div>
              </div>
              {stops.length > 0 && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Mileage from last stop to end</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={segments[stops.length]?.mileage || ""}
                      onChange={(e) => handleUpdateSegment(stops.length, "mileage", e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Elevation Gain (ft)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={segments[stops.length]?.elevationGainFt || ""}
                      onChange={(e) => handleUpdateSegment(stops.length, "elevationGainFt", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>

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
                className="save-button"
                onClick={handleSaveRoute}
                disabled={!formData.name.trim() || !formData.startLat || !formData.startLng || !formData.endLat || !formData.endLng}
              >
                {currentRoute ? "Update Route" : "Save Route"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
