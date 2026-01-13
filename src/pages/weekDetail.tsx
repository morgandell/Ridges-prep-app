import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DayOfWeek, MealSlot } from "../types/menu";
import "./weekDetail.css";
import { WeekStats } from "../types/weekStats";

export default function WeekDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [week, setWeek] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);
  const DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];


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

  function isIncluded(day: DayOfWeek, slot: MealSlot) {
  return week?.mealsEatingOnTrail?.some(
    m => m.day === day && m.slot === slot
  );
}

function groupRestrictions(
  campers: WeekStats["camperRestrictions"]
) {
  const map = new Map<string, number>();

  campers.forEach(camper => {
    camper.restrictions.forEach(r => {
      map.set(r, (map.get(r) ?? 0) + 1);
    });
  });

  return Array.from(map.entries());
}


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

{week.camperRestrictions?.length > 0 && (
  <div className="week-section">
    <h2>Camper Dietary Restrictions</h2>

    <div className="camper-restrictions">
      {week.camperRestrictions.map(camper => (
        <div key={camper.id} className="camper-card">
          <strong className="camper-name">{camper.name}</strong>

          {camper.restrictions.length > 0 ? (
            <ul className="restriction-list">
              {camper.restrictions.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <span className="no-restrictions">No restrictions</span>
          )}
        </div>
      ))}
    </div>
  </div>
)}

{week.camperRestrictions?.length > 0 && (
  <div className="week-section">
    <h2>Restriction Summary</h2>
    <ul className="restriction-summary">
      {groupRestrictions(week.camperRestrictions).map(
        ([restriction, count]) => (
          <li key={restriction}>
            {restriction} — {count} camper{count !== 1 && "s"}
          </li>
        )
      )}
    </ul>
  </div>
)}


     {week.mealsEatingOnTrail?.length > 0 && (
  <div className="week-section">
    <h2>Meals Included This Week</h2>

    <table className="week-grid read-only">
      <thead>
        <tr>
          <th />
          {SLOTS.map(slot => (
            <th key={slot}>{slot.toUpperCase()}</th>
          ))}
        </tr>
      </thead>

      <tbody>
        {DAYS.map(day => (
          <tr key={day}>
            <td className="day">{day.toUpperCase()}</td>

            {SLOTS.map(slot => {
              const active = isIncluded(day, slot);

              return (
                <td
                  key={slot}
                  className={`week-grid-cell ${active ? "active" : ""}`}
                >
                  {active ? "✓" : ""}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

    </div>
  );
}



