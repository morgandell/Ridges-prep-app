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

  async function saveMenu() {
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

        setMenu(createEmptyMenu());
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

            <button className="save-menu-btn" onClick={saveMenu}>
            Save Menu
            </button>
        </div>
        </div>
        <div className="menu-page">
            <div className="recipe-list">
                    <h3>Meals</h3>

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

                return (
                   <td
                        key={slot}
                        className={`menu-cell ${meal ? "filled" : "empty"}`}
                        draggable={!!meal}
                        onDragStart={(e) => {
                            if (!mealId) return;

                            setDragData(e, {
                                type: "cell",
                                mealId,
                                day,
                                slot,
                            });
                            }}

                        onDragOver={(e) => e.preventDefault()}
                       onDrop={(e) => {
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
                const data = getDragData(e);
                if (data?.type === "cell") {
                setMeal(data.day, data.slot, undefined);
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
