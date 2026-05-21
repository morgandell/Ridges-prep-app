import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PastMenu } from "../types/pastMenu";
import { Menu, DayOfWeek, MealSlot } from "../types/menu";
import { Meal } from "../types/meal";
import SaveToPastMenuForm from "../components/SaveToPastMenuForm";
import "./styles/pastMenus.css";

const DAYS: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];

export default function PastMenus() {
  const navigate = useNavigate();
  const [pastMenus, setPastMenus] = useState<PastMenu[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingMenu, setViewingMenu] = useState<PastMenu | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [pastMenusResult, mealsData] = await Promise.all([
        window.electronAPI.getPastMenus(),
        window.electronAPI.getMeals(),
      ]);

      if (pastMenusResult.success && pastMenusResult.pastMenus) {
        setPastMenus(pastMenusResult.pastMenus);
      }
      setMeals(mealsData);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load past menus");
    } finally {
      setLoading(false);
    }
  }

  async function handleImportMenu(pastMenu: PastMenu) {
    if (!window.confirm(`Import "${pastMenu.name}" to replace the current menu?`)) {
      return;
    }

    try {
      const result = await window.electronAPI.saveMenu(pastMenu.menu);
      if (result.success) {
        alert("Menu imported successfully!");
        navigate("/menu");
      } else {
        setError(result.error || "Failed to import menu");
      }
    } catch (err) {
      console.error("Error importing menu:", err);
      setError("Failed to import menu");
    }
  }

  async function handleDeleteMenu(id: string, name: string) {
    if (!window.confirm(`Delete menu "${name}"?`)) {
      return;
    }

    try {
      const result = await window.electronAPI.deletePastMenu(id);
      if (result.success) {
        setPastMenus(prev => prev.filter(pm => pm.id !== id));
        if (viewingMenu?.id === id) {
          setViewingMenu(null);
        }
      } else {
        setError(result.error || "Failed to delete menu");
      }
    } catch (err) {
      console.error("Error deleting menu:", err);
      setError("Failed to delete menu");
    }
  }

  function getMealName(mealId: string | undefined): string {
    if (!mealId) return "";
    const meal = meals.find(m => m.id === mealId);
    return meal?.name || "Unknown meal";
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  if (loading) {
    return <div className="past-menus-page"><div className="loading">Loading past menus...</div></div>;
  }

  if (viewingMenu) {
    return (
      <div className="past-menus-page">
        <div className="past-menus-header">
          <button className="back-button" onClick={() => setViewingMenu(null)}>
            ← Back
          </button>
          <h1>{viewingMenu.name}</h1>
          <div className="past-menu-actions">
            <button className="import-button" onClick={() => handleImportMenu(viewingMenu)}>
              Import to Current Menu
            </button>
            <button className="delete-button" onClick={() => handleDeleteMenu(viewingMenu.id, viewingMenu.name)}>
              Delete
            </button>
          </div>
        </div>
        <div className="past-menu-preview">
          <p className="past-menu-date">Saved on: {formatDate(viewingMenu.date)}</p>
          <table className="past-menu-table">
            <thead>
              <tr>
                <th>Day</th>
                {SLOTS.map(slot => (
                  <th key={slot}>{slot.charAt(0).toUpperCase() + slot.slice(1)}</th>
                ))}
                <th>Dessert</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day}>
                  <td className="day">{day.charAt(0).toUpperCase() + day.slice(1)}</td>
                  {SLOTS.map(slot => {
                    const mealId = viewingMenu.menu.days[day]?.[slot];
                    return (
                      <td key={slot} className={mealId ? "filled" : "empty"}>
                        {getMealName(mealId)}
                      </td>
                    );
                  })}
                  <td className={viewingMenu.menu.days[day]?.dessert ? "filled" : "empty"}>
                    {getMealName(viewingMenu.menu.days[day]?.dessert)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="past-menus-page">
      <div className="past-menus-header">
        <h1>Past Menus</h1>
        <button className="add-button" onClick={() => setShowAddForm(true)}>
          + Save Current Menu
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showAddForm && (
        <SaveToPastMenuForm
          getMenu={() => window.electronAPI.getMenu()}
          onSaved={(pastMenu) => {
            setPastMenus(prev => [...prev, pastMenu]);
            setError(null);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {pastMenus.length === 0 ? (
        <div className="empty-state">
          <p>No past menus saved yet.</p>
          <p>Save your current menu to get started!</p>
        </div>
      ) : (
        <div className="past-menus-list">
  {pastMenus
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(pastMenu => (
      <div
        key={pastMenu.id}
        className="past-menu-card"
        onClick={() => setViewingMenu(pastMenu)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setViewingMenu(pastMenu);
          }
        }}
      >
        <div className="past-menu-card-header">
          <h3>{pastMenu.name}</h3>
          <span className="past-menu-date">
            {formatDate(pastMenu.date)}
          </span>
        </div>

        {/* <div className="past-menu-actions">
          <button
            className="import-button"
            onClick={(e) => {
              e.stopPropagation();
              handleImportMenu(pastMenu);
            }}
          >
            Import
          </button>
        </div> */}
      </div>
    ))}
</div>
        // <div className="past-menus-list">
        //   {pastMenus
        //     .sort((a, b) => b.date.localeCompare(a.date))
        //     .map(pastMenu => (
        //       <div key={pastMenu.id} className="past-menu-card">
        //         <div className="card-header">
        //           <h3>{pastMenu.name}</h3>
        //           <span className="past-menu-date">{formatDate(pastMenu.date)}</span>
        //         </div>
        //         <div className="card-actions">
        //           <button className="view-button" onClick={() => setViewingMenu(pastMenu)}>
        //             View
        //           </button>
        //           <button className="import-button" onClick={() => handleImportMenu(pastMenu)}>
        //             Import
        //           </button>
        //           <button className="delete-button" onClick={() => handleDeleteMenu(pastMenu.id, pastMenu.name)}>
        //             Delete
        //           </button>
        //         </div>
        //       </div>
        //     ))}
        // </div>
      )}
    </div>
  );
}
