import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CamperRestriction, WeekMealSelection, WeekStats } from "../types/weekStats";
import { Meal } from "../types/meal";
import { DayOfWeek, MealSlot, Menu } from "../types/menu";
import { Route } from "../types/route";
import "./weekSchedule.css";
import "./weekEdit.css";
import { PRESET_DIETARY_RESTRICTIONS } from "../constants/tags";

export default function WeekEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campers, setCampers] = useState<CamperRestriction[]>([]);
  const [formData, setFormData] = useState<{
    weekStart: string;
    numberOfCampers: string;
    ageGroup: WeekStats["ageGroup"];    
    team: WeekStats["team"];
  }>({
    weekStart: "",
    numberOfCampers: "",
    ageGroup: "intro",
    team: "A",
  });
  const [selectedMeals, setSelectedMeals] = useState<Set<string>>(new Set());
const DAYS: DayOfWeek[] = [
  "sunday","monday","tuesday","wednesday","thursday","friday"
];

const SLOTS: MealSlot[] = ["breakfast","lunch","dinner"];
const [meals, setMeals] = useState<Meal[]>([]);
const [included, setIncluded] = useState<WeekMealSelection[]>([]);
const [menu, setMenu] = useState<Menu | null>(null);
const [mealOverrides, setMealOverrides] = useState<
  NonNullable<WeekStats["mealOverrides"]>
  >({});
const [swappingMeal, setSwappingMeal] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
const [routes, setRoutes] = useState<Route[]>([]);
const [routeId, setRouteId] = useState<string>("");


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
              team: found.team || "A",
            });
            setIncluded(found.mealsEatingOnTrail ?? []);
            setMealOverrides(found.mealOverrides || {});
            setRouteId(found.routeId ? String(found.routeId) : "");
           setCampers(
  found.camperRestrictions.map(c => ({
    ...c,
    draftRestriction: "",
  }))
);


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
  async function loadData() {
    const [loadedMeals, loadedMenu, routesResult] = await Promise.all([
      window.electronAPI.getMeals(),
      window.electronAPI.getMenu(),
      window.electronAPI.getRoutes(),
    ]);
    setMeals(loadedMeals);
    setMenu(loadedMenu);
    if (routesResult?.success && routesResult.routes) {
      setRoutes(routesResult.routes);
    } else {
      setRoutes([]);
    }
  }
  loadData();
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
    const campersCount = parseInt(formData.numberOfCampers || "0", 10);
    if (Number.isNaN(campersCount) || campersCount <= 0) {
      setError("Number of campers must be a positive number.");
      return;
    }


    const updatedWeek: WeekStats = {
      id: id || Date.now().toString(),
      weekStart: formData.weekStart,
      numberOfCampers: campersCount,
      ageGroup: formData.ageGroup,
      team: formData.team,
      camperRestrictions: campers,
      routeId: routeId || null,
      mealsEatingOnTrail: included,
      mealOverrides: Object.keys(mealOverrides).length > 0 ? mealOverrides : undefined,
    };

    setSaving(true);
    try {
      const result = await window.electronAPI.saveWeekStats(updatedWeek);
      if (!result.success) {
        setError(result.error || "Failed to save week.");
        return;
      }
      navigate(`/weeks/${updatedWeek.id}`, { state: { fromEdit: true } });
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

function addRestriction(camperId: string) {
  setCampers(prev =>
    prev.map(c => {
      if (c.id !== camperId) return c;

      const value = c.draftRestriction.trim();
      if (!value || c.restrictions.includes(value)) {
        return { ...c, draftRestriction: "" };
      }

      return {
        ...c,
        restrictions: [...c.restrictions, value],
        draftRestriction: "",
      };
    })
  );
}

function removeRestriction(camperId: string, value: string) {
  setCampers(prev =>
    prev.map(c =>
      c.id === camperId
        ? {
            ...c,
            restrictions: c.restrictions.filter(r => r !== value),
          }
        : c
    )
  );
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
          <label htmlFor="team">Team</label>
          <select
            id="team"
            value={formData.team}
            onChange={e => handleInputChange("team", e.target.value)}
          >
            <option value="A">Team A</option>
            <option value="B">Team B</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="routeId">Assigned route (optional)</label>
          <select
            id="routeId"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
          >
            <option value="">No route assigned</option>
            {routes
              .slice()
              .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
              .map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
          <small className="hint">
            Each week can have one route. You’ll see a preview on the week details page.
          </small>
        </div>

       <div className="form-group">
  <label>Camper dietary restrictions</label>

  {campers.map(camper => (
    <div key={camper.id} className="camper-details">
    <div className="camper-row">
      <button
        type="button"
        className="remove-button"
        onClick={() =>
          setCampers(prev =>
            prev.filter(c => c.id !== camper.id)
          )
        }
      >
        ✕
      </button>
      <input
        type="text"
        placeholder="Camper name"
        value={camper.name}
        onChange={e =>
          setCampers(prev =>
            prev.map(c =>
              c.id === camper.id
                ? { ...c, name: e.target.value }
                : c
            )
          )
        }
      />

<div className="preset-tags">
  {PRESET_DIETARY_RESTRICTIONS.map(tag => {
    const isSelected = camper.restrictions.includes(tag);

    return (
      <button
        key={tag}
        type="button"
        className={`preset-tag-btn ${isSelected ? "selected" : ""}`}
        onClick={() => {
          setCampers(prev =>
            prev.map(c =>
              c.id === camper.id
                ? {
                    ...c,
                    restrictions: isSelected
                      ? c.restrictions.filter(t => t !== tag)
                      : [...c.restrictions, tag],
                  }
                : c
            )
          );
        }}
      >
        {tag}
      </button>
    );
  })}
</div>

      <div className="restriction-input">
  <input
    type="text"
    placeholder="Add restriction"
    value={camper.draftRestriction}
    onChange={e =>
      setCampers(prev =>
        prev.map(c =>
          c.id === camper.id
            ? { ...c, draftRestriction: e.target.value }
            : c
        )
      )
    }
    onKeyDown={e => {
      if (e.key === "Enter") {
        e.preventDefault();
        addRestriction(camper.id);
      }
    }}
  />

  <button
    type="button"
    className="add-button"
    onClick={() => addRestriction(camper.id)}
  >
    Add
  </button>
</div>
</div>
<div className="restriction-tags">
  {camper.restrictions.map(r => (
    <span key={r} className="restriction-tag">
      {r}
      <button
        type="button"
        className="remove-button"
        onClick={() => removeRestriction(camper.id, r)}
      >
        ✕
      </button>
    </span>
  ))}
</div>

    </div>
  ))}

  <button
    type="button"
    className="add-camper-button"
    onClick={() =>
      setCampers(prev => [
        ...prev,
        {
  id: crypto.randomUUID(),
  name: "",
  restrictions: [],
  draftRestriction: "",
},

      ])
    }
  >
    + Add camper
  </button>

  <small className="hint">
    Multiple campers can share the same restriction.
  </small>
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

<div className="form-group">
  <label>Week-specific meal swaps</label>
  <p className="hint">Override meals from the main menu for this week only. Click a meal to swap it.</p>
  {menu && (
    <table className="week-menu-table">
      <thead>
        <tr>
          <th>Day</th>
          {SLOTS.map(slot => (
            <th key={slot}>{slot.charAt(0).toUpperCase() + slot.slice(1)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {DAYS.map(day => (
          <tr key={day}>
            <td className="day">{day.charAt(0).toUpperCase() + day.slice(1)}</td>
            {SLOTS.map(slot => {
              const overrideMealId = mealOverrides[day]?.[slot];
              const menuMealId = menu.days[day]?.[slot];
              const currentMealId = overrideMealId || menuMealId;
              const currentMeal = meals.find(m => m.id === currentMealId);
              const isSwapping = swappingMeal?.day === day && swappingMeal?.slot === slot;
              const hasOverride = !!overrideMealId;

              return (
                <td key={slot} className={`menu-swap-cell ${hasOverride ? "overridden" : ""}`}>
                  {isSwapping ? (
                    <div className="meal-swap-selector">
                      <select
                        value={overrideMealId || ""}
                        onChange={(e) => {
                          const newMealId = e.target.value || undefined;
                          setMealOverrides(prev => {
                            const updated = { ...prev };
                            if (!updated[day]) updated[day] = {};
                            if (newMealId) {
                              updated[day][slot] = newMealId;
                            } else {
                              delete updated[day][slot];
                              if (Object.keys(updated[day]).length === 0) {
                                delete updated[day];
                              }
                            }
                            return Object.keys(updated).length > 0 ? updated : {};
                          });
                          setSwappingMeal(null);
                        }}
                        onBlur={() => setSwappingMeal(null)}
                        autoFocus
                      >
                        <option value="">Use menu default</option>
                        {meals
                          .filter(m => m.mealTime === slot || slot === "dinner")
                          .map(meal => (
                            <option key={meal.id} value={meal.id}>
                              {meal.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setSwappingMeal(null)}
                        className="cancel-swap-button"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      className="meal-swap-display"
                      onClick={() => setSwappingMeal({ day, slot })}
                      title="Click to swap meal"
                    >
                      {currentMeal ? (
                        <>
                          <span className="meal-name">{currentMeal.name}</span>
                          {hasOverride && <span className="override-badge">Swapped</span>}
                        </>
                      ) : (
                        <span className="no-meal">Click to set</span>
                      )}
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )}
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



