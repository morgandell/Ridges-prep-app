import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tip } from "../types/tip";
import "./tipsAndTricks.css";

export default function TipEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await window.electronAPI.getTip(id);
        if (cancelled) return;
        if (result.success && result.tip) {
          setSummary(result.tip.summary);
          setBody(result.tip.body || "");
        } else {
          setError("Could not load entry.");
        }
      } catch (e) {
        if (!cancelled) setError("Could not load entry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

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
      const tip: Tip = {
        id: id || "",
        summary: trimmed,
        body,
      };
      const result = await window.electronAPI.saveTip(tip);
      if (result.success && result.tip) {
        navigate(`/tips/${result.tip.id}`);
      } else {
        setError(result.error || "Save failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="tip-edit-page">
        <div className="tips-loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="tip-edit-page">
      <button type="button" className="tip-back-button" onClick={() => navigate(isEditing ? `/tips/${id}` : "/tips")}>
        ← Back
      </button>

      <h1>{isEditing ? "Edit entry" : "New entry"}</h1>

      <form className="tip-edit-form" onSubmit={handleSubmit}>
        {error && <div className="tip-edit-error">{error}</div>}

        <label className="tip-edit-label">
          Summary
          <input
            type="text"
            className="tip-edit-input"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Short title or preview"
            autoFocus
          />
        </label>

        <label className="tip-edit-label">
          Notes
          <textarea
            className="tip-edit-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Full details — as much as you need"
            rows={14}
          />
        </label>

        <div className="tip-edit-actions">
          <button type="submit" className="tips-new-button" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="tip-cancel-button"
            onClick={() => navigate(isEditing ? `/tips/${id}` : "/tips")}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
