import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tip } from "../types/tip";
import "./styles/tipsAndTricks.css";

export default function TipsAndTricks() {
  const navigate = useNavigate();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTips();
  }, []);

  async function loadTips() {
    try {
      const loaded = await window.electronAPI.getTips();
      setTips(loaded);
    } catch (e) {
      console.error("Error loading tips:", e);
    } finally {
      setLoading(false);
    }
  }

  const sorted = [...tips].sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });

  return (
    <div className="tips-page">
      <div className="tips-header">
        <h1>Tips &amp; Tricks</h1>
        <button className="tips-new-button" onClick={() => navigate("/tips/new")}>
          + New entry
        </button>
      </div>

      {loading ? (
        <div className="tips-loading">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="tips-empty">
          <p>No tips yet. Add notes you want to remember for planning or on the trail.</p>
          <button className="tips-new-button" onClick={() => navigate("/tips/new")}>
            New entry
          </button>
        </div>
      ) : (
        <div className="tips-grid">
          {sorted.map((tip) => (
            <div
              key={tip.id}
              className="tip-card"
              onClick={() => navigate(`/tips/${tip.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/tips/${tip.id}`);
                }
              }}
            >
              <h3 className="tip-card-title">{tip.summary}</h3>
              {tip.updatedAt && (
                <div className="tip-card-meta">
                  Updated{" "}
                  {new Date(tip.updatedAt).toLocaleDateString(undefined, {
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
    </div>
  );
}
