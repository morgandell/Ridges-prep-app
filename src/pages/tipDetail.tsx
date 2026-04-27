import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tip } from "../types/tip";
import CommentsSection from "../components/CommentsSection";
import "./styles/tipsAndTricks.css";

export default function TipDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tip, setTip] = useState<Tip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const result = await window.electronAPI.getTip(id);
        if (result.success && result.tip) {
          setTip(result.tip);
        } else {
          setTip(null);
        }
      } catch (e) {
        console.error(e);
        setTip(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!tip || !window.confirm("Delete this entry?")) return;
    try {
      const result = await window.electronAPI.deleteTip(tip.id);
      if (result.success) navigate("/tips");
    } catch (e) {
      console.error(e);
      alert("Could not delete entry.");
    }
  };

  if (loading) {
    return (
      <div className="tip-detail">
        <div className="tip-detail-loading">Loading…</div>
      </div>
    );
  }

  if (!tip) {
    return (
      <div className="tip-detail">
        <button type="button" className="tip-back-button" onClick={() => navigate("/tips")}>
          ← Back
        </button>
        <h1>Entry not found</h1>
      </div>
    );
  }

  return (
    <div className="tip-detail">
      <div className="tip-detail-header">
        <button type="button" className="tip-back-button" onClick={() => navigate("/tips")}>
          ← Back
        </button>
        <div className="tip-detail-actions">
          <button type="button" className="tip-edit-button" onClick={() => navigate(`/tips/${tip.id}/edit`)}>
            Edit
          </button>
          <button type="button" className="tip-delete-button" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <h1 className="tip-detail-title">{tip.summary}</h1>
      {tip.updatedAt && (
        <p className="tip-detail-updated">
          Updated{" "}
          {new Date(tip.updatedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}

      <div className="tip-detail-body">{tip.body || <span className="tip-detail-empty-body">No additional notes.</span>}</div>

      <CommentsSection
        comments={tip.comments ?? []}
        onAdd={async (comment) => {
          const next = [...(tip.comments ?? []), comment];
          const res = await window.electronAPI.saveTip({ ...tip, comments: next });
          if (res.success && res.tip) {
            setTip(res.tip);
          } else {
            alert(res.error || "Could not save comment");
          }
        }}
      />
    </div>
  );
}
