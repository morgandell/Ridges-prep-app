import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NoteEntry } from "../types/noteEntry";
import "./styles/noteEntry.css";

export default function NoteEntryDetail({
  backTo,
  loadOne,
  onDelete,
  editPathForId,
  titleFallback,
}: {
  backTo: string;
  titleFallback: string;
  loadOne: (id: string) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  editPathForId: (id: string) => string;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<NoteEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) {
        setLoading(false);
        setEntry(null);
        return;
      }
      try {
        const res = await loadOne(id);
        if (res.success && res.entry) setEntry(res.entry);
        else setEntry(null);
      } catch (e) {
        console.error(e);
        setEntry(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, loadOne]);

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("Delete this entry?")) return;
    try {
      const res = await onDelete(id);
      if (res.success) navigate(backTo);
      else alert(res.error || "Could not delete entry.");
    } catch (e) {
      console.error(e);
      alert("Could not delete entry.");
    }
  };

  if (loading) {
    return (
      <div className="note-detail">
        <div className="note-loading">Loading…</div>
      </div>
    );
  }

  if (!entry || !id) {
    return (
      <div className="note-detail">
        <button type="button" className="note-back" onClick={() => navigate(backTo)}>
          ← Back
        </button>
        <h1>{titleFallback}</h1>
        <p className="note-empty">Entry not found.</p>
      </div>
    );
  }

  return (
    <div className="note-detail">
      <div className="note-header">
        <button type="button" className="note-back" onClick={() => navigate(backTo)}>
          ← Back
        </button>
        <div className="note-actions">
          <button type="button" className="note-edit" onClick={() => navigate(editPathForId(id))}>
            Edit
          </button>
          <button type="button" className="note-delete" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <h1 className="note-title">{entry.summary}</h1>
      {entry.updatedAt && (
        <p className="note-updated">
          Updated{" "}
          {new Date(entry.updatedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}

      {entry.pdf?.path ? (
        <div className="note-attachment">
          <div className="note-attachment-row">
            <strong>PDF:</strong> {entry.pdf.name || "attachment.pdf"}
          </div>
          <button
            type="button"
            className="note-open-pdf"
            onClick={async () => {
              const res = await window.electronAPI.openPath(entry.pdf!.path);
              if (!res.success) alert(res.error || "Could not open PDF.");
            }}
          >
            Open PDF
          </button>
        </div>
      ) : null}

      <div className="note-body">
        {entry.body ? entry.body : <span className="note-empty-body">No additional notes.</span>}
      </div>
    </div>
  );
}

