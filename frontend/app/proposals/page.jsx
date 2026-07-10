"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  approveProposal,
  extractProposals,
  listProposals,
  relatedMemories,
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
  const [relatedByProposal, setRelatedByProposal] = useState({});
  const [relatedLoading, setRelatedLoading] = useState({});
  const [supersedeByProposal, setSupersedeByProposal] = useState({});
  const [expiresByProposal, setExpiresByProposal] = useState({});
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
      setMessage(`已成功从输入记录中抽取并生成 ${(body.proposals || []).length} 条待审核提案。`);
      setTranscript("");
    });
  }

  async function loadRelated(proposalId) {
    setError("");
    setRelatedLoading((current) => ({ ...current, [proposalId]: true }));
    try {
      const body = await relatedMemories(proposalId);
      setRelatedByProposal((current) => ({ ...current, [proposalId]: body.memories || [] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setRelatedLoading((current) => ({ ...current, [proposalId]: false }));
    }
  }

  return (
    <div className="proposals-container">
      <header className="page-header">
        <h1>记忆提案管理</h1>
        <p className="muted">从多源会话或系统记录中抽取长期记忆提议，并在此进行人工审核与入库把关。</p>
      </header>

      {/* Governance Boundary Alert */}
      <div className="governance-banner">
        <svg className="banner-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: '4px', color: '#93c5fd' }}>长期记忆写入控制边界</h4>
          <p style={{ fontSize: '13px', opacity: 0.9 }}>
            大模型抽取的新提案<strong>仅存在于临时审核队列中，并不会自动写入长期记忆库</strong>。所有持久记忆实体都必须经过下方人工审核流程（批准或拒绝），以确保知识底座的安全与精确性。
          </p>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="notice">{message}</div> : null}

      <div className="proposals-layout">
        {/* Main section: Pending Proposals (Left Column) */}
        <section className="proposals-main">
          <h2>待审核提案队列 ({proposals.length})</h2>
          {proposals.length === 0 ? (
            <div className="empty">
              <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>暂无待审核的记忆提案</span>
              <p style={{ fontSize: '13px', opacity: 0.7 }}>您可以使用右侧的控制面板提取新的提案。</p>
            </div>
          ) : null}

          <div className="grid">
            {proposals.map((proposal) => (
              <article className="proposal-card" key={proposal.id}>
                <div className="proposal-card-header">
                  <div className="proposal-content-wrapper">
                    <span className="proposal-content-label">记忆提议写入内容</span>
                    <h3 className="proposal-content-text">{proposal.content}</h3>
                  </div>
                  <div className="proposal-meta-badges">
                    <span className="badge badge-type">
                      {MEMORY_TYPE_LABELS[proposal.type] || proposal.type}
                    </span>
                    <span className="badge badge-confidence">
                      置信度: {proposal.confidence}
                    </span>
                  </div>
                </div>

                {proposal.source_quote ? (
                  <div className="proposal-field">
                    <div className="field-title">来源摘录证据</div>
                    <blockquote className="pre source-quote">
                      {proposal.source_quote}
                    </blockquote>
                  </div>
                ) : null}

                {proposal.reason ? (
                  <div className="proposal-field">
                    <div className="field-title">模型抽取理由说明</div>
                    <div className="proposal-reason-box">
                      {proposal.reason}
                    </div>
                  </div>
                ) : null}

                <div className="related-review">
                  {relatedByProposal[proposal.id] === undefined ? (
                    <button
                      className="secondary"
                      disabled={busy || relatedLoading[proposal.id]}
                      onClick={() => loadRelated(proposal.id)}
                    >
                      {relatedLoading[proposal.id] ? "正在加载相关记忆..." : "查看相关记忆"}
                    </button>
                  ) : relatedByProposal[proposal.id].length === 0 ? (
                    <p className="muted">没有同项目、同类型的有效记忆候选。</p>
                  ) : (
                    <fieldset className="related-list">
                      <legend>相关记忆候选</legend>
                      {relatedByProposal[proposal.id].map((memory) => (
                        <label className="related-memory" key={memory.id}>
                          <input
                            type="radio"
                            name={`supersede-${proposal.id}`}
                            checked={supersedeByProposal[proposal.id] === memory.id}
                            onChange={() => setSupersedeByProposal((current) => ({
                              ...current,
                              [proposal.id]: memory.id,
                            }))}
                          />
                          <span className="related-memory-body">
                            <span>{memory.content}</span>
                            <small>{MEMORY_TYPE_LABELS[memory.type] || memory.type} · {memory.status} · {memory.created_at}</small>
                          </span>
                          <Link href={`/memories/${memory.id}`} className="related-detail-link">详情</Link>
                        </label>
                      ))}
                    </fieldset>
                  )}
                </div>

                <div className="proposal-actions">
                  <label className="expiration-input">
                    到期时间（可选）
                    <input
                      type="datetime-local"
                      value={expiresByProposal[proposal.id] || ""}
                      onChange={(event) => setExpiresByProposal((current) => ({
                        ...current,
                        [proposal.id]: event.target.value,
                      }))}
                    />
                    <small>到期后将从默认检索中移除，审计记录仍会保留。</small>
                  </label>
                  <button
                    disabled={busy}
                    onClick={() => run(() => approveProposal(
                      proposal.id,
                      "reviewer",
                      supersedeByProposal[proposal.id],
                      expiresByProposal[proposal.id]
                        ? new Date(expiresByProposal[proposal.id]).toISOString()
                        : null,
                    ))}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {supersedeByProposal[proposal.id] ? "批准并替代" : "批准"}
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => run(() => rejectProposal(proposal.id))}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    拒绝提案
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Sidebar section: Extract Proposals Form (Right Column) */}
        <aside className="proposals-sidebar">
          <div className="extraction-panel">
            <h2>提案提取控制台</h2>
            <p className="muted" style={{ marginBottom: '16px' }}>输入会话记录或文档片段，触发大语言模型解析提取候选记忆实体。</p>
            <form onSubmit={onExtract}>
              <div className="two-col">
                <label>
                  操作员 ID
                  <input value={actorId} onChange={(event) => setActorId(event.target.value)} placeholder="如 reviewer" />
                </label>
                <label>
                  项目/空间 ID
                  <input value={projectId} onChange={(event) => setProjectId(event.target.value)} placeholder="如 memorynode-demo" />
                </label>
              </div>
              <label>
                原始文本记录 (Transcript)
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  placeholder="在此贴入原始对话记录，如 '这个项目必须使用 Qwen Cloud。'"
                />
              </label>
              <button disabled={busy} type="submit" style={{ width: '100%' }}>
                {busy ? "正在分析提取..." : "分析并提取记忆提案"}
              </button>
            </form>
          </div>
        </aside>
      </div>

      <style>{`
        .proposals-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .proposals-layout {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 32px;
          align-items: start;
        }

        .proposals-main {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .proposals-sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: sticky;
          top: 40px;
        }

        .extraction-panel {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
        }

        .proposal-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          transition: all 0.2s ease;
        }

        .proposal-card:hover {
          border-color: var(--border-color-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        }

        .proposal-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
        }

        .proposal-content-wrapper {
          flex: 1;
        }

        .proposal-content-label {
          font-size: 10px;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 700;
          letter-spacing: 0.1em;
          display: block;
          margin-bottom: 4px;
        }

        .proposal-content-text {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.5;
        }

        .proposal-meta-badges {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          flex-shrink: 0;
        }

        .proposal-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .source-quote {
          background: #080c14;
          border-left: 3px solid var(--color-primary);
          border-radius: 0 8px 8px 0;
          font-size: 13px;
          max-height: 180px;
        }

        .proposal-reason-box {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .proposal-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: end;
          gap: 12px;
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }

        .expiration-input {
          display: grid;
          gap: 6px;
          min-width: min(100%, 230px);
          color: var(--text-secondary);
          font-size: 12px;
        }

        .expiration-input small {
          color: var(--text-muted);
          line-height: 1.4;
        }

        .related-review {
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }

        .related-list {
          border: 0;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 8px;
        }

        .related-list legend {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .related-memory {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: start;
          gap: 10px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 10px;
          cursor: pointer;
        }

        .related-memory input {
          margin-top: 3px;
        }

        .related-memory-body {
          display: grid;
          gap: 4px;
          min-width: 0;
          overflow-wrap: anywhere;
          font-size: 13px;
        }

        .related-memory small {
          color: var(--text-muted);
          font-size: 11px;
        }

        .related-detail-link {
          color: var(--color-primary);
          font-size: 12px;
          white-space: nowrap;
        }

        @media (max-width: 1024px) {
          .proposals-layout {
            grid-template-columns: 1fr;
          }
          .proposals-sidebar {
            position: static;
          }
        }

        @media (max-width: 480px) {
          .related-memory {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .related-detail-link {
            grid-column: 2;
          }
        }
      `}</style>
    </div>
  );
}
