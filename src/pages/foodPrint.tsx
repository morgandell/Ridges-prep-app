import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WeekStats } from "../types/weekStats";
import { Meal } from "../types/meal";
import { Ingredient } from "../types/meal";
import { DayOfWeek, MealSlot } from "../types/menu";
import "./foodPrint.css";

interface IngredientTotal {
  name: string;
  quantity: number | null;
  unit: string;
  perServing: boolean;
}

interface WeekMealData {
  week: WeekStats;
  mealSelections: Array<{
    day: DayOfWeek;
    slot: MealSlot;
    meal: Meal | null;
  }>;
}

export default function FoodPrint() {
  const navigate = useNavigate();
  const [weeks, setWeeks] = useState<WeekStats[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekMealData, setWeekMealData] = useState<WeekMealData[]>([]);
  const [totalIngredients, setTotalIngredients] = useState<Map<string, IngredientTotal>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [weeksResult, mealsData] = await Promise.all([
        window.electronAPI.getWeekStats(),
        window.electronAPI.getMeals(),
      ]);

      if (weeksResult.success && weeksResult.weeks) {
        setWeeks(weeksResult.weeks);
        setMeals(mealsData);

        // Build week meal data - need to get menu to match meals
        const menuResult = await window.electronAPI.getMenu();
        const weekData: WeekMealData[] = weeksResult.weeks.map(week => {
          const mealSelections = week.mealsEatingOnTrail.map(selection => {
            // Get meal from menu for this day/slot, or use mealId if available
            let meal: Meal | null = null;
            
            if (selection.mealId) {
              meal = mealsData.find(m => m.id === selection.mealId) || null;
            } else if (menuResult && menuResult.days) {
              // Fallback to menu if mealId not set
              const menuMealId = menuResult.days[selection.day]?.[selection.slot];
              if (menuMealId) {
                meal = mealsData.find(m => m.id === menuMealId) || null;
              }
            }
            
            return {
              day: selection.day,
              slot: selection.slot,
              meal: meal,
            };
          });
          return { week, mealSelections };
        });

        setWeekMealData(weekData);

        // Calculate total ingredients
        const ingredientMap = new Map<string, IngredientTotal>();

        weekData.forEach(({ week, mealSelections }) => {
          const servings = week.numberOfCampers + 2;

          mealSelections.forEach(({ meal }) => {
            if (!meal || !meal.ingredients) return;

            meal.ingredients.forEach(ing => {
              const key = `${ing.name}|${ing.unit}|${ing.perServing}`;
              const existing = ingredientMap.get(key);

              if (ing.quantity === null) {
                // "To taste" - just track that it's needed
                if (!existing) {
                  ingredientMap.set(key, {
                    name: ing.name,
                    quantity: null,
                    unit: ing.unit,
                    perServing: ing.perServing,
                  });
                }
              } else {
                let amount = ing.quantity;

                if (ing.perServing) {
                  // Multiply by number of servings
                  amount = amount * servings;
                }
                // If whole recipe, amount stays the same

                if (existing) {
                  ingredientMap.set(key, {
                    ...existing,
                    quantity: (existing.quantity || 0) + amount,
                  });
                } else {
                  ingredientMap.set(key, {
                    name: ing.name,
                    quantity: amount,
                    unit: ing.unit,
                    perServing: ing.perServing,
                  });
                }
              }
            });
          });
        });

        setTotalIngredients(ingredientMap);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
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

  const formatQuantity = (ing: IngredientTotal) => {
    if (ing.quantity === null) {
      return "to taste";
    }
    const formatted = ing.quantity.toFixed(ing.quantity % 1 === 0 ? 0 : 2);
    return `${formatted} ${ing.unit || ""}`.trim();
  };

  const getWeekIngredients = (weekData: WeekMealData) => {
    const ingredientMap = new Map<string, IngredientTotal>();
    const servings = weekData.week.numberOfCampers + 2;

    weekData.mealSelections.forEach(({ meal }) => {
      if (!meal || !meal.ingredients) return;

      meal.ingredients.forEach(ing => {
        const key = `${ing.name}|${ing.unit}|${ing.perServing}`;
        const existing = ingredientMap.get(key);

        if (ing.quantity === null) {
          if (!existing) {
            ingredientMap.set(key, {
              name: ing.name,
              quantity: null,
              unit: ing.unit,
              perServing: ing.perServing,
            });
          }
        } else {
          let amount = ing.quantity;

          if (ing.perServing) {
            amount = amount * servings;
          }

          if (existing) {
            ingredientMap.set(key, {
              ...existing,
              quantity: (existing.quantity || 0) + amount,
            });
          } else {
            ingredientMap.set(key, {
              name: ing.name,
              quantity: amount,
              unit: ing.unit,
              perServing: ing.perServing,
            });
          }
        }
      });
    });

    return Array.from(ingredientMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  };

  if (loading) {
    return <div className="food-print-page">Loading...</div>;
  }

  return (
    <div className="food-print-page">
      <div className="print-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <button className="print-button" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <div className="print-content">
        {/* Total Ingredients Summary */}
        <div className="print-section">
          <h1>Total Food Requirements for Summer</h1>
          <p className="print-meta">
            Calculated for all weeks with servings = (campers + 2) per meal
          </p>

          <table className="ingredients-table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Total Quantity</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(totalIngredients.values())
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((ing, idx) => (
                  <tr key={idx}>
                    <td>{ing.name}</td>
                    <td>{formatQuantity(ing)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Per-Week Breakdown */}
        {weekMealData.map((weekData, weekIdx) => {
          const weekIngredients = getWeekIngredients(weekData);
          const servings = weekData.week.numberOfCampers + 2;

          return (
            <div key={weekData.week.id} className="print-section page-break">
              <h2>
                Week: {formatDate(weekData.week.weekStart)} — {weekData.week.ageGroup}
              </h2>
              <p className="print-meta">
                Campers: {weekData.week.numberOfCampers} | Servings per meal: {servings} (campers + 2)
              </p>

              <h3>Meals This Week</h3>
              <table className="meals-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Meal</th>
                    <th>Meal Name</th>
                  </tr>
                </thead>
                <tbody>
                  {weekData.mealSelections.map((selection, idx) => (
                    <tr key={idx}>
                      <td>{selection.day}</td>
                      <td>{selection.slot}</td>
                      <td>{selection.meal?.name || "Not assigned"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3>Ingredients Needed</h3>
              <table className="ingredients-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {weekIngredients.map((ing, idx) => (
                    <tr key={idx}>
                      <td>{ing.name}</td>
                      <td>{formatQuantity(ing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Meal Details */}
              <h3>Meal Details</h3>
              {weekData.mealSelections.map((selection, idx) => {
                if (!selection.meal) return null;

                return (
                  <div key={idx} className="meal-detail-print">
                    <h4>
                      {selection.day} {selection.slot}: {selection.meal.name}
                    </h4>
                    <p className="servings-info">
                      Servings: {servings} (for {weekData.week.numberOfCampers} campers + 2)
                    </p>
                    <table className="meal-ingredients-table">
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th>Quantity</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selection.meal.ingredients?.map((ing, ingIdx) => {
                          let quantity = ing.quantity;
                          let notes = "";

                          if (ing.perServing && quantity !== null) {
                            quantity = quantity * servings;
                            notes = `(${ing.quantity} ${ing.unit || ""} per serving × ${servings})`.trim();
                          } else if (!ing.perServing) {
                            notes = "whole recipe";
                          }

                          return (
                            <tr key={ingIdx}>
                              <td>{ing.name}</td>
                              <td>
                                {quantity !== null
                                  ? `${quantity.toFixed(quantity % 1 === 0 ? 0 : 2)} ${ing.unit || ""}`.trim()
                                  : "to taste"}
                              </td>
                              <td>{notes}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
