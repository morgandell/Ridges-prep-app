import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PackingList } from "../types/packingList";
import "./styles/packingListEdit.css";

const DEFAULTS: Record<string, { title: string; items: string[] }> = {
  inventory: {
    title: "Inventory",
    items: [],
  },
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
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedRef = useRef<{ title: string; itemsJson: string } | null>(null);

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
          lastSavedRef.current = {
            title: (res.list.title || (defaults?.title ?? "")).trim(),
            itemsJson: JSON.stringify(Array.isArray(res.list.items) ? res.list.items : []),
          };
          setDirty(false);
        } else if (defaults) {
          // Not found yet — start from defaults
          setTitle(defaults.title);
          setItems(defaults.items);
          lastSavedRef.current = {
            title: defaults.title.trim(),
            itemsJson: JSON.stringify(defaults.items),
          };
          setDirty(false);
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
    setDirty(true);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
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
    setDirty(true);
  }

  async function saveNow(opts?: { navigateBack?: boolean }) {
    if (!id) return;
    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    const snapshot = { title: trimmedTitle, itemsJson: JSON.stringify(items) };
    const last = lastSavedRef.current;
    if (last && last.title === snapshot.title && last.itemsJson === snapshot.itemsJson) {
      setDirty(false);
      if (opts?.navigateBack) navigate("/gear");
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
        lastSavedRef.current = snapshot;
        setDirty(false);
        if (opts?.navigateBack) navigate("/gear");
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

  // Auto-save (debounced)
  useEffect(() => {
    if (!id) return;
    if (loading) return;
    if (!dirty) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveNow();
    }, 650);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, items, dirty, id, loading]);

  async function handleBack() {
    if (saving) return;
    if (!dirty) {
      navigate("/gear");
      return;
    }
    await saveNow({ navigateBack: true });
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
        <button type="button" className="packing-list-back" onClick={handleBack} disabled={saving}>
          ← Back
        </button>
        <div className="packing-list-actions">
          {id && (
            <button
              type="button"
              className="packing-list-print"
              onClick={() => navigate(`/gear/packing/${id}/print`)}
              disabled={saving}
            >
              Print
            </button>
          )}
          <span className="packing-list-status" aria-live="polite">
            {saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
          </span>
        </div>
      </div>

      {/* <h1>Packing list</h1> */}

      {error && <div className="packing-list-error">{error}</div>}

      <label className="packing-list-label">
        Title
        <input
          className="packing-list-input"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
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

