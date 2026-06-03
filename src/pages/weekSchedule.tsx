import React, { useEffect, useState } from "react";
import "./styles/weekSchedule.css";
import { WeekStats } from "../types/weekStats";
import { useNavigate } from "react-router-dom";
import { formatLocalDate } from "../utils/formatLocalDate";

export default function WeekSchedule() {
  const navigate = useNavigate();
  const [weeks, setWeeks] = useState<WeekStats[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    loadWeeks();
  }, []);

  async function loadWeeks() {
    try {
      const result = await window.electronAPI.getWeekStats();
      if (result.success && result.weeks) {
        setWeeks(result.weeks);
      } else {
        console.error("Failed to load week stats:", result.error);
      }
    } catch (err) {
      console.error("Unexpected error loading week stats:", err);
    } finally {
      setLoading(false);
    }
  }

  

  function countRestrictedCampers(week: WeekStats) {
  return week.camperRestrictions?.filter(
    c => c.restrictions.length > 0
  ).length ?? 0;
}

  async function handleDeleteWeek(
    e: React.MouseEvent,
    week: WeekStats,
  ) {
    e.stopPropagation();
    if (
      !window.confirm(
        `Delete week starting ${formatLocalDate(week.weekStart)}?`,
      )
    ) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteWeekStats(week.id);
      if (result.success) {
        setWeeks(prev => prev.filter(w => w.id !== week.id));
      } else {
        alert("Failed to delete week: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error deleting week:", err);
      alert("Failed to delete week");
    }
  }


  return (
    <div className="week-schedule-page">
      <div className="week-schedule-header">
        <h1>Weekly Schedules</h1>
        <button
          className="new-week-button"
          onClick={() => navigate("/weeks/new")}
        >
          + New Week
        </button>
      </div>

      {loading ? (
        <div className="week-schedule-loading">Loading weeks...</div>
      ) : weeks.length === 0 ? (
        <div className="week-schedule-empty">
          <p>No weeks created yet.</p>
          <button
            className="new-week-button"
            onClick={() => navigate("/weeks/new")}
          >
            Create first week
          </button>
        </div>
      ) : (
        <div className="week-card-grid">
          {weeks
            .slice()
            .sort((a, b) =>
              a.weekStart.localeCompare(b.weekStart),
            )
            .map(week => (
              <div
                key={week.id}
                className="week-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/weeks/${week.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/weeks/${week.id}`);
                  }
                }}
              >
                <div className="week-card-header">
                  <h3>{formatLocalDate(week.weekStart)}</h3>
                  <div className="week-card-header-actions">
                    <span className="week-age-group">
                      {week.ageGroup}
                    </span>
                    <button
                      type="button"
                      className="week-card-delete"
                      aria-label={`Delete week ${formatLocalDate(week.weekStart)}`}
                      onClick={(e) => handleDeleteWeek(e, week)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="week-card-body">
                  <p>
                    <strong>Campers:</strong>{" "}
                    {week.numberOfCampers}
                  </p>
                  <p>
                    <strong>Trail meals:</strong>{" "}
                    {week.mealsEatingOnTrail.length}
                  </p>
                  {countRestrictedCampers(week) > 0 && (
  <p className="week-card-restrictions">
    <strong>Campers w/ restrictions:</strong>{" "}
    {countRestrictedCampers(week)}
  </p>
)}

                </div>
              </div>
            ))}
        </div>
      )}

      
      
    </div>
  );

}
