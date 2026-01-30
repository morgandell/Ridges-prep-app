import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Route, RoutePoint, RouteSegment } from "../types/route";
import "./RouteEdit.css";

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
  });
  const [stops, setStops] = useState<RoutePoint[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        });
        setStops(route.stops || []);
        setSegments(route.segments || []);
      }
    } catch (error) {
      console.error("Error loading route:", error);
      setError("Failed to load route");
    } finally {
      setLoading(false);
    }
  }

  function handleAddStop() {
    setStops([...stops, { lat: 0, lng: 0, label: "" }]);
    // If this is the first stop, we need to split segment 0 into two segments
    // Otherwise, just add a new segment
    if (stops.length === 0) {
      // We had start->end (segment 0), now we need start->stop0 and stop0->end
      // So we need to keep segment 0 and add segment 1
      setSegments([segments[0] || { mileage: 0, elevationGainFt: 0 }, { mileage: 0, elevationGainFt: 0 }]);
    } else {
      // Add a new segment for the new stop
      setSegments([...segments, { mileage: 0, elevationGainFt: 0 }]);
    }
  }

  function handleRemoveStop(index: number) {
    setStops(stops.filter((_, i) => i !== index));
    // Remove the segment that goes FROM this stop (segment index + 1)
    // If removing the last stop, we also need to merge segments
    if (index === stops.length - 1) {
      // Removing last stop: merge segment[index] and segment[index+1] into segment[index]
      const updated = [...segments];
      if (updated[index] && updated[index + 1]) {
        updated[index] = {
          mileage: (updated[index].mileage || 0) + (updated[index + 1].mileage || 0),
          elevationGainFt: (updated[index].elevationGainFt || 0) + (updated[index + 1].elevationGainFt || 0),
        };
      }
      updated.splice(index + 1, 1);
      setSegments(updated);
    } else {
      // Removing a middle stop: remove segment[index+1] and merge with segment[index]
      const updated = [...segments];
      if (updated[index] && updated[index + 1]) {
        updated[index] = {
          mileage: (updated[index].mileage || 0) + (updated[index + 1].mileage || 0),
          elevationGainFt: (updated[index].elevationGainFt || 0) + (updated[index + 1].elevationGainFt || 0),
        };
      }
      updated.splice(index + 1, 1);
      setSegments(updated);
    }
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
        lat: startLat,
        lng: startLng,
        label: formData.startLabel.trim() || undefined,
      },
      endPoint: {
        lat: endLat,
        lng: endLng,
        label: formData.endLabel.trim() || undefined,
      },
      stops: stops,
      segments: adjustedSegments,
      notes: formData.notes.trim() || undefined,
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
            <div className="form-group">
              <label htmlFor="start-label">Label (optional)</label>
              <input
                id="start-label"
                type="text"
                value={formData.startLabel}
                onChange={(e) => setFormData({ ...formData, startLabel: e.target.value })}
                placeholder="e.g., Trailhead"
              />
            </div>
          </div>
          {stops.length === 0 ? (
            <div className="form-row">
              <div className="form-group">
                <label>Mileage to end</label>
                <input
                  type="number"
                  step="0.1"
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
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label>Mileage to first stop</label>
                <input
                  type="number"
                  step="0.1"
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
                    type="button"
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
                    <label>Mileage to {index === stops.length - 1 ? "end" : "next stop"}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={segments[index + 1]?.mileage || ""}
                      onChange={(e) => handleUpdateSegment(index + 1, "mileage", e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Elevation Gain (ft)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={segments[index + 1]?.elevationGainFt || ""}
                      onChange={(e) => handleUpdateSegment(index + 1, "elevationGainFt", e.target.value)}
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
            <div className="form-group">
              <label htmlFor="end-label">Label (optional)</label>
              <input
                id="end-label"
                type="text"
                value={formData.endLabel}
                onChange={(e) => setFormData({ ...formData, endLabel: e.target.value })}
                placeholder="e.g., Summit"
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
