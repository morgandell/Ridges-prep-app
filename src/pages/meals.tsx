import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RecipeCard from "../components/RecipeCard";
import { Meal } from "../types/meal";
import "./meals.css";

export default function Meals() {
  const navigate = useNavigate();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="meals-page">
      <div className="meals-header">
        <h1>Meals</h1>
        <button className="new-meal-button" onClick={() => navigate("/meals/new")}>
          + New Meal
        </button>
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
          {meals.map((meal) => (
            <RecipeCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}
