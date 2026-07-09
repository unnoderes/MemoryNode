"use client";

import Link from "next/link";
import { useState } from "react";
import { searchMemories } from "../../lib/api";

export default function MemoriesPage() {
  const [q, setQ] = useState("");
  const [memories, setMemories] = useState([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSearch(event) {
    event.preventDefault();
    const term = q.trim();
    if (!term) {
      setError("Search query is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = await searchMemories(term);
      setMemories(body.memories || []);
      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Memories</h1>

      <form onSubmit={onSearch}>
        <label>
          Search
          <input value={q} onChange={(event) => setQ(event.target.value)} />
        </label>
        <div className="row">
          <button disabled={busy} type="submit">
            Search
          </button>
        </div>
      </form>

      {error ? <p className="error">{error}</p> : null}
      {searched && memories.length === 0 ? <p className="empty">No memories found.</p> : null}

      <section className="grid">
        {memories.map((memory) => (
          <article className="card grid" key={memory.id}>
            <Link href={`/memories/${memory.id}`}>
              <strong>{memory.content}</strong>
            </Link>
            <p className="meta">
              {memory.type} | {memory.status}
              {typeof memory.score === "number" ? ` | score ${memory.score}` : ""}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
