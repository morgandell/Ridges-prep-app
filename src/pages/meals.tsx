import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RecipeCard from "../components/RecipeCard";
import { Meal } from "../types/meal";
import { PRESET_TAGS } from "../constants/tags";
import "./meals.css";

export default function Meals() {
  const navigate = useNavigate();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMealTime, setFilterMealTime] = useState<Meal["mealTime"] | "all">("all");
  /** Applied preset tags — meal must match at least one (OR) */
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  /** Draft selection while modal is open */
  const [tagModalDraft, setTagModalDraft] = useState<string[]>([]);


  useEffect(() => {
    loadMeals();
  }, []);

  async function loadMeals() {
    try {
      const loadedMeals = await window.electronAPI.getMeals();
      setMeals(loadedMeals);
    } catch (error) {
      console.error("Error loading meals:", error);
    } finally {
      setLoading(false);
    }
  }

  function mealHasPresetTag(meal: Meal, presetLabel: string): boolean {
    const tags = meal.tags ?? [];
    const needle = presetLabel.trim().toLowerCase();
    return tags.some((t) => t.trim().toLowerCase() === needle);
  }

  function mealMatchesAnySelectedTag(meal: Meal): boolean {
    if (tagFilters.length === 0) return true;
    return tagFilters.some((preset) => mealHasPresetTag(meal, preset));
  }

  function openTagModal() {
    setTagModalDraft([...tagFilters]);
    setTagModalOpen(true);
  }

  function toggleTagInDraft(tag: string) {
    setTagModalDraft((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function applyTagModal() {
    setTagFilters([...tagModalDraft]);
    setTagModalOpen(false);
  }

  function cancelTagModal() {
    setTagModalOpen(false);
  }

  const displayedMeals = meals
    .filter((meal) =>
      filterMealTime === "all" ? true : meal.mealTime === filterMealTime
    )
    .filter((meal) => mealMatchesAnySelectedTag(meal))
    .sort((a, b) => {
      return (
        (MEAL_TIME_ORDER[a.mealTime] ?? 99) -
        (MEAL_TIME_ORDER[b.mealTime] ?? 99)
      );
    });


  return (
    <div className="meals-page">
      <div className="meals-header">
        <h1>Meals</h1>
        <button className="new-meal-button" onClick={() => navigate("/meals/new")}>
          + New Meal
        </button>
      </div>

    <div className="meal-filters-toolbar">
      <div className="meal-filters meal-filters-row">
        {["all", "breakfast", "lunch", "dinner", "snack", "dessert"].map((type) => (
          <button
            key={type}
            type="button"
            className={filterMealTime === type ? "active" : ""}
            onClick={() => setFilterMealTime(type as any)}
          >
            {type === "all"
              ? "All"
              : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`meals-tag-filter-btn${tagFilters.length > 0 ? " has-filters" : ""}`}
        onClick={openTagModal}
        aria-expanded={tagModalOpen}
        aria-haspopup="dialog"
      >
        Filter by tags
        {tagFilters.length > 0 && (
          <span className="meals-tag-filter-badge">{tagFilters.length}</span>
        )}
      </button>
    </div>

    {tagModalOpen && (
      <div
        className="meals-tag-modal-overlay"
        role="presentation"
        onClick={cancelTagModal}
      >
        <div
          className="meals-tag-modal"
          role="dialog"
          aria-labelledby="meals-tag-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="meals-tag-modal-title" className="meals-tag-modal-title">
            Filter by tags
          </h2>
          <p className="meals-tag-modal-hint">
            Select one or more tags. Meals that match <strong>any</strong> selected tag are shown.
          </p>
          <ul className="meals-tag-modal-list">
            {PRESET_TAGS.map((tag) => (
              <li key={tag}>
                <label className="meals-tag-modal-option">
                  <input
                    type="checkbox"
                    checked={tagModalDraft.includes(tag)}
                    onChange={() => toggleTagInDraft(tag)}
                  />
                  <span>{tag}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="meals-tag-modal-actions">
            <button
              type="button"
              className="meals-tag-modal-clear"
              onClick={() => setTagModalDraft([])}
            >
              Clear all
            </button>
            <div className="meals-tag-modal-actions-main">
              <button type="button" className="meals-tag-modal-cancel" onClick={cancelTagModal}>
                Cancel
              </button>
              <button type="button" className="meals-tag-modal-apply" onClick={applyTagModal}>
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {loading ? (
        <div className="meals-loading">Loading meals...</div>
      ) : meals.length === 0 ? (
        <div className="meals-empty">
          <p>No meals yet. Create your first meal!</p>
          <button className="new-meal-button" onClick={() => navigate("/meals/new")}>
            Create Meal
          </button>
        </div>
      ) : displayedMeals.length === 0 ? (
        <div className="meals-empty meals-filter-empty">
          <p>No meals match the current filters.</p>
          <button
            type="button"
            className="new-meal-button"
            onClick={() => {
              setFilterMealTime("all");
              setTagFilters([]);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="meals-grid">
          {displayedMeals.map(meal => (
            <RecipeCard key={meal.id} meal={meal} />
            ))}

        </div>
      )}
    </div>
  );
}

const MEAL_TIME_ORDER: Record<Meal["mealTime"], number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  dessert: 4,
};
