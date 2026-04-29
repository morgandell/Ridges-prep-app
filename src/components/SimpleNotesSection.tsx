import React, { useEffect, useMemo, useState } from "react";
import { NoteEntry } from "../types/noteEntry";
import "./styles/simpleNotesSection.css";

type SaveResult = { success: boolean; entry?: NoteEntry; error?: string };
type DeleteResult = { success: boolean; error?: string };

export default function SimpleNotesSection({
  title,
  emptyText,
  load,
  save,
  remove,
}: {
  title: string;
  emptyText: string;
  load: () => Promise<NoteEntry[]>;
  save: (entry: NoteEntry) => Promise<SaveResult>;
  remove: (id: string) => Promise<DeleteResult>;
}) {
  const [entries, setEntries] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await load();
        setEntries(Array.isArray(loaded) ? loaded : []);
      } catch (e) {
        console.error(e);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
  }, [entries]);

  function openNew() {
    setEditingId(null);
    setSummary("");
    setBody("");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(entry: NoteEntry) {
    setEditingId(entry.id);
    setSummary(entry.summary || "");
    setBody(entry.body || "");
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = summary.trim();
    if (!trimmed) {
      setError("Summary is required.");
      return;
    }
    setSaving(true);
    try {
      const payload: NoteEntry = {
        id: editingId || "",
        summary: trimmed,
        body,
      };
      const res = await save(payload);
      if (res.success && res.entry) {
        setEntries((prev) => {
          const idx = prev.findIndex((p) => p.id === res.entry!.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = res.entry!;
            return next;
          }
          return [...prev, res.entry!];
        });
        setModalOpen(false);
      } else {
        setError(res.error || "Save failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    if (!window.confirm("Delete this entry?")) return;
    setSaving(true);
    try {
      const res = await remove(editingId);
      if (res.success) {
        setEntries((prev) => prev.filter((p) => p.id !== editingId));
        setModalOpen(false);
      } else {
        setError(res.error || "Delete failed.");
      }
    } catch (e) {
      console.error(e);
      setError("Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="simple-notes-section">
      <div className="simple-notes-header">
        <h2>{title}</h2>
        <button type="button" className="simple-notes-new" onClick={openNew}>
          + New entry
        </button>
      </div>

      {loading ? (
        <div className="simple-notes-loading">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="simple-notes-empty">
          <p>{emptyText}</p>
          <button type="button" className="simple-notes-new" onClick={openNew}>
            New entry
          </button>
        </div>
      ) : (
        <div className="simple-notes-grid">
          {sorted.map((entry) => (
            <div
              key={entry.id}
              className="simple-note-card"
              onClick={() => openEdit(entry)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openEdit(entry);
                }
              }}
            >
              <h3 className="simple-note-card-title">{entry.summary}</h3>
              {entry.updatedAt && (
                <div className="simple-note-card-meta">
                  Updated{" "}
                  {new Date(entry.updatedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="simple-notes-modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="simple-notes-modal" role="dialog" aria-modal="true">
            <div className="simple-notes-modal-top">
              <h3 className="simple-notes-modal-title">
                {editingId ? "Edit entry" : "New entry"}
              </h3>
              <button
                type="button"
                className="simple-notes-modal-close"
                onClick={closeModal}
                aria-label="Close"
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <form className="simple-notes-form" onSubmit={handleSave}>
              {error && <div className="simple-notes-error">{error}</div>}

              <label className="simple-notes-label">
                Summary
                <input
                  type="text"
                  className="simple-notes-input"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Short title or preview"
                  autoFocus
                />
              </label>

              <label className="simple-notes-label">
                Notes
                <textarea
                  className="simple-notes-textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Full details — as much as you need"
                  rows={10}
                />
              </label>

              <div className="simple-notes-actions">
                {editingId && (
                  <button
                    type="button"
                    className="simple-notes-delete"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Delete
                  </button>
                )}
                <div className="simple-notes-actions-right">
                  <button
                    type="button"
                    className="simple-notes-cancel"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="simple-notes-save" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

