"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { explainMemory, revokeMemory } from "../../../lib/api";

export default function MemoryDetailPage() {
  const pathname = usePathname();
  const id = decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "");
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const body = await explainMemory(id);
    setDetail(body);
  }

  useEffect(() => {
    if (id) {
      refresh().catch((err) => setError(err.message));
    }
  }, [id]);

  async function onRevoke() {
    setBusy(true);
    setError("");
    try {
      await revokeMemory(id);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const memory = detail?.memory;
  const proposal = detail?.proposal;
  const events = detail?.events || [];

  return (
    <main>
      <h1>Memory Detail</h1>

      {error ? <p className="error">{error}</p> : null}
      {!detail && !error ? <p className="empty">Loading memory...</p> : null}

      {detail ? (
        <section className="grid">
          <article className="card grid">
            <div className="row">
              <strong>{memory.content}</strong>
              {memory.status === "active" ? (
                <button className="danger" disabled={busy} onClick={onRevoke}>
                  Revoke
                </button>
              ) : null}
            </div>
            <p className="meta">
              status {memory.status} | type {memory.type}
            </p>
          </article>

          <article className="card grid">
            <h2>Source quote</h2>
            <p className="pre">{proposal.source_quote || "No source quote."}</p>
          </article>

          <article className="card grid">
            <h2>Reason</h2>
            <p>{proposal.reason || "No reason."}</p>
          </article>

          <article className="card grid">
            <h2>Events</h2>
            {events.length === 0 ? <p className="muted">No events.</p> : null}
            {events.map((event) => (
              <div className="pre" key={event.id}>
                {event.created_at} | {event.event_type} | {event.actor_id}
                {event.note ? ` | ${event.note}` : ""}
              </div>
            ))}
          </article>
        </section>
      ) : null}
    </main>
  );
}
