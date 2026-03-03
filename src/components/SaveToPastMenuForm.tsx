import React, { useState } from "react";
import { Menu } from "../types/menu";
import { PastMenu } from "../types/pastMenu";
import { saveMenuToPast } from "../utils/saveToPastMenu";
import "./SaveToPastMenuForm.css";

interface SaveToPastMenuFormProps {
  /** Returns the menu to save (from state or API) */
  getMenu: () => Menu | Promise<Menu>;
  onSaved?: (pastMenu: PastMenu) => void;
  onCancel: () => void;
}

export default function SaveToPastMenuForm({
  getMenu,
  onSaved,
  onCancel,
}: SaveToPastMenuFormProps) {
  const [newMenuName, setNewMenuName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    try {
      const menu = await Promise.resolve(getMenu());
      const result = await saveMenuToPast(menu, newMenuName);
      if (result.success && result.pastMenu) {
        setNewMenuName("");
        setError(null);
        onSaved?.(result.pastMenu);
        onCancel();
      } else {
        setError(result.error || "Failed to save menu");
      }
    } catch (err) {
      console.error("Error saving menu:", err);
      setError("Failed to save menu");
    } finally {
      setSaving(false);
    }
  }

  function handleSaveClick() {
    if (!newMenuName.trim()) {
      setError("Please enter a menu name");
      return;
    }
    setSaving(true);
    handleSubmit();
  }

  return (
    <div className="save-to-past-menu-form">
      <h3>Save Current Menu</h3>
      <input
        type="text"
        placeholder="Menu name (e.g., 'Week 1 - Summer 2024')"
        value={newMenuName}
        onChange={(e) => setNewMenuName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSaveClick();
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        autoFocus
        disabled={saving}
      />
      {error && <div className="save-to-past-menu-form-error">{error}</div>}
      <div className="save-to-past-menu-form-actions">
        <button
          className="save-to-past-menu-form-save"
          onClick={handleSaveClick}
          disabled={saving || !newMenuName.trim()}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          className="save-to-past-menu-form-cancel"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
