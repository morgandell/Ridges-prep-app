import React, { useEffect, useState } from "react";
import "./weekSchedule.css";
import { WeekStats } from "../types/weekStats";
import { useNavigate } from "react-router-dom";

export default function WeekSchedule() {
  const navigate = useNavigate();
  const [weeks, setWeeks] = useState<WeekStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  const [formData, setFormData] = useState<{
  weekStart: string;
  numberOfCampers: string;
  ageGroup: WeekStats["ageGroup"];
}>({
  weekStart: "",
  numberOfCampers: "",
  ageGroup: "intro",
});


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

  const handleInputChange = (
    field: keyof typeof formData,
    value: string,
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.weekStart) {
      setError("Please select a week start date.");
      return;
    }
    const campers = parseInt(formData.numberOfCampers || "0", 10);
    if (Number.isNaN(campers) || campers <= 0) {
      setError("Number of campers must be a positive number.");
      return;
    }

    const newWeek: WeekStats = {
  id: Date.now().toString(),
  weekStart: formData.weekStart,
  numberOfCampers: campers,
  ageGroup: formData.ageGroup,
  camperRestrictions: [],
  mealsEatingOnTrail: [],
};


    setSaving(true);
    try {
      const result = await window.electronAPI.saveWeekStats(newWeek);
      if (!result.success) {
        setError(result.error || "Failed to save week.");
        return;
      }
      setWeeks(prev => [...prev, newWeek]);
      setShowForm(false);
      setFormData({
        weekStart: "",
        numberOfCampers: "",
        ageGroup: "intro",
      });
    } catch (err: any) {
      console.error("Error saving week:", err);
      setError(
        err?.message || "Unexpected error while saving the week.",
      );
    } finally {
      setSaving(false);
    }
  }

  const formatDate = (iso: string) => {
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

  function countRestrictedCampers(week: WeekStats) {
  return week.camperRestrictions?.filter(
    c => c.restrictions.length > 0
  ).length ?? 0;
}


  return (
    <div className="week-schedule-page">
      <div className="week-schedule-header">
        <h1>Weekly Schedules</h1>
        <button
          className="new-week-button"
          onClick={() => setShowForm(true)}
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
            onClick={() => setShowForm(true)}
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
                  <h3>{formatDate(week.weekStart)}</h3>
                  <span className="week-age-group">
                    {week.ageGroup}
                  </span>
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

      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => !saving && setShowForm(false)}
        >
          <div
            className="modal large"
            onClick={e => e.stopPropagation()}
          >
            <h2>New Week</h2>
            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}
            <form
              className="week-form"
              onSubmit={handleSubmit}
            >
              <div className="form-group">
                <label htmlFor="weekStart">
                  Week starting (Monday)
                </label>
                <input
                  id="weekStart"
                  type="date"
                  value={formData.weekStart}
                  onChange={e =>
                    handleInputChange(
                      "weekStart",
                      e.target.value,
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="campers">Number of campers</label>
                <input
                  id="campers"
                  type="number"
                  min={1}
                  value={formData.numberOfCampers}
                  onChange={e =>
                    handleInputChange(
                      "numberOfCampers",
                      e.target.value,
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="ageGroup">Age group</label>
                <select
                  id="ageGroup"
                  value={formData.ageGroup}
                  onChange={e =>
                    handleInputChange(
                      "ageGroup",
                      e.target.value,
                    )
                  }
                >
                  <option value="intro">Intro</option>
                  <option value="middle school">
                    Middle school
                  </option>
                  <option value="high school">
                    High school
                  </option>
                </select>
              </div>

              

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => !saving && setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save week"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


