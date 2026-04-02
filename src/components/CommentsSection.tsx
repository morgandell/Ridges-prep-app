import React, { useState } from "react";
import { ItemComment } from "../types/itemComment";
import "./CommentsSection.css";

type Props = {
  comments: ItemComment[];
  onAdd: (comment: ItemComment) => Promise<void>;
};

export default function CommentsSection({ comments, onAdd }: Props) {
  const [authorName, setAuthorName] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e?: React.FormEvent | React.MouseEvent) {
    e?.preventDefault();
    const name = authorName.trim();
    const body = text.trim();
    if (!name || !body) return;
    setSaving(true);
    const comment: ItemComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      authorName: name,
      text: body,
      createdAt: new Date().toISOString(),
    };
    try {
      await onAdd(comment);
      setText("");
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...comments].sort((a, b) => {
    const ta = a.createdAt || a.id || "";
    const tb = b.createdAt || b.id || "";
    return ta.localeCompare(tb);
  });

  return (
    <div className="comments-section">
      <h2>Comments</h2>
      <p className="comments-count" aria-live="polite">
        {sorted.length === 0
          ? "No comments yet."
          : `${sorted.length} comment${sorted.length === 1 ? "" : "s"}`}
      </p>

      {sorted.length > 0 && (
        <ul className="comments-list">
          {sorted.map((c) => (
            <li key={c.id} className="comments-item">
              <div className="comments-meta">
                <strong>{c.authorName || "Anonymous"}</strong>
                {c.createdAt && (
                  <span className="comments-date">
                    {new Date(c.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                )}
              </div>
              <p className="comments-text">{c.text}</p>
            </li>
          ))}
        </ul>
      )}

      {/* div (not form) so this can sit inside other forms, e.g. meal/route edit */}
      <div className="comments-form">
        <label className="comments-label">
          Your name
          <input
            type="text"
            className="comments-input"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Name"
            maxLength={120}
          />
        </label>
        <label className="comments-label">
          Comment
          <textarea
            className="comments-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            rows={4}
          />
        </label>
        <button
          type="button"
          className="comments-submit"
          disabled={saving}
          onClick={(e) => handleSubmit(e)}
        >
          {saving ? "Saving…" : "Add comment"}
        </button>
      </div>
    </div>
  );
}
