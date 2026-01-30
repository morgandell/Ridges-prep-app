import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Route } from "../types/route";
import "./RouteDetail.css";

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
