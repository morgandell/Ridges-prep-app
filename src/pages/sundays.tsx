import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NoteEntry } from "../types/noteEntry";
import "./styles/sundays.css";
import "./styles/tipsAndTricks.css";

export default function Sundays() {
  const navigate = useNavigate();
  const [tips, setTips] = useState<NoteEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await window.electronAPI.getSundayCounselorTips();
        setTips(Array.isArray(loaded) ? loaded : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    return [...tips].sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
  }, [tips]);

  return (
    <div className="sundays-page">
      <h1>Sundays</h1>
      <div className="static-Sunday-info">
        <p>Welcome to Ridges Prep!</p>
        <p>more info will go here eventually...</p>
      </div>
      <div className="sunday-input">
        <div className="tips-header">
          <h2>Counselor tips</h2>
          <button className="tips-new-button" onClick={() => navigate("/sundays/counselor-tips/new")}>
            + New entry
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="tips-empty">
            <p>No counselor tips yet. Add reminders, scripts, and things you wish you’d known on day one.</p>
            <button className="tips-new-button" onClick={() => navigate("/sundays/counselor-tips/new")}>
              New entry
            </button>
          </div>
        ) : (
          <div className="tips-grid">
            {sorted.map((entry) => (
              <div
                key={entry.id}
                className="tip-card"
                onClick={() => navigate(`/sundays/counselor-tips/${entry.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/sundays/counselor-tips/${entry.id}`);
                  }
                }}
              >
                <h3 className="tip-card-title">{entry.summary}</h3>
                {entry.updatedAt && (
                  <div className="tip-card-meta">
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
      </div>
    </div>
  );
}