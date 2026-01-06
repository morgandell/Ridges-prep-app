import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { WeekMealSelection, WeekStats } from "../types/weekStats";
import { Meal } from "../types/meal";
import { DayOfWeek, MealSlot } from "../types/menu";
import "./weekSchedule.css";
import "./weekEdit.css";

export default function WeekEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    weekStart: string;
    numberOfCampers: string;
    ageGroup: WeekStats["ageGroup"];
    dietaryRestrictions: string;
  }>({
    weekStart: "",
    numberOfCampers: "",
    ageGroup: "intro",
    dietaryRestrictions: "",
  });
  const [selectedMeals, setSelectedMeals] = useState<Set<string>>(new Set());
const DAYS: DayOfWeek[] = [
  "sunday","monday","tuesday","wednesday","thursday","friday"
];

const SLOTS: MealSlot[] = ["breakfast","lunch","dinner"];
const [meals, setMeals] = useState<Meal[]>([]);
const [included, setIncluded] = useState<WeekMealSelection[]>([]);


  useEffect(() => {
    async function loadWeek() {
      if (!id) return;
      setLoading(true);
      try {
        const result = await window.electronAPI.getWeekStats();
        if (result.success && result.weeks) {
          const found = result.weeks.find(w => w.id === id);
          if (found) {
            setFormData({
              weekStart: found.weekStart,
              numberOfCampers: found.numberOfCampers.toString(),
              ageGroup: found.ageGroup,
              dietaryRestrictions: found.dietaryRestrictions.join(", "),
              
            });
            setIncluded(found.mealsEatingOnTrail ?? []);
            // setSelectedMeals(new Set(found.mealsEatingOnTrail ?? []));
          }
        }
      } catch (err) {
        console.error("Error loading week:", err);
      } finally {
        setLoading(false);
      }
    }
    loadWeek();
  }, [id]);

  useEffect(() => {
  async function loadMeals() {
    const loadedMeals = await window.electronAPI.getMeals();
    setMeals(loadedMeals);
  }
  loadMeals();
}, []);

useEffect(() => {
  window.electronAPI.getMeals().then(setMeals);
}, []);




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

    const restrictions = formData.dietaryRestrictions
      ? formData.dietaryRestrictions
          .split(",")
          .map(r => r.trim())
          .filter(Boolean)
      : [];

    const updatedWeek: WeekStats = {
      id: id || Date.now().toString(),
      weekStart: formData.weekStart,
      numberOfCampers: campers,
      ageGroup: formData.ageGroup,
      dietaryRestrictions: restrictions,
      mealsEatingOnTrail: included,
    };

    setSaving(true);
    try {
      const result = await window.electronAPI.saveWeekStats(updatedWeek);
      if (!result.success) {
        setError(result.error || "Failed to save week.");
        return;
      }
      navigate(`/weeks/${updatedWeek.id}`);
    } catch (err: any) {
      console.error("Error saving week:", err);
      setError(
        err?.message || "Unexpected error while saving the week.",
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleMeal(mealId: string) {
  setSelectedMeals(prev => {
    const next = new Set(prev);
    next.has(mealId) ? next.delete(mealId) : next.add(mealId);
    return next;
  });
}
function toggleCell(day: DayOfWeek, slot: MealSlot) {
  setIncluded(prev => {
    const exists = prev.find(
      c => c.day === day && c.slot === slot
    );

    if (exists) {
      return prev.filter(c => c !== exists);
    }

    return [
      ...prev,
      {
        day,
        slot,
        mealId: "", // filled later by menu
      },
    ];
  });
}


  if (loading) {
    return <div className="week-schedule-page">Loading...</div>;
  }

  return (
    <div className="week-schedule-page">
      <div className="week-schedule-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>{isEditing ? "Edit Week" : "New Week"}</h1>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <form className="week-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="weekStart">Week starting (Monday)</label>
          <input
            id="weekStart"
            type="date"
            value={formData.weekStart}
            onChange={e =>
              handleInputChange("weekStart", e.target.value)
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
              handleInputChange("numberOfCampers", e.target.value)
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
              handleInputChange("ageGroup", e.target.value)
            }
          >
            <option value="intro">Intro</option>
            <option value="middle school">Middle school</option>
            <option value="high school">High school</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="restrictions">
            Dietary restrictions (comma separated)
          </label>
          <textarea
            id="restrictions"
            rows={3}
            value={formData.dietaryRestrictions}
            onChange={e =>
              handleInputChange(
                "dietaryRestrictions",
                e.target.value,
              )
            }
            placeholder="e.g. vegetarian, nut allergy"
          />
        </div>
<div className="form-group">
  <label>Meals included this week</label>

  <table className="week-grid">
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
            const active = included.some(
              c => c.day === day && c.slot === slot
            );

            return (
              <td
                key={slot}
                className={`week-grid-cell ${active ? "active" : ""}`}
                onClick={() => toggleCell(day, slot)}
              >
                {active ? "✓" : ""}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  </table>

  <small className="hint">
    Select which meal slots will be used during this week.
  </small>
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
            className="submit-button"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save week"}
          </button>
        </div>
      </form>
    </div>
  );
}


