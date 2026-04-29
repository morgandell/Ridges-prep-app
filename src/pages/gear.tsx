import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NoteEntry } from "../types/noteEntry";
import "./styles/gear.css";
import "./styles/tipsAndTricks.css";

export default function Gear() {
  const navigate = useNavigate();
  const [usageNotes, setUsageNotes] = useState<NoteEntry[]>([]);
  const [fixNotes, setFixNotes] = useState<NoteEntry[]>([]);

  const packingCards = useMemo(
    () => [
      {
        id: "campers",
        title: "Campers (before group gear)",
        description: "What campers should pack before checking shared gear.",
      },
      {
        id: "group-gear",
        title: "Group gear",
        description: "Shared gear checklists and quantities.",
      },
      {
        id: "personal",
        title: "Personal",
        description: "Personal packing lists for counselors/campers.",
      },
    ],
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const [usage, fixes] = await Promise.all([
          window.electronAPI.getGearUsageNotes(),
          window.electronAPI.getGearFixNotes(),
        ]);
        setUsageNotes(Array.isArray(usage) ? usage : []);
        setFixNotes(Array.isArray(fixes) ? fixes : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const sortedUsage = useMemo(() => {
    return [...usageNotes].sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
  }, [usageNotes]);

  const sortedFixes = useMemo(() => {
    return [...fixNotes].sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
  }, [fixNotes]);

  return (
    <div className="gear-page">
      <h1>Gear</h1>

      <div className="gear-section inventory">
        <h2>Inventory</h2>
        <p className="gear-muted">Inventory tracking coming soon.</p>
      </div>

      <div className="gear-section packing-list">
        <h2>Packing list</h2>
        <div className="gear-card-grid">
          {packingCards.map((c) => (
            <div
              key={c.id}
              className="gear-nav-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/gear/packing/${c.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/gear/packing/${c.id}`);
                }
              }}
            >
              <h3 className="gear-nav-card-title">{c.title}</h3>
              <p className="gear-nav-card-desc">{c.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="gear-section usage">
        <div className="tips-header">
          <h2>How to use and maintain equipment</h2>
          <button className="tips-new-button" onClick={() => navigate("/gear/usage/new")}>
            + New entry
          </button>
        </div>
        {sortedUsage.length === 0 ? (
          <div className="tips-empty">
            <p>No notes yet. Add quick reminders for setup, care, and best practices.</p>
            <button className="tips-new-button" onClick={() => navigate("/gear/usage/new")}>
              New entry
            </button>
          </div>
        ) : (
          <div className="tips-grid">
            {sortedUsage.map((entry) => (
              <div
                key={entry.id}
                className="tip-card"
                onClick={() => navigate(`/gear/usage/${entry.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/gear/usage/${entry.id}`);
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

      <div className="gear-section fixes">
        <div className="tips-header">
          <h2>Fixes</h2>
          <button className="tips-new-button" onClick={() => navigate("/gear/fixes/new")}>
            + New entry
          </button>
        </div>
        {sortedFixes.length === 0 ? (
          <div className="tips-empty">
            <p>No fixes yet. Add field fixes, repair tips, and troubleshooting notes.</p>
            <button className="tips-new-button" onClick={() => navigate("/gear/fixes/new")}>
              New entry
            </button>
          </div>
        ) : (
          <div className="tips-grid">
            {sortedFixes.map((entry) => (
              <div
                key={entry.id}
                className="tip-card"
                onClick={() => navigate(`/gear/fixes/${entry.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/gear/fixes/${entry.id}`);
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