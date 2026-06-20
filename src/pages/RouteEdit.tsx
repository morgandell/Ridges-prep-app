import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBinoculars, faCampground, faSignsPost, faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import "leaflet/dist/leaflet.css";
import { Route, RoutePoint, RouteSegment, EvacPoint } from "../types/route";
import {
  getDaysWithStats,
  getLastCampsiteIndex,
  isPickupDay,
} from "../utils/routeDayBreakdown";
import { ItemComment } from "../types/itemComment";
import CommentsSection from "../components/CommentsSection";
import { calculateDriveMileage } from "../utils/driveMileage";
import { getRoutePointColor } from "../utils/routePointColors";
import { getRoutePointMarkerIcon } from "../utils/routeMapMarkers";
import "./styles/RouteEdit.css";

function getPointListLabel(index: number, total: number, customLabel?: string): string {
  const base =
    index === 0 ? "Start" : index === total - 1 ? "End" : `Stop ${index}`;
  const trimmed = customLabel?.trim();
  return trimmed ? `${base} — ${trimmed}` : base;
}


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
function FitBounds({ boundsKey }: { boundsKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (!boundsKey) return;
    const parts = boundsKey.split("|").map((pair) => pair.split(",").map(Number));
    if (parts.length < 2) return;
    const lats = parts.map((p) => p[0]);
    const lngs = parts.map((p) => p[1]);
    const b = new LatLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    );
    map.fitBounds(b, { padding: [50, 50] });
  }, [boundsKey, map]);
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
    transportMode: "park" as "park" | "dropOff",
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
  const [evacPoints, setEvacPoints] = useState<EvacPoint[]>([]);
  const [driveMileageInput, setDriveMileageInput] = useState("");
  const [driveMileageManual, setDriveMileageManual] = useState(false);
  const [calculatedDriveMileage, setCalculatedDriveMileage] = useState<number | null>(null);
  const [driveMileageLoading, setDriveMileageLoading] = useState(false);
  const [driveMileageError, setDriveMileageError] = useState<string | null>(null);
  const [routeComments, setRouteComments] = useState<ItemComment[]>([]);

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
          transportMode: route.transportMode || "park",
        });
        const start = route.startPoint ? { id: route.startPoint.id || "start", lat: route.startPoint.lat, lng: route.startPoint.lng, label: route.startPoint.label, note: route.startPoint.note } : null;
        const end = route.endPoint ? { id: route.endPoint.id || "end", lat: route.endPoint.lat, lng: route.endPoint.lng, label: route.endPoint.label, note: route.endPoint.note } : null;
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
        setEvacPoints(route.evacPoints || []);
        setRouteComments(Array.isArray(route.comments) ? route.comments : []);
        if (typeof route.driveMileage === "number") {
          setDriveMileageInput(String(route.driveMileage));
          setDriveMileageManual(true);
        } else {
          setDriveMileageInput("");
          setDriveMileageManual(false);
        }
        setCalculatedDriveMileage(null);
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

  const boundsKey = useMemo(() => {
    if (allPoints.length < 2) return "";
    return allPoints.map((p) => `${p.lat},${p.lng}`).join("|");
  }, [allPoints]);

  const bounds = useMemo(() => {
    if (!boundsKey) return undefined;
    const parts = boundsKey.split("|").map((pair) => pair.split(",").map(Number));
    const lats = parts.map((p) => p[0]);
    const lngs = parts.map((p) => p[1]);
    return new LatLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    );
  }, [boundsKey]);

  

  const pointsSignature = useMemo(
    () => points.map((p) => `${p.lat},${p.lng}`).join("|"),
    [points],
  );

  // Fetch route geometry when points change (debounced, cancellable)
  useEffect(() => {
    if (points.length < 2) {
      setRouteGeometry([]);
      return;
    }

    const controller = new AbortController();
    const debounceId = window.setTimeout(() => {
      void fetchRouteGeometry(controller.signal);
    }, 450);

    async function fetchRouteGeometry(signal: AbortSignal) {
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
          }),
          signal,
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
          if (signal.aborted) return;
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
        if (signal.aborted) return;
        console.error('Error fetching hiking route:', error);
        setRouteGeometry(allPoints.map(p => [p.lat, p.lng]));
      } finally {
        if (!signal.aborted) setFetchingRoute(false);
      }
    }

    return () => {
      window.clearTimeout(debounceId);
      controller.abort();
      setFetchingRoute(false);
    };
  }, [pointsSignature]);

/** Base location for all drives (camp/office). */
 const BASE_LAT = 43.9281;
 const BASE_LNG = -114.8402;

// const ORS_API_KEY =
//   "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjgzMGYzYWU5NmNkYjQxYjJiNmYwZWQxMmUzYTFhNzYwIiwiaCI6Im11cm11cjY0In0=";
const ORS_API_KEY = atob(
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjgzMGYzYWU5NmNkYjQxYjJiNmYwZWQxMmUzYTFhNzYwIiwiaCI6Im11cm11cjY0In0="
);

async function fetchDrivingDistanceMiles(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<number> {
  const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
      Authorization: "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjgzMGYzYWU5NmNkYjQxYjJiNmYwZWQxMmUzYTFhNzYwIiwiaCI6Im11cm11cjY0In0=",
    },
    body: JSON.stringify({
      coordinates: [
        [fromLng, fromLat],
        [toLng, toLat],
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Drive distance API error: ${response.status}`);
  }

  const data = await response.json();
  const distanceMeters =
    data?.features?.[0]?.properties?.segments?.[0]?.distance ??
    data?.features?.[0]?.properties?.summary?.distance ??
    0;
  return distanceMeters / 1609.344; // meters to miles
}

/**
 * Calculates total driving mileage from base to route points and back.
 * Base: 43.9281° N, 114.8402° W
 * - park: round trip base ↔ start point
 * - dropOff: round trip base ↔ start + round trip base ↔ end
 */
 async function calculateDriveMileage(
  transportMode: "park" | "dropOff",
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<number> {
  const baseToStart = await fetchDrivingDistanceMiles(BASE_LAT, BASE_LNG, startLat, startLng);
  const roundTripStart = baseToStart * 2;

  if (transportMode === "park") {
    return Math.round(roundTripStart * 10) / 10;
  }

  const baseToEnd = await fetchDrivingDistanceMiles(BASE_LAT, BASE_LNG, endLat, endLng);
  const roundTripEnd = baseToEnd * 2;
  return Math.round((roundTripStart + roundTripEnd) * 10) / 10;
}


  function handleUpdateSegment(index: number, field: "mileage" | "elevationGainFt", value: string) {
    const updated = [...segments];
    if (!updated[index]) {
      updated[index] = { mileage: 0, elevationGainFt: 0 };
    }
    updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    setSegments(updated);
  }

  const draftRoute = useMemo((): Route | null => {
    if (!startPoint || !endPoint) return null;
    return {
    id: id || "draft",
    name: formData.name,
    startPoint,
    endPoint,
    stops,
    segments,
  };
}, [startPoint, endPoint, stops, segments, id, formData.name]);

  const daysWithStats = useMemo(
    () => (draftRoute ? getDaysWithStats(draftRoute) : []),
    [draftRoute],
  );

  const lastCampsiteIndex = draftRoute ? getLastCampsiteIndex(draftRoute) : -1;


  // Keep evacPoints array in sync with number of days; default each day to startPoint
  useEffect(() => {
    if (!startPoint) return;
    if (!daysWithStats.length) {
      setEvacPoints([]);
      return;
    }
    setEvacPoints(prev => {
      const next = [...prev];
      for (let i = 0; i < daysWithStats.length; i++) {
        if (!next[i]) {
          next[i] = {
            lat: startPoint.lat,
            lng: startPoint.lng,
            label: startPoint.label,
          };
        }
      }
      if (next.length > daysWithStats.length) {
        next.length = daysWithStats.length;
      }
      return next;
    });
  }, [daysWithStats.length, startPoint?.lat, startPoint?.lng, startPoint?.label]);

  // Fetch suggested drive mileage when start/end points and transport mode are set
  useEffect(() => {
    if (!startPoint || !endPoint) {
      setCalculatedDriveMileage(null);
      setDriveMileageError(null);
      if (!driveMileageManual) setDriveMileageInput("");
      return;
    }
    let cancelled = false;
    setDriveMileageLoading(true);
    setDriveMileageError(null);
    calculateDriveMileage(
      formData.transportMode,
      startPoint.lat,
      startPoint.lng,
      endPoint.lat,
      endPoint.lng
    )
      .then((miles) => {
        if (!cancelled) {
          setCalculatedDriveMileage(miles);
          if (!driveMileageManual) {
            setDriveMileageInput(miles.toFixed(1));
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDriveMileageError(err?.message || "Failed to fetch drive distance");
          setCalculatedDriveMileage(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDriveMileageLoading(false);
      });
    return () => { cancelled = true; };
  }, [
    startPoint?.lat,
    startPoint?.lng,
    endPoint?.lat,
    endPoint?.lng,
    formData.transportMode,
  ]);

  function parseDriveMileageForSave(): number | undefined {
    const trimmed = driveMileageInput.trim();
    if (!trimmed) return undefined;
    const n = parseFloat(trimmed);
    if (Number.isNaN(n) || n < 0) return undefined;
    return Math.round(n * 10) / 10;
  }

  function setEvacPointForDay(dayIndex: number, point: EvacPoint) {
    setEvacPoints(prev => {
      const next = [...prev];
      next[dayIndex] = point;
      return next;
    });
  }

  // Calculate totals
  const totalMiles = segments.reduce((sum, seg) => sum + (seg.mileage || 0), 0);
  const totalElevation = segments.reduce((sum, seg) => sum + (seg.elevationGainFt || 0), 0);

  // Day split preview: same logic as RouteDetail — days break at campsites
  


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
    const transportMode = formData.transportMode;
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
      comments: routeComments.length > 0 ? routeComments : undefined,
      startPoint: {
        id: "start",
        lat: startLat,
        lng: startLng,
        label: start.label?.trim() || undefined,
        note: start.note?.trim() || undefined,
      },
      endPoint: {
        id: "end",
        lat: endLat,
        lng: endLng,
        label: end.label?.trim() || undefined,
        note: end.note?.trim() || undefined,
      },
      stops: routeStops,
      segments: adjustedSegments,
      notes: formData.notes.trim() || undefined,
      ageGroup: formData.ageGroup,
      evacPoints: evacPoints.length ? evacPoints : undefined,
      transportMode,
      driveMileage: parseDriveMileageForSave(),
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

        <div className="radio-toggle">
  <label className={`radio-btn ${formData.ageGroup === "Intro" ? "active" : ""}`}>
    <input
      type="radio"
      name="route-age-group"
      value="Intro"
      checked={formData.ageGroup === "Intro"}
      onChange={() =>
        setFormData((prev) => ({ ...prev, ageGroup: "Intro" }))
      }
    />
     Intro
  </label>

  <label className={`radio-btn ${formData.ageGroup === "Middle School" ? "active" : ""}`}>
    <input
      type="radio"
      name="route-age-group"
      value="Middle School"
      checked={formData.ageGroup === "Middle School"}
      onChange={() =>
        setFormData((prev) => ({ ...prev, ageGroup: "Middle School" }))
      }
    />
     Middle School
  </label>

  <label className={`radio-btn ${formData.ageGroup === "High School" ? "active" : ""}`}>
    <input
      type="radio"
      name="route-age-group"
      value="High School"
      checked={formData.ageGroup === "High School"}
      onChange={() =>
        setFormData((prev) => ({ ...prev, ageGroup: "High School" }))
      }
    />
     High School
  </label>
</div>

         <div className="radio-toggle">
  <div
    className={`radio-btn ${formData.transportMode === "park" ? "active" : ""}`}
    onClick={() =>
      setFormData((prev) => ({ ...prev, transportMode: "park" }))
    }
  >
    Park van at trailhead
  </div>

  <div
    className={`radio-btn ${formData.transportMode === "dropOff" ? "active" : ""}`}
    onClick={() =>
      setFormData((prev) => ({ ...prev, transportMode: "dropOff" }))
    }
  >
    Drop off & pick up
  </div>
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
              keyboard={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                crossOrigin="anonymous"
              />

              <MapClickHandler onMapClick={handleMapClick} />
              {boundsKey && <FitBounds boundsKey={boundsKey} />}

              {allPoints.map((point, i) => {
                const routePoint = points[i];
                const icon = getRoutePointMarkerIcon(
                  i,
                  allPoints.length,
                  routePoint?.type,
                );

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
                  color="var(--color-tagText)"
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
                const color = getRoutePointColor(index, points.length);
                const label = getPointListLabel(index, points.length, point.label);
                return (
                  <div
                    key={point.id}
                    className={`point-chip ${chipClass} ${draggedPoint === index ? "dragging" : ""}`}
                    style={{ borderLeftColor: color }}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <span className="drag-handle">⋮⋮</span>
                    <span
                      className="point-marker-dot"
                      style={{ backgroundColor: color }}
                      title={`Point ${index + 1}`}
                      aria-hidden
                    />
                    <span className="point-label">{label}</span>
                    <span className="point-coords">{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</span>
                    <button type="button" className="remove-chip" onClick={() => handleRemovePoint(index)} aria-label="Remove">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>


        {stops.length > 0 && daysWithStats.length > 0 && (
          <div className="form-section route-by-day-preview">
            <h3>Route by day</h3>
            <p className="day-preview-hint">
              Only campsites end a day. A view can be the last stop shown for a day — the following stops stay on that same day until the next campsite or pick-up.
            </p>
            {daysWithStats.map((day, dayIndex) => {
              const evac = evacPoints[dayIndex];
              const evacLabel =
                evac?.label ||
                (startPoint
                  ? `Lat ${evac?.lat.toFixed(4)}, Lng ${evac?.lng.toFixed(4)}`
                  : "");
              const allRoutePoints: { id: string; label: string; lat: number; lng: number }[] = [];
              if (startPoint) {
                allRoutePoints.push({
                  id: "start",
                  label: startPoint.label || "Start point",
                  lat: startPoint.lat,
                  lng: startPoint.lng,
                });
              }
              stops.forEach((s, idx) => {
                allRoutePoints.push({
                  id: s.id || `stop-${idx}`,
                  label: s.label || `Stop ${idx + 1}`,
                  lat: s.lat,
                  lng: s.lng,
                });
              });
              if (endPoint) {
                allRoutePoints.push({
                  id: "end",
                  label: endPoint.label || "End point",
                  lat: endPoint.lat,
                  lng: endPoint.lng,
                });
              }

              return (
              <div key={dayIndex} className="stops-by-day">
                <div className="day-summary">
                  <h4 className="day-heading">Day {dayIndex + 1}</h4>
                  <div className="day-summary-meta">
                    <span>{day.dayMiles.toFixed(2)} miles</span>
                    <span>{day.dayElevation.toLocaleString()} ft elevation gain</span>
                  </div>
                </div>
                {dayIndex === 0 && startPoint && (
  <div className="stop-details stop-details-editable stop-details-special">
    <h4 className="stop-details-title">
      <FontAwesomeIcon icon={faSignsPost} className="icon-secondary" /> Drop off
      {" ("}{startPoint.lat.toFixed(5)}, {startPoint.lng.toFixed(5)}{")"}
    </h4>

    {/* NO stop type radios */}

    <div className="form-group">
      <label>Label (optional)</label>
      <input
        type="text"
        placeholder="e.g., Trailhead, Parking Lot"
        value={startPoint.label ?? ""}
        onChange={(e) => setPoints((prev) => prev.map((p, i) => (i === 0 ? { ...p, label: e.target.value || undefined } : p)))}
      />
    </div>
    <div className="form-group">
      <label>Note (optional)</label>
      <textarea
        rows={2}
        placeholder="e.g., Meet at north lot, ranger station hours"
        value={startPoint.note ?? ""}
        onChange={(e) => setPoints((prev) => prev.map((p, i) => (i === 0 ? { ...p, note: e.target.value || undefined } : p)))}
      />
    </div>
  </div>
)}
                {day.dayStops.map((stop, indexInDay) => {
                  const globalIndex = day.firstStopIndex + indexInDay;
                  const segment = segments?.[globalIndex];
                  const isCampsite = stop.type === "campsite";
                  const isLastStopInDay = indexInDay === day.dayStops.length - 1;
                  const moreStopsAfter = globalIndex < stops.length - 1;
                  const continuesToPickup =
                    isLastStopInDay &&
                    !isCampsite &&
                    globalIndex === stops.length - 1 &&
                    day.includesPickup;
                  const viewExtendsDay =
                    !isCampsite && isLastStopInDay && (moreStopsAfter || continuesToPickup);
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
                                onChange={() =>
                                  setPoints((prev) =>
                                    prev.map((p) => (p.id === stop.id ? { ...p, type: "view" } : p)),
                                  )
                                }
                              />
                               <FontAwesomeIcon icon={faBinoculars} className="icon-primary" /> View
                            </label>
                          </div>
                          {isCampsite && (
                            <small className="hint">Campsite ends this day.</small>
                          )}
                          {viewExtendsDay && (
                            <small className="hint">
                              {moreStopsAfter
                                ? "This view does not end the day — later stops stay on this day until the next campsite or pick-up."
                                : "This view does not end the day — the trail continues to pick-up on the same day."}
                            </small>
                          )}
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Label (optional)</label>
                        <input
                          type="text"
                          placeholder="e.g., Lake Camp, Summit View"
                          value={stop.label ?? ""}
                          onChange={(e) => setPoints((prev) => prev.map((p) => (p.id === stop.id ? { ...p, label: e.target.value || undefined } : p)))}
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
                {endPoint && isPickupDay(day, dayIndex, daysWithStats) && (() => {
                  const lastMiddleStop = stops.length > 0 ? stops[stops.length - 1] : null;
                  const distanceLabel = lastMiddleStop
                    ? lastMiddleStop.label || `Stop ${stops.length}`
                    : startPoint?.label || "drop off";
                  const pickupLegSegment = day.includesPickup ? segments[stops.length] : null;
                  const pickupMiles = day.isFinalLegDay
                    ? day.dayMiles
                    : pickupLegSegment?.mileage ?? 0;
                  const pickupElevation = day.isFinalLegDay
                    ? day.dayElevation
                    : pickupLegSegment?.elevationGainFt ?? 0;
                  return (
                    <div className="stop-details stop-details-editable stop-details-special">
                      <h4 className="stop-details-title">
                        <FontAwesomeIcon icon={faSignsPost} className="icon-secondary" /> Pick up
                        {" ("}{endPoint.lat.toFixed(5)}, {endPoint.lng.toFixed(5)}{")"}
                      </h4>
                      <div className="form-group">
                        <label>Label (optional)</label>
                        <input
                          type="text"
                          placeholder="e.g., Summit, Parking Lot"
                          value={endPoint?.label ?? ""}
                          onChange={(e) =>
                            setPoints((prev) =>
                              prev.map((p, i) =>
                                i === prev.length - 1
                                  ? { ...p, label: e.target.value || undefined }
                                  : p,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Note (optional)</label>
                        <textarea
                          rows={2}
                          placeholder="e.g., Pick-up time, contact at ranger station"
                          value={endPoint?.note ?? ""}
                          onChange={(e) =>
                            setPoints((prev) =>
                              prev.map((p, i) =>
                                i === prev.length - 1
                                  ? { ...p, note: e.target.value || undefined }
                                  : p,
                              ),
                            )
                          }
                        />
                      </div>
                      {(pickupMiles > 0 || pickupElevation > 0) && (
                        <div className="segment-info">
                          <div>
                            <strong>Distance from {distanceLabel}:</strong> {pickupMiles.toFixed(2)} mi
                          </div>
                          <div>
                            <strong>Elevation gain:</strong> {pickupElevation.toLocaleString()} ft
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="stop-details stop-details-readonly">
                  <h4>
                    <FontAwesomeIcon icon={faCircleExclamation} className="icon-evac" /> Evacuation point
                  </h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Use existing point</label>
                      <select
                        value=""
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const match = allRoutePoints.find(p => p.id === selectedId);
                          if (match) {
                            setEvacPointForDay(dayIndex, {
                              lat: match.lat,
                              lng: match.lng,
                              label: match.label,
                            });
                          }
                        }}
                      >
                        <option value="">
                          {evacLabel ? `Current: ${evacLabel}` : "Select point"}
                        </option>
                        {allRoutePoints.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.label} ({p.lat.toFixed(4)}, {p.lng.toFixed(4)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Custom evac location</label>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={evac?.lat ?? startPoint?.lat ?? ""}
                            onChange={(e) =>
                              setEvacPointForDay(dayIndex, {
                                lat: parseFloat(e.target.value) || 0,
                                lng: evac?.lng ?? startPoint?.lng ?? 0,
                                label: evac?.label,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={evac?.lng ?? startPoint?.lng ?? ""}
                            onChange={(e) =>
                              setEvacPointForDay(dayIndex, {
                                lat: evac?.lat ?? startPoint?.lat ?? 0,
                                lng: parseFloat(e.target.value) || 0,
                                label: evac?.label,
                              })
                            }
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Label (optional)"
                        value={evac?.label || ""}
                        onChange={(e) =>
                          setEvacPointForDay(dayIndex, {
                            lat: evac?.lat ?? startPoint?.lat ?? 0,
                            lng: evac?.lng ?? startPoint?.lng ?? 0,
                            label: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}

        {endPoint && stops.length === 0 && (
          <div className="form-section">
            <h3>Pick up</h3>
            <p className="day-preview-hint">
              Add stops on the map to split the route into days at campsites. You can still name the pick-up point below.
            </p>
            <div className="stop-details stop-details-editable stop-details-special">
              <h4 className="stop-details-title">
                <FontAwesomeIcon icon={faSignsPost} className="icon-secondary" /> Pick up
                {" ("}{endPoint.lat.toFixed(5)}, {endPoint.lng.toFixed(5)}{")"}
              </h4>
              <div className="form-group">
                <label>Label (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Trailhead parking, pick-up lot"
                  value={endPoint.label ?? ""}
                  onChange={(e) =>
                    setPoints((prev) =>
                      prev.map((p, i) =>
                        i === prev.length - 1
                          ? { ...p, label: e.target.value || undefined }
                          : p,
                      ),
                    )
                  }
                />
              </div>
              <div className="form-group">
                <label>Note (optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Pick-up time, contact at ranger station"
                  value={endPoint.note ?? ""}
                  onChange={(e) =>
                    setPoints((prev) =>
                      prev.map((p, i) =>
                        i === prev.length - 1
                          ? { ...p, note: e.target.value || undefined }
                          : p,
                      ),
                    )
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* {endPoint && (
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
                  onChange={(e) => setPoints((prev) => prev.map((p, i) => (i === prev.length - 1 ? { ...p, label: e.target.value || undefined } : p)))}
                  placeholder="e.g., Summit"
                />
              </div>
            </div>
          </div>
        )} */}

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
            {startPoint && endPoint && (
              <div className="total-item total-item-drive-mileage">
                <div className="drive-mileage-field">
                  <label htmlFor="drive-mileage-input">Drive mileage (mi)</label>
                  <span className="total-hint drive-mileage-hint">
                    {formData.transportMode === "park"
                      ? "Round trip: base → start & back"
                      : "Round trip: base → start & end"}
                  </span>
                  <div className="drive-mileage-row">
                    <input
                      id="drive-mileage-input"
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder={driveMileageLoading ? "Calculating…" : "e.g. 120"}
                      value={driveMileageInput}
                      onChange={(e) => {
                        setDriveMileageManual(true);
                        setDriveMileageInput(e.target.value);
                      }}
                    />
                    {calculatedDriveMileage != null && driveMileageManual && (
                      <button
                        type="button"
                        className="use-calculated-drive-btn"
                        onClick={() => {
                          setDriveMileageManual(false);
                          setDriveMileageInput(calculatedDriveMileage.toFixed(1));
                        }}
                      >
                        Use calculated ({calculatedDriveMileage.toFixed(1)} mi)
                      </button>
                    )}
                  </div>
                  {driveMileageLoading && (
                    <span className="drive-mileage-status">Calculating suggested mileage…</span>
                  )}
                  {!driveMileageLoading && calculatedDriveMileage != null && !driveMileageManual && (
                    <span className="drive-mileage-status">
                      Suggested: {calculatedDriveMileage.toFixed(1)} mi (from map)
                    </span>
                  )}
                  {driveMileageError && (
                    <span className="drive-mileage-status drive-mileage-error">{driveMileageError}</span>
                  )}
                </div>
              </div>
            )}
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

        {isEditing && id && (
          <div className="route-edit-comments">
            <CommentsSection
              comments={routeComments}
              onAdd={async (comment) => {
                const next = [...routeComments, comment];
                const start = points[0];
                const end = points.length > 1 ? points[points.length - 1] : null;
                if (!start || !end) {
                  alert("Add start and end points before saving a comment.");
                  return;
                }
                const routeStops = points.slice(1, -1);
                const numSegmentsNeeded = points.length - 1;
                const adjustedSegments = [...segments];
                while (adjustedSegments.length < numSegmentsNeeded) {
                  adjustedSegments.push({ mileage: 0, elevationGainFt: 0 });
                }
                if (adjustedSegments.length > numSegmentsNeeded) {
                  adjustedSegments.splice(numSegmentsNeeded);
                }
                const transportMode = formData.transportMode;
                const routePayload: Route = {
                  id,
                  name: formData.name.trim(),
                  comments: next,
                  startPoint: {
                    id: "start",
                    lat: start.lat,
                    lng: start.lng,
                    label: start.label?.trim() || undefined,
                    note: start.note?.trim() || undefined,
                  },
                  endPoint: {
                    id: "end",
                    lat: end.lat,
                    lng: end.lng,
                    label: end.label?.trim() || undefined,
                    note: end.note?.trim() || undefined,
                  },
                  stops: routeStops,
                  segments: adjustedSegments,
                  notes: formData.notes.trim() || undefined,
                  ageGroup: formData.ageGroup,
                  evacPoints: evacPoints.length ? evacPoints : undefined,
                  transportMode,
                  driveMileage: parseDriveMileageForSave(),
                };
                const res = await window.electronAPI.saveRoute(routePayload);
                if (res.success && res.route) {
                  setRouteComments(res.route.comments ?? next);
                } else {
                  alert(res.error || "Could not save comment");
                }
              }}
            />
          </div>
        )}

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