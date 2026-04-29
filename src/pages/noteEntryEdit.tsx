import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NoteEntry } from "../types/noteEntry";
import "./styles/noteEntry.css";

export default function NoteEntryEdit({
  backTo,
  loadOne,
  save,
  attachPdf,
  removePdf,
  detailPathForId,
  title,
}: {
  title: string;
  backTo: string;
  loadOne: (id: string) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  save: (entry: NoteEntry) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  attachPdf: (
    id: string,
    filename: string,
    bytes: Uint8Array
  ) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  removePdf: (id: string) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  detailPathForId: (id: string) => string;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingPdf, setExistingPdf] = useState<NoteEntry["pdf"] | undefined>(undefined);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditing || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await loadOne(id);
        if (cancelled) return;
        if (res.success && res.entry) {
          setSummary(res.entry.summary);
          setBody(res.entry.body || "");
          setExistingPdf(res.entry.pdf);
        } else {
          setError(res.error || "Could not load entry.");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not load entry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEditing, loadOne]);

  async function readFileAsBytes(file: File): Promise<Uint8Array> {
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  }

  async function handleSubmit(e: React.FormEvent) {
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
        id: id || "",
        summary: trimmed,
        body,
        pdf: existingPdf,
      };
      const res = await save(payload);
      if (!res.success || !res.entry) {
        setError(res.error || "Save failed.");
        return;
      }

      let nextEntry = res.entry;

      if (selectedPdf) {
        const bytes = await readFileAsBytes(selectedPdf);
        const attachRes = await attachPdf(nextEntry.id, selectedPdf.name, bytes);
        if (!attachRes.success || !attachRes.entry) {
          setError(attachRes.error || "PDF upload failed.");
          return;
        }
        nextEntry = attachRes.entry;
      }

      navigate(detailPathForId(nextEntry.id));
    } catch (err) {
      console.error(err);
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="note-edit-page">
        <div className="note-loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="note-edit-page">
      <button type="button" className="note-back" onClick={() => navigate(isEditing ? detailPathForId(id!) : backTo)}>
        ← Back
      </button>

      <h1>{isEditing ? `Edit ${title}` : `New ${title}`}</h1>

      <form className="note-edit-form" onSubmit={handleSubmit}>
        {error && <div className="note-error">{error}</div>}

        <label className="note-label">
          Summary
          <input
            type="text"
            className="note-input"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Short title or preview"
            autoFocus
          />
        </label>

        <label className="note-label">
          Notes
          <textarea
            className="note-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Full details — as much as you need"
            rows={14}
          />
        </label>

        <div className="note-attachment-edit">
          <div className="note-attachment-edit-top">
            <strong>PDF attachment (optional)</strong>
          </div>

          {existingPdf?.path && (
            <div className="note-attachment-existing">
              <div className="note-attachment-row">
                Current: {existingPdf.name || "attachment.pdf"}
              </div>
              <div className="note-attachment-actions">
                <button
                  type="button"
                  className="note-open-pdf"
                  onClick={async () => {
                    const res = await window.electronAPI.openPath(existingPdf.path);
                    if (!res.success) alert(res.error || "Could not open PDF.");
                  }}
                  disabled={saving}
                >
                  Open PDF
                </button>
                {isEditing && id && (
                  <button
                    type="button"
                    className="note-remove-pdf"
                    onClick={async () => {
                      if (!window.confirm("Remove the attached PDF?")) return;
                      const res = await removePdf(id);
                      if (res.success && res.entry) {
                        setExistingPdf(res.entry.pdf);
                      } else {
                        alert(res.error || "Could not remove PDF.");
                      }
                    }}
                    disabled={saving}
                  >
                    Remove PDF
                  </button>
                )}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setSelectedPdf(f);
            }}
            className="note-file-input"
          />
          {selectedPdf && (
            <div className="note-selected-file">
              Selected: <strong>{selectedPdf.name}</strong>
              <button
                type="button"
                className="note-clear-selected"
                onClick={() => {
                  setSelectedPdf(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={saving}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="note-edit-actions">
          <button type="submit" className="note-save" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="note-cancel"
            onClick={() => navigate(isEditing ? detailPathForId(id!) : backTo)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

