import React from "react";
import { useNavigate } from "react-router-dom";
import { Meal } from "../types/meal";
import "./RecipeCard.css";

interface RecipeCardProps {
  meal: Meal;
}

export default function RecipeCard({ meal }: RecipeCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/meals/${meal.id}`);
  };

  return (
    <div className="recipe-card" onClick={handleClick}>
      <div className="recipe-card-header">
        <h3>{meal.name}</h3>
        {meal.prepTime && (
          <span className="recipe-time">{meal.prepTime} min</span>
        )}
      </div>
      <p className="recipe-description">{meal.description}</p>
      {meal.ingredients && meal.ingredients.length > 0 && (
        <div className="recipe-ingredients-preview">
          <strong>Ingredients:</strong> {meal.ingredients.slice(0, 3).join(", ")}
          {meal.ingredients.length > 3 && "..."}
        </div>
      )}
      {meal.tags && meal.tags.length > 0 && (
        <div className="recipe-tags">
          {meal.tags.map((tag, index) => (
            <span key={index} className="recipe-tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

