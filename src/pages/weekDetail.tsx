import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { DayOfWeek, MealSlot, Menu } from "../types/menu";
import "./weekDetail.css";
import { WeekStats } from "../types/weekStats";
import { Meal } from "../types/meal";

export default function WeekDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [week, setWeek] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
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
        const [weekResult, menuData, mealsData] = await Promise.all([
          window.electronAPI.getWeekStats(),
          window.electronAPI.getMenu(),
          window.electronAPI.getMeals(),
        ]);
        if (weekResult.success && weekResult.weeks) {
          const found = weekResult.weeks.find(w => w.id === id);
          setWeek(found || null);
        }
        setMenu(menuData);
        setMeals(mealsData);
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

  const handleBack = () => {
    // If we came from an edit page, go to weeks list instead
    const cameFromEdit = location.state?.fromEdit;
    const referrer = document.referrer;
    const isFromEditRoute = referrer.includes('/edit') || cameFromEdit;
    
    if (isFromEditRoute) {
      navigate("/weeks");
    } else {
      navigate(-1);
    }
  };

  if (!week) {
    return (
      <div className="week-detail">
        <h1>Week not found</h1>
        <button onClick={handleBack}>Back</button>
      </div>
    );
  }

  return (
    <div className="week-detail">
      <div className="week-detail-header">
        <button className="back-button" onClick={handleBack}>
          ← Back
        </button>
        <div className="week-actions">
          <button
            className="edit-button"
            onClick={() => navigate(`/weeks/${week.id}/edit`, { state: { fromDetail: true } })}
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
    <h2>Meals Eating on Trail</h2>
    <p className="hint">Shows all meals for the selected trail days, including any week-specific swaps.</p>
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
              const isMealIncluded = isIncluded(day, slot);

              if (!isMealIncluded) {
                return <td key={slot}></td>;
              }

              const overrideMealId = week.mealOverrides?.[day]?.[slot];
              const menuMealId = menu?.days?.[day]?.[slot];

              const effectiveMealId = overrideMealId || menuMealId;
              const effectiveMeal = effectiveMealId
                ? meals.find(m => m.id === effectiveMealId)
                : null;

              const originalMenuMeal =
                overrideMealId && menuMealId && overrideMealId !== menuMealId
                  ? meals.find(m => m.id === menuMealId)
                  : null;

              const hasOverride = !!overrideMealId;

              return (
                <td
                  key={slot}
                  className={`menu-swap-cell ${hasOverride ? "overridden" : ""}`}
                >
                  <div className="meal-swap-display">
                    <div className="meal-name">
                      {effectiveMeal?.name || "Unknown meal"}
                    </div>
                    {hasOverride && originalMenuMeal && (
                      <div className="original-meal">
                        <small>Swapped from: {originalMenuMeal.name}</small>
                      </div>
                    )}
                  </div>
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



