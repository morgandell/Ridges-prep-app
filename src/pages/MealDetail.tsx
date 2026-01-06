import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Meal } from "../types/meal";
import { DayOfWeek, MealSlot, Menu } from "../types/menu";
import "./MealDetail.css";

export default function MealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("monday");
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>("dinner");
  const [showAddToMenu, setShowAddToMenu] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    day: DayOfWeek;
    slot: MealSlot;
  } | null>(null);

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
        navigate(-1);
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
        <button onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  const openAddToMenu = async () => {
    const currentMenu = await window.electronAPI.getMenu();
    setMenu(currentMenu);
    setShowAddToMenu(true);
  };


  return (
    <div className="meal-detail">
      <div className="meal-detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
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
        <button
          className="add-to-menu-button"
          onClick={() => openAddToMenu()}
        >
          + Add to Menu
        </button>
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
 {showAddToMenu && menu && meal && (
  <div className="modal-overlay" onClick={() => setShowAddToMenu(false)}>
    <div className="modal large" onClick={(e) => e.stopPropagation()}>
      <h2>Select a slot</h2>

      <table className="mini-menu">
        <thead>
          <tr>
            <th />
            {["breakfast", "lunch", "dinner"].map(slot => (
              <th key={slot}>{slot.toUpperCase()}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Object.entries(menu.days).map(([day, slots]) => (
            <tr key={day}>
              <td className="day">{day.toUpperCase()}</td>

              {(["breakfast","lunch","dinner"] as MealSlot[]).map(slot => {
                const occupiedMealId = slots[slot];
                const isSelected =
                  selectedCell?.day === day &&
                  selectedCell?.slot === slot;

                return (
                  <td
                    key={slot}
                    className={`
                      mini-menu-cell
                      ${occupiedMealId ? "filled" : "empty"}
                      ${isSelected ? "selected" : ""}
                    `}
                    onClick={() =>
                      setSelectedCell({
                        day: day as DayOfWeek,
                        slot,
                      })
                    }
                  >
                    {occupiedMealId ? "Occupied" : "Empty"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="modal-actions">
        <button onClick={() => setShowAddToMenu(false)}>Cancel</button>

        <button
          disabled={!selectedCell}
          onClick={async () => {
            if (!selectedCell) return;

            const updated = structuredClone(menu);

            updated.days[selectedCell.day][selectedCell.slot] = meal.id;

            await window.electronAPI.saveMenu(updated);
            setShowAddToMenu(false);
          }}
        >
          Add to Menu
        </button>
      </div>
    </div>
  </div>
)}


    </div>
    
  );
}

