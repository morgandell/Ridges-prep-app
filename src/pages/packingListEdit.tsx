import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PackingList } from "../types/packingList";
import "./styles/packingListEdit.css";

const DEFAULTS: Record<string, { title: string; items: string[] }> = {
  campers: {
    title: "Campers (before group gear)",
    items: [],
  },
  "group-gear": {
    title: "Group gear",
    items: [],
  },
  personal: {
    title: "Personal",
    items: [],
  },
};

export default function PackingListEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const defaults = useMemo(() => (id ? DEFAULTS[id] : undefined), [id]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [draftItem, setDraftItem] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Missing list id.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await window.electronAPI.getPackingList(id);
        if (cancelled) return;
        if (res.success && res.list) {
          setTitle(res.list.title || (defaults?.title ?? ""));
          setItems(Array.isArray(res.list.items) ? res.list.items : []);
        } else if (defaults) {
          // Not found yet — start from defaults
          setTitle(defaults.title);
          setItems(defaults.items);
        } else {
          setError("Packing list not found.");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not load packing list.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, defaults]);

  function addItem() {
    const trimmed = draftItem.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, trimmed]);
    setDraftItem("");
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveItem(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      const [it] = next.splice(idx, 1);
      next.splice(target, 0, it);
      return next;
    });
  }

  async function handleSave() {
    if (!id) return;
    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const payload: PackingList = {
        id,
        title: trimmedTitle,
        items,
      };
      const res = await window.electronAPI.savePackingList(payload);
      if (res.success) {
        navigate("/gear");
      } else {
        setError(res.error || "Save failed.");
      }
    } catch (e) {
      console.error(e);
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="packing-list-page">
        <div className="packing-list-loading">Loading…</div>
      </div>
    );
  }

  if (error && !id) {
    return (
      <div className="packing-list-page">
        <button type="button" className="packing-list-back" onClick={() => navigate("/gear")}>
          ← Back
        </button>
        <h1>Packing list</h1>
        <div className="packing-list-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="packing-list-page">
      <div className="packing-list-header">
        <button type="button" className="packing-list-back" onClick={() => navigate("/gear")}>
          ← Back
        </button>
        <div className="packing-list-actions">
          <button
            type="button"
            className="packing-list-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <h1>Packing list</h1>

      {error && <div className="packing-list-error">{error}</div>}

      <label className="packing-list-label">
        Title
        <input
          className="packing-list-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="List title"
        />
      </label>

      <div className="packing-items">
        <div className="packing-items-top">
          <h2>Items</h2>
          <div className="packing-add-row">
            <input
              className="packing-list-input"
              type="text"
              value={draftItem}
              onChange={(e) => setDraftItem(e.target.value)}
              placeholder="Add an item…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
            />
            <button type="button" className="packing-add" onClick={addItem}>
              Add
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="packing-empty">No items yet.</p>
        ) : (
          <ul className="packing-items-list">
            {items.map((item, idx) => (
              <li key={`${idx}-${item}`} className="packing-item">
                <span className="packing-item-text">{item}</span>
                <div className="packing-item-actions">
                  <button
                    type="button"
                    className="packing-item-btn"
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="packing-item-btn"
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === items.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="packing-item-remove"
                    onClick={() => removeItem(idx)}
                    title="Remove"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

