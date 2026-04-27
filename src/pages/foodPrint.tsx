import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
    excludedCampers: string[]; // Campers who can't eat this meal
    includedCampers: number; // Number of campers who can eat this meal
    alternativeCampers: string[];
    note?: string; // Custom note for this meal
    selectionIndex: number; // Index in mealsEatingOnTrail array
  }>;
}

type MealAccommodationResult = {
  canEat: boolean;
  needsAdjustment: boolean;
};


export default function FoodPrint() {
  const navigate = useNavigate();
  const location = useLocation();
  const [weeks, setWeeks] = useState<WeekStats[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamFilter, setTeamFilter] = useState<"both" | WeekStats["team"]>("both");
  const [weekMealData, setWeekMealData] = useState<WeekMealData[]>([]);
  const [totalIngredients, setTotalIngredients] = useState<Map<string, IngredientTotal>>(new Map());
  const [editingNote, setEditingNote] = useState<{ weekId: string; day: DayOfWeek; slot: MealSlot } | null>(null);
  const [mealNotes, setMealNotes] = useState<{ [key: string]: string }>({});
  const [showTotalGrocery, setShowTotalGrocery] = useState(true);
  const [showWeeklyGrocery, setShowWeeklyGrocery] = useState(true);
  const [showMealBreakdowns, setShowMealBreakdowns] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when navigating to this page
  useEffect(() => {
    if (location.pathname === '/food-print') {
      loadData(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (loading) return;
    loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamFilter]);

  // Reload data when window comes into focus (user navigates back or switches tabs)
  useEffect(() => {
    const handleFocus = () => {
      loadData(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        loadData(true);
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  async function loadData(showRefreshing = false) {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const [weeksResult, mealsData] = await Promise.all([
        window.electronAPI.getWeekStats(),
        window.electronAPI.getMeals(),
      ]);

      if (weeksResult.success && weeksResult.weeks) {
        setWeeks(weeksResult.weeks);
        setMeals(mealsData);

        const filteredWeeks =
          teamFilter === "both"
            ? weeksResult.weeks
            : weeksResult.weeks.filter((w) => (w.team || "A") === teamFilter);

        // Build week meal data - need to get menu to match meals
        const menuResult = await window.electronAPI.getMenu();
        const weekData: WeekMealData[] = filteredWeeks.map(week => {
          const mealSelections = week.mealsEatingOnTrail.map(selection => {
            // Get meal from menu for this day/slot, or use mealId if available
            // Check for week-specific override first, then selection.mealId, then menu
            let meal: Meal | null = null;
            let mealId: string | undefined;
            
            // Priority: mealOverrides > selection.mealId > menu
            if (week.mealOverrides?.[selection.day]?.[selection.slot]) {
              mealId = week.mealOverrides[selection.day]?.[selection.slot];
            } else if (selection.mealId) {
              mealId = selection.mealId;
            } else if (menuResult && menuResult.days) {
              mealId = menuResult.days[selection.day]?.[selection.slot];
            }
            
            if (mealId) {
              meal = mealsData.find(m => m.id === mealId) || null;
            }

            // Calculate which campers can/can't eat this meal
            const excludedCampers: string[] = [];
            let includedCampers = week.numberOfCampers;
            const alternativeCampers: string[] = [];

            if (week.camperRestrictions && week.camperRestrictions.length > 0) {
              week.camperRestrictions.forEach(camper => {
                // if (!mealCanAccommodateCamper(meal, camper.restrictions)) {
                //   excludedCampers.push(camper.name || `Camper ${camper.id}`);
                //   includedCampers--;
                // } else {
                //   // Camper can eat the meal but with slight variation - eg gluten-free tortilla
                //   if(mealNeedAlternativeForCamper(meal, camper.restrictions)) {
                //     alternativeCampers.push(camper.name || `Camper ${camper.id}`);
                //   }
                // }

                const { canEat, needsAdjustment } =
                  mealAccommodationForCamper(meal, camper.restrictions);

                if (!canEat) {
                  // Show red / blocked
                  excludedCampers.push(camper.name || `Camper ${camper.id}`);
                  includedCampers--;
                } else if (needsAdjustment) {
                  // Show warning icon: "small change required"
                  alternativeCampers.push(camper.name || `Camper ${camper.id}`);
                } else {
                  // Green / fully compatible
                }

              });
            }
            
            return {
              day: selection.day,
              slot: selection.slot,
              meal: meal,
              excludedCampers,
              includedCampers: Math.max(0, includedCampers), // Ensure non-negative
              alternativeCampers,
              note: selection.note,
              selectionIndex: week.mealsEatingOnTrail.indexOf(selection),
            };
          });
          return { week, mealSelections };
        });

        setWeekMealData(weekData);

        // Calculate total ingredients
        const ingredientMap = new Map<string, IngredientTotal>();

        weekData.forEach(({ week, mealSelections }) => {
          mealSelections.forEach(({ meal, includedCampers }) => {
            if (!meal || !meal.ingredients) return;

            // Calculate servings based on included campers (those who can eat the meal)
            let servings = (includedCampers + 2) * 1.5;
            if (week.ageGroup === "high school") {
              servings = (includedCampers + 2) * 2;
            }

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
      setRefreshing(false);
    }
  }

  const handleRefresh = () => {
    loadData(true);
  };

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

  // Check if a meal can accommodate a camper's restrictions
  // const mealCanAccommodateCamper = (meal: Meal | null, camperRestrictions: string[]): boolean => {
  //   if (!meal) {
  //     // No meal assigned, can't accommodate anyone
  //     return false;
  //   }

  //   if (camperRestrictions.length === 0) {
  //     // Camper has no restrictions, they can eat any meal
  //     return true;
  //   }

  //   // If meal has no tags, it can't accommodate any restrictions
  //   if (!meal.tags || meal.tags.length === 0) {
  //     return false;
  //   }

  //   // Normalize tags and restrictions for comparison (case-insensitive)
  //   const mealTags = meal.tags.map(t => t.toLowerCase().trim().replace(/\s+/g, ''));
  //   const restrictions = camperRestrictions.map(r => r.toLowerCase().trim().replace(/\s+/g, ''));

  //   // Check if meal has tags that match ALL of the camper's restrictions
  //   // A meal can accommodate if it has tags covering all restrictions
  //   // Match exact or if tag contains restriction (e.g., "Easy-Gluten-Free-Alternative" matches "Gluten-Free")
  //   const mealCanAccommodate = restrictions.every(restriction => {
  //     return mealTags.some(tag => {
  //       // Exact match
  //       if (tag === restriction) return true;
  //       // Tag contains restriction (e.g., "easy-gluten-free-alternative" contains "gluten-free")
  //       if (tag.includes(restriction)) return true;
  //       // Restriction contains tag (less common but possible)
  //       if (restriction.includes(tag)) return true;
  //       // Handle hyphenated variations (e.g., "gluten-free" vs "glutenfree")
  //       const tagNormalized = tag.replace(/-/g, '');
  //       const restrictionNormalized = restriction.replace(/-/g, '');
  //       if (tagNormalized === restrictionNormalized) return true;
  //       if (tagNormalized.includes(restrictionNormalized)) return true;
  //       return false;
  //     });
  //   });

  //   return mealCanAccommodate;
  // };

    const tagMatchesRestriction = (tag: string, restriction: string): boolean => {
      if (tag === restriction) return true;
      if (tag.includes(restriction)) return true;
      if (restriction.includes(tag)) return true;

      const tagNormalized = tag.replace(/-/g, "");
      const restrictionNormalized = restriction.replace(/-/g, "");

      if (tagNormalized === restrictionNormalized) return true;
      if (tagNormalized.includes(restrictionNormalized)) return true;

      return false;
    };

    const isAdjustmentTag = (tag: string) =>
      tag.includes("alternative") || tag.includes("option");



    const mealAccommodationForCamper = (
      meal: Meal | null,
      camperRestrictions: string[]
    ): MealAccommodationResult => {
      if (!meal) {
        return { canEat: false, needsAdjustment: false };
      }

      if (camperRestrictions.length === 0) {
        return { canEat: true, needsAdjustment: false };
      }

      if (!meal.tags || meal.tags.length === 0) {
        return { canEat: false, needsAdjustment: false };
      }

      const mealTags = meal.tags.map(t =>
        t.toLowerCase().trim().replace(/\s+/g, "")
      );
      const restrictions = camperRestrictions.map(r =>
        r.toLowerCase().trim().replace(/\s+/g, "")
      );

      let needsAdjustment = false;

      const canEat = restrictions.every(restriction => {
        const matchingTags = mealTags.filter(tag =>
          tagMatchesRestriction(tag, restriction)
        );

        if (matchingTags.length === 0) return false;

        // If *all* matches are "alternative/option" tags → adjustment needed
        if (matchingTags.every(isAdjustmentTag)) {
          needsAdjustment = true;
        }

        return true;
      });

      return { canEat, needsAdjustment };
    };


  // const mealNeedAlternativeForCamper = (meal: Meal | null, camperRestrictions: string[]): boolean => {
  //   if (!meal) {
  //     return false; 
  //   }

  //   if (camperRestrictions.length === 0) {
  //     return false; 
  //   }
  // }

  const getWeekIngredients = (weekData: WeekMealData) => {
    const ingredientMap = new Map<string, IngredientTotal>();

    weekData.mealSelections.forEach(({ meal, includedCampers }) => {
      if (!meal || !meal.ingredients) return;

      // Calculate servings based on included campers
      let servings = (includedCampers + 2) * 1.5;
      if (weekData.week.ageGroup === "high school") {
        servings = (includedCampers + 2) * 2;
      }

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
        <div className="header-actions">
          <div className="section-selectors no-print">
            <span className="section-selectors-label">Weeks:</span>
            <label className="section-checkbox">
              <input
                type="radio"
                name="foodPrintTeamFilter"
                checked={teamFilter === "both"}
                onChange={() => setTeamFilter("both")}
              />
              Both
            </label>
            <label className="section-checkbox">
              <input
                type="radio"
                name="foodPrintTeamFilter"
                checked={teamFilter === "A"}
                onChange={() => setTeamFilter("A")}
              />
              Team A
            </label>
            <label className="section-checkbox">
              <input
                type="radio"
                name="foodPrintTeamFilter"
                checked={teamFilter === "B"}
                onChange={() => setTeamFilter("B")}
              />
              Team B
            </label>
          </div>
          <div className="section-selectors no-print">
            <span className="section-selectors-label">Sections to include:</span>
            <label className="section-checkbox">
              <input
                type="checkbox"
                checked={showTotalGrocery}
                onChange={(e) => setShowTotalGrocery(e.target.checked)}
              />
              Total grocery list
            </label>
            <label className="section-checkbox">
              <input
                type="checkbox"
                checked={showWeeklyGrocery}
                onChange={(e) => setShowWeeklyGrocery(e.target.checked)}
              />
              Weekly grocery lists
            </label>
            <label className="section-checkbox">
              <input
                type="checkbox"
                checked={showMealBreakdowns}
                onChange={(e) => setShowMealBreakdowns(e.target.checked)}
              />
              Meal breakdowns
            </label>
          </div>
          <button 
            className="refresh-button" 
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Refresh data (updates when menu or meals change)"
          >
            {refreshing ? "Refreshing..." : "🔄 Refresh"}
          </button>
          <button className="print-button" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <div className="print-content">
        {/* Total Ingredients Summary */}
        {showTotalGrocery && (
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
        )}

        {/* Per-Week Breakdown - only show if at least one section is selected */}
        {(showWeeklyGrocery || showMealBreakdowns) && weekMealData.map((weekData, weekIdx) => {
          const weekIngredients = getWeekIngredients(weekData);
          const multiplier = weekData.week.ageGroup === "high school" ? 2 : 1.5;

          return (
            <div key={weekData.week.id} className="print-section page-break">
              <h2>
                Week: {formatDate(weekData.week.weekStart)} — {weekData.week.ageGroup}
              </h2>
              <p className="print-meta">
                Total Campers: {weekData.week.numberOfCampers} | Servings calculated per meal based on dietary restrictions
              </p>

              {showWeeklyGrocery && (
              <>
              <h3>Meals This Week</h3>
              <table className="meals-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Meal</th>
                    <th>Meal Name</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {weekData.mealSelections.map((selection, idx) => {
                    const noteKey = `${weekData.week.id}-${selection.day}-${selection.slot}`;
                    const isEditing = editingNote?.weekId === weekData.week.id && 
                                     editingNote?.day === selection.day && 
                                     editingNote?.slot === selection.slot;
                    const currentNote = mealNotes[noteKey] || selection.note || "";

                    return (
                      <tr key={idx}>
                        <td>{selection.day}</td>
                        <td>{selection.slot}</td>
                        <td>{selection.meal?.name || "Not assigned"}</td>
                        <td className="notes-cell">
                          {isEditing ? (
                            <div className="meal-note-editor">
                              <textarea
                                value={currentNote}
                                onChange={(e) => setMealNotes(prev => ({ ...prev, [noteKey]: e.target.value }))}
                                placeholder="Add note..."
                                className="meal-note-textarea"
                                rows={2}
                                autoFocus
                              />
                              <div className="meal-note-actions">
                                <button
                                  type="button"
                                  className="save-note-button"
                                  onClick={async () => {
                                    // Update the week's meal selection with the note
                                    const updatedSelections = [...weekData.week.mealsEatingOnTrail];
                                    const selectionToUpdate = updatedSelections[selection.selectionIndex];
                                    if (selectionToUpdate) {
                                      updatedSelections[selection.selectionIndex] = {
                                        ...selectionToUpdate,
                                        note: mealNotes[noteKey] || "",
                                      };
                                    }

                                    const updatedWeek = {
                                      ...weekData.week,
                                      mealsEatingOnTrail: updatedSelections,
                                    };

                                    const result = await window.electronAPI.saveWeekStats(updatedWeek);
                                    if (result.success) {
                                      setEditingNote(null);
                                      // Reload weeks to get updated data
                                      const weeksResult = await window.electronAPI.getWeekStats();
                                      if (weeksResult.success && weeksResult.weeks) {
                                        setWeeks(weeksResult.weeks);
                                        // Reload data to refresh the display
                                        loadData(true);
                                      }
                                    } else {
                                      alert("Failed to save note: " + (result.error || "Unknown error"));
                                    }
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="cancel-note-button"
                                  onClick={() => {
                                    setEditingNote(null);
                                    // Restore original note
                                    setMealNotes(prev => {
                                      const newNotes = { ...prev };
                                      delete newNotes[noteKey];
                                      return newNotes;
                                    });
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="meal-note-display">
                              {selection.excludedCampers.length > 0 && (
                                <span className="restriction-note">
                                  ⚠️ Need alternative for: {selection.excludedCampers.join(", ")}
                                </span>
                              )}
                              {selection.alternativeCampers.length > 0 && (
                                <span className="restriction-note">
                                  ⚠️ Need substitute ingredient for: {selection.alternativeCampers.join(", ")}
                                </span>
                              )}
                              {selection.excludedCampers.length === 0 && selection.meal && (
                                <span className="no-restrictions-note">All campers included</span>
                              )}
                              {currentNote && (
                                <div className="custom-note">
                                  <strong>Note:</strong> {currentNote}
                                </div>
                              )}
                              <button
                                type="button"
                                className="edit-note-button"
                                onClick={() => setEditingNote({ weekId: weekData.week.id, day: selection.day, slot: selection.slot })}
                                title="Edit note"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
              </>
              )}

              {/* Meal Details */}
              {showMealBreakdowns && (
              <>
              <h3>Meal Details</h3>
              {weekData.mealSelections.map((selection, idx) => {
                if (!selection.meal) return null;

                // Calculate servings for this specific meal
                let mealServings = (selection.includedCampers + 2) * multiplier;

                return (
                  <div key={idx} className="meal-detail-print">
                    <h4>
                      {selection.day} {selection.slot}: {selection.meal.name}
                    </h4>
                    <p className="servings-info">
                      Servings: {mealServings.toFixed(1)} (for {selection.includedCampers} campers who can eat this meal + 2, × {multiplier})
                    </p>
                    {selection.excludedCampers.length > 0 && (
                      <div className="restriction-alert">
                        <strong>⚠️ Dietary Restriction Note:</strong> The following campers cannot eat this meal and need an alternative: {selection.excludedCampers.join(", ")}
                      </div>
                    )}
                    {selection.alternativeCampers.length > 0 && (
                      <div className="restriction-alert">
                        <strong>⚠️ Dietary Restriction Note:</strong> The following campers need an alternative for a small portion of this meal. e.g. switch a tortilla for a gluten free tortilla: {selection.alternativeCampers.join(", ")}
                      </div>
                    )}
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
                            quantity = quantity * mealServings;
                            notes = `(${ing.quantity} ${ing.unit || ""} per serving × ${mealServings.toFixed(1)})`.trim();
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
              </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
