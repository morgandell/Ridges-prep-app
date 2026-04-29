import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PackingList } from "../types/packingList";
import "./styles/packingListPrint.css";

const DEFAULTS: Record<string, { title: string; items: string[] }> = {
  inventory: { title: "Inventory", items: [] },
  campers: { title: "Campers (before group gear)", items: [] },
  "group-gear": { title: "Group gear", items: [] },
  personal: { title: "Personal", items: [] },
};

export default function PackingListPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const defaults = useMemo(() => (id ? DEFAULTS[id] : undefined), [id]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<PackingList | null>(null);

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
          setList(res.list);
        } else if (defaults) {
          setList({ id, title: defaults.title, items: defaults.items });
        } else {
          setError("Packing list not found.");
          setList(null);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Could not load packing list.");
          setList(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, defaults]);

  if (loading) {
    return <div className="packing-print-page">Loading…</div>;
  }

  if (!list || !id) {
    return (
      <div className="packing-print-page">
        <div className="packing-print-header no-print">
          <button type="button" className="packing-print-back" onClick={() => navigate("/gear")}>
            ← Back
          </button>
        </div>
        <h1 className="packing-print-title">Packing list</h1>
        <div className="packing-print-error">{error || "Not found."}</div>
      </div>
    );
  }

  return (
    <div className="packing-print-page">
      <div className="packing-print-header no-print">
        <button
          type="button"
          className="packing-print-back"
          onClick={() => navigate(`/gear/packing/${id}`)}
        >
          ← Back
        </button>
        <button type="button" className="packing-print-button" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      <div className="packing-print-content">
        <h1 className="packing-print-title">{list.title || "Packing list"}</h1>
        <p className="packing-print-meta">Checklist</p>

        {list.items.length === 0 ? (
          <p className="packing-print-empty">No items yet.</p>
        ) : (
          <ul className="packing-print-list">
            {list.items.map((item, idx) => (
              <li key={`${idx}-${item}`} className="packing-print-item">
                <span className="packing-print-box" aria-hidden="true" />
                <span className="packing-print-text">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

