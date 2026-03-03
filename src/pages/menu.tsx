import { useEffect, useState } from "react";
import { Meal } from "../types/meal";
import { DayOfWeek, MealSlot, Menu } from "../types/menu";
import RecipeCard from "../components/RecipeCard";
import SaveToPastMenuForm from "../components/SaveToPastMenuForm";
import "./menu.css";

const DAYS: DayOfWeek[] = [
  "sunday", "monday","tuesday","wednesday",
  "thursday","friday"
];

type DragData =
  | {
      type: "meal";
      mealId: string;
    }
  | {
      type: "cell";
      mealId: string;
      day: DayOfWeek;
      slot: MealSlot;
    };


const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];

const BLOCKED_CELLS: Partial<Record<DayOfWeek, MealSlot[]>> = {
  sunday: ["breakfast", "lunch"],
  friday: ["lunch", "dinner"],
};

function isBlocked(day: DayOfWeek, slot: MealSlot) {
  return BLOCKED_CELLS[day]?.includes(slot) ?? false;
}


export default function WeeklyMenuPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
  const [filterMealTime, setFilterMealTime] = useState<Meal["mealTime"] | "all">("all");
  const [showSaveToPastForm, setShowSaveToPastForm] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const meals = await window.electronAPI.getMeals();
    const menu = await window.electronAPI.getMenu();
    setMeals(meals);
    setMenu(menu);
  }

  function setMeal(day: DayOfWeek, slot: MealSlot, mealId?: string) {
    if (!menu) return;

    setMenu({
      ...menu,
      days: {
        ...menu.days,
        [day]: {
          ...menu.days[day],
          [slot]: mealId,
        },
      },
    });
  }

  async function saveMenu(menuToSave?: Menu) {
    const menuData = menuToSave || menu;
    if (!menuData) return;

    try {
        const result = await window.electronAPI.saveMenu(menuData);
        if (!result.success) {
        console.error("Failed to save menu:", result.error);
        // Don't show alert for auto-saves to avoid interrupting user
        }
    } catch (err) {
        console.error("Failed to save menu:", err);
        // Don't show alert for auto-saves
    }
  }

  async function saveMenuAndNotify() {
    if (!menu) return;

    try {
        const result = await window.electronAPI.saveMenu(menu);
        if (!result.success) {
        alert(result.error || "Failed to save menu");
        }
    } catch (err) {
        console.error("Failed to save menu:", err);
        alert("Unexpected error saving menu");
    }
  }

  function createEmptyMenu(): Menu {
    return {
        days: {
        sunday: {},
        monday: {},
        tuesday: {},
        wednesday: {},
        thursday: {},
        friday: {},
        },
    };
    }

    function clearMenu() {
        const confirmed = window.confirm("Clear the entire menu?");
        if (!confirmed) return;

        const emptyMenu = createEmptyMenu();
        setMenu(emptyMenu);
        // Auto-save after clearing
        setTimeout(() => {
            window.electronAPI.saveMenu(emptyMenu);
        }, 0);
    }

    function setDragData(
    e: React.DragEvent,
    data: DragData
    ) {
    e.dataTransfer.setData("application/json", JSON.stringify(data));
    }

    function getDragData(
    e: React.DragEvent
    ): DragData | null {
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return null;
    return JSON.parse(raw) as DragData;
    }

    function getMealById(mealId?: string) {
      if (!mealId) return null;
      return meals.find(m => m.id === mealId) ?? null;
    }

    function isDessertMeal(mealId?: string) {
      return getMealById(mealId)?.mealTime === "dessert";
    }

    function getDropSlot(targetSlot: MealSlot, droppedMealId: string): MealSlot | null {
      // Only allow dessert to be dropped into the Dinner column (stored in hidden "dessert" slot)
      if (targetSlot === "dinner" && isDessertMeal(droppedMealId)) return "dessert";
      if (targetSlot !== "dinner" && isDessertMeal(droppedMealId)) return null;
      return targetSlot;
    }

    const filteredMeals = meals
    .filter(meal =>
        filterMealTime === "all"
        ? true
        : meal.mealTime === filterMealTime
    )
    .sort((a, b) =>
        (MEAL_TIME_ORDER[a.mealTime] ?? 99) -
        (MEAL_TIME_ORDER[b.mealTime] ?? 99)
    );


  if (!menu) return null;

    return (
    <div className="weekly-menu">
        <div className="menu-header">
        <h1>Weekly Menu</h1>
         <div className="menu-actions">
            <button
              className="save-to-past-btn"
              onClick={() => setShowSaveToPastForm(true)}
            >
              📥 Save to Past Menus
            </button>
            <button className="clear-menu-btn" onClick={clearMenu}>
             🗑 Clear Menu
            </button>
        </div>
        </div>

        {showSaveToPastForm && (
          <SaveToPastMenuForm
            getMenu={() => menu!}
            onCancel={() => setShowSaveToPastForm(false)}
          />
        )}

        <div className="menu-page">
            <div className="recipe-list">
                    <h3>Meals</h3>
                    <div className="meal-filters">
                        {["all", "breakfast", "lunch", "dinner", "dessert"].map(type => (
                            <button
                            key={type}
                            className={filterMealTime === type ? "active" : ""}
                            onClick={() => setFilterMealTime(type as any)}
                            >
                            {type === "all"
                                ? "All"
                                : type.toUpperCase()}
                            </button>
                        ))}
                        </div>

                    <div className="recipe-list-scroll">
                    {filteredMeals.map((meal) => (
                        <RecipeCard
                            key={meal.id}
                            meal = {meal}
                            draggable
                            onDragStart={(e) => setDragData(e, {
                                type: "meal",
                                mealId: meal.id,
                            })}
                             />
                        ))}

                    </div>
            </div>
            <div className="menu-table">
        <table>
        <thead>
            <tr>
            <th></th>
            {SLOTS.map(slot => (
                <th key={slot}>{slot}</th>
            ))}
            </tr>
        </thead>
        <tbody>
            {DAYS.map(day => (
            <tr key={day}>
                <td className="day">{day}</td>
                {SLOTS.map(slot => {
                // Dinner column can display two meals: dinner + dessert (dessert is stored in slot "dessert")
                const isDinnerColumn = slot === "dinner";
                const dinnerMealId = menu.days?.[day]?.["dinner"];
                const dessertMealId = menu.days?.[day]?.["dessert"];
                const dinnerMeal = getMealById(dinnerMealId);
                const dessertMeal = getMealById(dessertMealId);

                const mealId = menu.days?.[day]?.[slot];
                const meal = getMealById(mealId);

                const isDragOver = dragOverCell?.day === day && dragOverCell?.slot === slot;
                const blocked = isBlocked(day, slot);

                return (
                   <td
                        key={slot}
                        className={`
                            menu-cell
                            ${blocked ? "blocked" : (isDinnerColumn ? (dinnerMeal || dessertMeal) : meal) ? "filled" : "empty"}
                            ${isDragOver && !blocked ? "drag-over" : ""}
                        `}   
                        onDragEnter={(e) => {
                            if (blocked) return;
                            e.preventDefault();
                            // highlight dinner column for both dinner and dessert drops
                            setDragOverCell({ day, slot });
                        }}
                        onDragLeave={(e) => {
                            // Only clear if we're actually leaving the cell (not entering a child)
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX;
                            const y = e.clientY;
                            
                            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                setDragOverCell(null);
                            }
                        }}
                        onDragOver={(e) => {
                           if (blocked) return;
                            e.preventDefault();
                            setDragOverCell({ day, slot });
                        }}
                       onDrop={(e) => {
                            if (blocked) return;
                            e.preventDefault();
                            setDragOverCell(null);

                            const data = getDragData(e);
                            if (!data) return;

                            setMenu((prev) => {
                                if (!prev) return prev;

                                const updated = structuredClone(prev);

                                // Determine which slot we are actually writing to (dinner vs dessert)
                                const dropSlot =
                                  slot === "dinner"
                                    ? getDropSlot("dinner", data.mealId)
                                    : getDropSlot(slot, data.mealId);

                                if (!dropSlot) {
                                  return prev;
                                }

                                // Prevent self-drop
                                if (
                                data.type === "cell" &&
                                data.day === day &&
                                data.slot === dropSlot
                                ) {
                                return prev;
                                }

                                // If target slot is filled and we're dragging from a cell, switch the meals
                                const targetMealId = updated.days[day]?.[dropSlot];
                                if (targetMealId && data.type === "cell") {
                                    // Switch: put target meal in source slot, dragged meal in target slot
                                    updated.days[data.day][data.slot] = targetMealId;
                                    updated.days[day][dropSlot] = data.mealId;
                                } else {
                                    // Normal drop: just set the target slot
                                    updated.days[day][dropSlot] = data.mealId;

                                    if (data.type === "cell") {
                                        updated.days[data.day][data.slot] = undefined;
                                    }
                                }

                                // Auto-save after updating menu
                                setTimeout(() => {
                                    saveMenu(updated);
                                }, 0);

                                return updated;
                            });
                            }}


                        >
                        {blocked ? (
                          <div className="menu-cell-content">—</div>
                        ) : slot !== "dinner" ? (
                           <div
                              className="menu-cell-content"
                              draggable={!!meal}
                              onDragStart={meal ? (e) => {
                                setDragOverCell(null);
                                setDragData(e, {
                                  type: "cell",
                                  mealId: mealId!,
                                  day,
                                  slot,
                                });
                              } : undefined}
                            >
                              {meal ? meal.name : "Drop meal here"}
                            </div>
                        ) : (
                          <div className="menu-cell-multi">
                            {dinnerMeal ? (
                              <div
                                className="menu-cell-pill menu-cell-pill-dinner"
                                draggable
                                onDragStart={(e) => {
                                  setDragOverCell(null);
                                  setDragData(e, {
                                    type: "cell",
                                    mealId: dinnerMealId!,
                                    day,
                                    slot: "dinner",
                                  });
                                }}
                                title="Drag to move dinner"
                              >
                                <span className="menu-pill-label">Dinner</span>
                                <span className="menu-pill-name">{dinnerMeal.name}</span>
                              </div>
                            ) : (
                              <div className="menu-cell-content">Drop dinner here</div>
                            )}

                            {dessertMeal ? (
                              <div
                                className="menu-cell-pill menu-cell-pill-dessert"
                                draggable
                                onDragStart={(e) => {
                                  setDragOverCell(null);
                                  setDragData(e, {
                                    type: "cell",
                                    mealId: dessertMealId!,
                                    day,
                                    slot: "dessert",
                                  });
                                }}
                                title="Drag to move dessert"
                              >
                                <span className="menu-pill-label">Dessert</span>
                                <span className="menu-pill-name">{dessertMeal.name}</span>
                              </div>
                            ) : (
                              <div className="menu-cell-content menu-cell-content-subtle">
                                Drop dessert here (optional)
                              </div>
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
        <div
            className="trash-drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                const data = getDragData(e);
                if (data?.type === "cell") {
                    setMenu((prev) => {
                        if (!prev) return prev;
                        const updated = structuredClone(prev);
                        updated.days[data.day][data.slot] = undefined;
                        
                        // Auto-save after removing meal
                        setTimeout(() => {
                            saveMenu(updated);
                        }, 0);
                        
                        return updated;
                    });
                }
            }}
            >
            🗑 Drag here to remove
            </div>

        </div>
        </div>
    </div>
    );

}

const MEAL_TIME_ORDER: Record<Meal["mealTime"], number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  // snack: 4,
  dessert: 4,
};
