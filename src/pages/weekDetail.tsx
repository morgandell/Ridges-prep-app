import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./weekDetail.css";
import { WeekStats } from "../types/weekStats";

export default function WeekDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [week, setWeek] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWeek() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const result = await window.electronAPI.getWeekStats();
        if (result.success && result.weeks) {
          const found = result.weeks.find(w => w.id === id);
          setWeek(found || null);
        }
      } catch (err) {
        console.error("Error loading week:", err);
      } finally {
        setLoading(false);
      }
    }
    loadWeek();
  }, [id]);

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return <div className="week-detail">Loading...</div>;
  }

  if (!week) {
    return (
      <div className="week-detail">
        <h1>Week not found</h1>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  return (
    <div className="week-detail">
      <div className="week-detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="week-actions">
          <button
            className="edit-button"
            onClick={() => navigate(`/weeks/${week.id}/edit`)}
          >
            Edit
          </button>
        </div>
      </div>

      <div className="week-header">
        <h1>{formatDate(week.weekStart)}</h1>
        <span className="week-age-chip">{week.ageGroup}</span>
      </div>

      <div className="week-meta">
        <span>Campers: {week.numberOfCampers}</span>
        <span>Trail meals: {week.mealsEatingOnTrail?.length ?? 0}</span>
      </div>

      {week.dietaryRestrictions?.length > 0 && (
        <div className="week-section">
          <h2>Dietary Restrictions</h2>
          <ul className="week-restrictions">
            {week.dietaryRestrictions.map((r, i) => (
              <li key={`${r}-${i}`}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {week.mealsEatingOnTrail?.length > 0 && (
        <div className="week-section">
          <h2>Meals on Trail</h2>
          <ul className="week-meals">
            {week.mealsEatingOnTrail.map(meal => (
              <li key={meal.id}>{meal.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


