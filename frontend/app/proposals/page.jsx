"use client";

import { useEffect, useState } from "react";
import {
  approveProposal,
  extractProposals,
  listProposals,
  rejectProposal,
} from "../../lib/api";

const DEMO_TRANSCRIPT = `这个项目必须使用 Qwen Cloud，而不是 OpenAI API。
我们已经决定 MVP 使用 FastAPI、SQLite 和 Next.js。
已批准的记忆必须可审计、可解释，并且可以撤销。`;

const MEMORY_TYPE_LABELS = {
  user_preference: "用户偏好",
  project_constraint: "项目约束",
  project_decision: "项目决策",
  recurring_workflow: "重复工作流",
  known_pitfall: "已知坑点",
  fact: "事实",
};

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
      setError("请输入原始记录。");
      return;
    }
    await run(async () => {
      const body = await extractProposals({ actorId, projectId, transcript: text });
      setMessage(`已抽取 ${(body.proposals || []).length} 条记忆提案。`);
      setTranscript("");
    });
  }

  return (
    <main>
      <h1>记忆提案</h1>
      <p className="muted">抽取只会创建待审核提案，不会自动批准为长期记忆。</p>

      <form onSubmit={onExtract}>
        <div className="two-col">
          <label>
            用户 ID
            <input value={actorId} onChange={(event) => setActorId(event.target.value)} />
          </label>
          <label>
            项目 ID
            <input value={projectId} onChange={(event) => setProjectId(event.target.value)} />
          </label>
        </div>
        <label>
          原始记录
          <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} />
        </label>
        <div className="row">
          <button disabled={busy} type="submit">
            抽取提案
          </button>
        </div>
      </form>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}

      <section className="grid">
        <h2>待审核提案</h2>
        {proposals.length === 0 ? <p className="empty">暂无待审核提案。</p> : null}
        {proposals.map((proposal) => (
          <article className="card grid" key={proposal.id}>
            <div>
              <strong>{proposal.content}</strong>
              <p className="meta">
                {MEMORY_TYPE_LABELS[proposal.type] || proposal.type} | 置信度 {proposal.confidence}
              </p>
            </div>
            {proposal.source_quote ? <p className="pre">{proposal.source_quote}</p> : null}
            {proposal.reason ? <p className="muted">{proposal.reason}</p> : null}
            <div className="row">
              <button disabled={busy} onClick={() => run(() => approveProposal(proposal.id))}>
                批准
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => run(() => rejectProposal(proposal.id))}
              >
                拒绝
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
