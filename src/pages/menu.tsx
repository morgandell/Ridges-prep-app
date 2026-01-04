import { useEffect, useState } from "react";
import { Meal } from "../types/meal";
import { DayOfWeek, MealSlot, Menu } from "../types/menu";
import MealCell from "../components/mealCell";
import "./menu.css";
import RecipeCard from "../components/RecipeCard";

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

export default function WeeklyMenuPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);

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



  if (!menu) return null;

    return (
    <div className="weekly-menu">
        <div className="menu-header">
        <h1>Weekly Menu</h1>
         <div className="menu-actions">
            <button className="clear-menu-btn" onClick={clearMenu}>
            Clear Menu
            </button>

            <button className="save-menu-btn" onClick={saveMenuAndNotify}>
            Save Menu
            </button>
        </div>
        </div>
        <div className="menu-page">
            <div className="recipe-list">
                    <h3>Meals</h3>

                    <div className="recipe-list-scroll">
                    {meals.map((meal) => (
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
                const mealId = menu.days?.[day]?.[slot];
                const meal = meals.find(m => m.id === mealId);

                const isDragOver = dragOverCell?.day === day && dragOverCell?.slot === slot;

                return (
                   <td
                        key={slot}
                        className={`menu-cell ${meal ? "filled" : "empty"} ${isDragOver ? "drag-over" : ""}`}
                        draggable={!!meal}
                        onDragStart={(e) => {
                            if (!mealId) return;
                            setDragOverCell(null); // Clear drag-over when starting to drag

                            setDragData(e, {
                                type: "cell",
                                mealId,
                                day,
                                slot,
                            });
                            }}
                        onDragEnter={(e) => {
                            e.preventDefault();
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
                            e.preventDefault();
                            setDragOverCell({ day, slot });
                        }}
                       onDrop={(e) => {
                            e.preventDefault();
                            setDragOverCell(null); // Clear drag-over state
                            
                            const data = getDragData(e);
                            if (!data) return;

                            setMenu((prev) => {
                                if (!prev) return prev;

                                const updated = structuredClone(prev);

                                // Prevent self-drop
                                if (
                                data.type === "cell" &&
                                data.day === day &&
                                data.slot === slot
                                ) {
                                return prev;
                                }

                                updated.days[day][slot] = data.mealId;

                                if (data.type === "cell") {
                                updated.days[data.day][data.slot] = undefined;
                                }

                                // Auto-save after updating menu
                                setTimeout(() => {
                                    saveMenu(updated);
                                }, 0);

                                return updated;
                            });
                            }}


                        >
                        <div className="menu-cell-content">
                            {meal ? meal.name : "Drop meal here"}
                        </div>
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
                            saveMenu();
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
