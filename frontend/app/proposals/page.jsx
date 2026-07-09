"use client";

import { useEffect, useState } from "react";
import {
  approveProposal,
  extractProposals,
  listProposals,
  rejectProposal,
} from "../../lib/api";

const DEMO_TRANSCRIPT = `This project must use Qwen Cloud instead of OpenAI APIs.
We decided to use FastAPI, SQLite, and Next.js for the MVP.
Keep approved memories auditable and revocable.`;

export default function ProposalsPage() {
  const [actorId, setActorId] = useState("demo-user");
  const [projectId, setProjectId] = useState("memorynode-demo");
  const [transcript, setTranscript] = useState(DEMO_TRANSCRIPT);
  const [proposals, setProposals] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const body = await listProposals();
    setProposals(body.proposals || []);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, []);

  async function run(action) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onExtract(event) {
    event.preventDefault();
    const text = transcript.trim();
    if (!text) {
      setError("Transcript is required.");
      return;
    }
    await run(async () => {
      const body = await extractProposals({ actorId, projectId, transcript: text });
      setMessage(`Extracted ${(body.proposals || []).length} proposal(s).`);
      setTranscript("");
    });
  }

  return (
    <main>
      <h1>Proposals</h1>
      <p className="muted">Extract creates pending proposals; it does not approve memories.</p>

      <form onSubmit={onExtract}>
        <div className="two-col">
          <label>
            actor_id
            <input value={actorId} onChange={(event) => setActorId(event.target.value)} />
          </label>
          <label>
            project_id
            <input value={projectId} onChange={(event) => setProjectId(event.target.value)} />
          </label>
        </div>
        <label>
          Raw transcript
          <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} />
        </label>
        <div className="row">
          <button disabled={busy} type="submit">
            Extract
          </button>
        </div>
      </form>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}

      <section className="grid">
        <h2>Pending proposals</h2>
        {proposals.length === 0 ? <p className="empty">No pending proposals.</p> : null}
        {proposals.map((proposal) => (
          <article className="card grid" key={proposal.id}>
            <div>
              <strong>{proposal.content}</strong>
              <p className="meta">
                {proposal.type} | confidence {proposal.confidence}
              </p>
            </div>
            {proposal.source_quote ? <p className="pre">{proposal.source_quote}</p> : null}
            {proposal.reason ? <p className="muted">{proposal.reason}</p> : null}
            <div className="row">
              <button disabled={busy} onClick={() => run(() => approveProposal(proposal.id))}>
                Approve
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => run(() => rejectProposal(proposal.id))}
              >
                Reject
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
