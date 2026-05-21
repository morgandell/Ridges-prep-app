import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const nameInputRef = useRef<HTMLInputElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    const t = window.setTimeout(() => nameInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancelRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleSave() {
    if (!newMenuName.trim()) {
      setError("Please enter a menu name");
      nameInputRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const menu = await Promise.resolve(getMenu());
      const result = await saveMenuToPast(menu, newMenuName);
      if (result.success && result.pastMenu) {
        setNewMenuName("");
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

  const form = (
    <div
      className="save-to-past-menu-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="save-to-past-menu-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-past-menu-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 id="save-past-menu-title">Save Current Menu</h3>
        <input
          ref={nameInputRef}
          type="text"
          placeholder="Menu name (e.g., 'Week 1 - Summer 2024')"
          value={newMenuName}
          onChange={(e) => setNewMenuName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSave();
            }
          }}
          autoComplete="off"
        />
        {error && <div className="save-to-past-menu-form-error">{error}</div>}
        <div className="save-to-past-menu-form-actions">
          <button
            type="button"
            className="save-to-past-menu-form-save"
            onClick={() => void handleSave()}
            disabled={saving || !newMenuName.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="save-to-past-menu-form-cancel"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(form, document.body);
}
