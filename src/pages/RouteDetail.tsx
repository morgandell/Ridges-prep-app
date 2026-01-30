import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Route } from "../types/route";
import "./RouteDetail.css";

// Fix for default marker icons in React-Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icons for start, end, and stops
const startIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const endIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const stopIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Build array of all points in order: start, stops, end
  const allPoints = useMemo(() => {
    const points: Array<{ lat: number; lng: number; label?: string; type: "start" | "stop" | "end"; index?: number }> = [];
    
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

  // Calculate map center and bounds
  const mapCenter: [number, number] = useMemo(() => {
    if (allPoints.length === 0) return [40.7128, -74.0060]; // Default to NYC
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
          <span className="total-value">{totalMiles.toFixed(1)} miles</span>
        </div>
        <div className="total-item">
          <span className="total-label">Total Elevation Gain:</span>
          <span className="total-value">{totalElevation} ft</span>
        </div>
      </div>

      {allPoints.length > 0 && (
        <div className="route-section">
          <h2>Route Map</h2>
          <div className="route-map-container">
            <MapContainer
              center={mapCenter}
              zoom={bounds ? undefined : 13}
              bounds={bounds}
              style={{ height: "500px", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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

              {allPoints.length > 1 && (
                <Polyline
                  positions={allPoints.map(p => [p.lat, p.lng] as [number, number])}
                  color="#3b82f6"
                  weight={4}
                  opacity={0.7}
                />
              )}
            </MapContainer>
          </div>
        </div>
      )}

      <div className="route-section">
        <h2>Start Point</h2>
        <div className="coordinate-display">
          <div><strong>Latitude:</strong> {route.startPoint?.lat?.toFixed(6)}</div>
          <div><strong>Longitude:</strong> {route.startPoint?.lng?.toFixed(6)}</div>
          {route.startPoint?.label && (
            <div><strong>Label:</strong> {route.startPoint.label}</div>
          )}
        </div>
      </div>

      {route.stops && route.stops.length > 0 && (
        <div className="route-section">
          <h2>Stops</h2>
          {route.stops.map((stop, index) => {
            const segment = route.segments?.[index];
            return (
              <div key={index} className="stop-item">
                <h3>Stop {index + 1}{stop.label ? `: ${stop.label}` : ""}</h3>
                <div className="coordinate-display">
                  <div><strong>Latitude:</strong> {stop.lat.toFixed(6)}</div>
                  <div><strong>Longitude:</strong> {stop.lng.toFixed(6)}</div>
                </div>
                {segment && (
                  <div className="segment-info">
                    <div><strong>Mileage to next:</strong> {segment.mileage.toFixed(1)} mi</div>
                    <div><strong>Elevation gain:</strong> {segment.elevationGainFt} ft</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {route.segments && route.segments.length > route.stops.length && (
        <div className="route-section">
          <h2>Final Segment</h2>
          <div className="segment-info">
            <div><strong>Mileage to end:</strong> {route.segments[route.stops.length]?.mileage.toFixed(1)} mi</div>
            <div><strong>Elevation gain:</strong> {route.segments[route.stops.length]?.elevationGainFt} ft</div>
          </div>
        </div>
      )}

      <div className="route-section">
        <h2>End Point</h2>
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
