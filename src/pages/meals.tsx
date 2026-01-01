import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RecipeCard from "../components/RecipeCard";
import { Meal } from "../types/meal";
import "./meals.css";

export default function Meals() {
  const navigate = useNavigate();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMealTime, setFilterMealTime] = useState<Meal["mealTime"] | "all">("all");


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

  const displayedMeals = meals
  .filter(meal =>
    filterMealTime === "all" ? true : meal.mealTime === filterMealTime
  )
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

    <div className="meal-filters">
    {["all", "breakfast", "lunch", "dinner", "snack", "dessert"].map(type => (
        <button
        key={type}
        className={filterMealTime === type ? "active" : ""}
        onClick={() => setFilterMealTime(type as any)}
        >
        {type === "all"
            ? "All"
            : type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
    ))}
    </div>

      {loading ? (
        <div className="meals-loading">Loading meals...</div>
      ) : meals.length === 0 ? (
        <div className="meals-empty">
          <p>No meals yet. Create your first meal!</p>
          <button className="new-meal-button" onClick={() => navigate("/meals/new")}>
            Create Meal
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
  snack: 4,
  dessert: 5,
};
