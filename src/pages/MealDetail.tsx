import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Meal } from "../types/meal";
import "./MealDetail.css";

export default function MealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMeal() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const result = await window.electronAPI.getMeal(id);
        if (result.success && result.meal) {
          setMeal(result.meal);
        } else {
          setMeal(null);
          console.error("Error loading meal:", result.error);
        }
      } catch (error) {
        console.error("Error loading meal:", error);
        setMeal(null);
      } finally {
        setLoading(false);
      }
    }

    loadMeal();
  }, [id]);

  const handleDelete = async () => {
    if (!meal || !window.confirm("Are you sure you want to delete this meal?")) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteMeal(meal.id);
      if (result.success) {
        navigate("/meals");
      }
    } catch (error) {
      console.error("Error deleting meal:", error);
      alert("Failed to delete meal");
    }
  };

  const handleEdit = () => {
    navigate(`/meals/${id}/edit`);
  };

  if (loading) {
    return <div className="meal-detail">Loading...</div>;
  }

  if (!meal) {
    return (
      <div className="meal-detail">
        <h1>Meal not found</h1>
        <button onClick={() => navigate("/meals")}>Back to Meals</button>
      </div>
    );
  }

  return (
    <div className="meal-detail">
      <div className="meal-detail-header">
        <button className="back-button" onClick={() => navigate("/meals")}>
          ← Back
        </button>
        <div className="meal-actions">
          <button className="edit-button" onClick={handleEdit}>
            Edit
          </button>
          <button className="delete-button" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
      <div className="meal-header">
        <h1>{meal.name}</h1>
        <h2>{meal.mealTime}</h2>
      </div>
      
      <div className="meal-meta">
        {meal.prepTime && (
          <span>Prep: {meal.prepTime} min</span>
        )}
        {meal.cookTime && (
          <span>Cook: {meal.cookTime} min</span>
        )}
        {meal.servings && (
          <span>Servings: {meal.servings}</span>
        )}
      </div>

      {meal.description && (
        <div className="meal-section">
          <h2>Description</h2>
          <p>{meal.description}</p>
        </div>
      )}

      {meal.ingredients && meal.ingredients.length > 0 && (
          <div className="meal-section">
            <h2>Ingredients</h2>
            <ul className="ingredients-list">
              {meal.ingredients.map((ingredient, index) => (
                <li key={index}>
                  {ingredient.quantity !== null && (
                    <>
                      {ingredient.quantity}
                      {ingredient.unit && ` ${ingredient.unit}`}{" "}
                    </>
                  )}
                  {ingredient.name}
                  <span className="ingredient-scope">
                    {" "}
                    ({ingredient.perServing ? "per serving" : "whole recipe"})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}


      {meal.instructions && meal.instructions.length > 0 && (
        <div className="meal-section">
          <h2>Instructions</h2>
          <ol className="instructions-list">
            {meal.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
        </div>
      )}

      {meal.tags && meal.tags.length > 0 && (
        <div className="meal-section">
          <h2>Tags</h2>
          <div className="meal-tags">
            {meal.tags.map((tag, index) => (
              <span key={index} className="meal-tag">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

