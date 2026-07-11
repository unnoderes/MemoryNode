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
        <h1>记忆拟案提取与审核</h1>
        <p className="muted">模型拟案在此处于安全隔离区。Reviewer 须进行人工审核把关，核准后方可写入 Agent 长期记忆库。</p>
      </header>

      {/* Governance Boundary Alert */}
      <div className="governance-banner">
        <div className="banner-icon-container">
          <svg className="banner-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h4 style={{ fontWeight: 700, marginBottom: '4px', color: '#a5f3fc' }}>可信记忆准入屏障 (Human-in-the-Loop Barrier)</h4>
          <p style={{ fontSize: '13px', opacity: 0.95, lineHeight: '1.5' }}>
            AI 代理无法直接写入长期记忆库。所有提取的内容默认为<strong>隔离的临时拟案 (Proposals)</strong>，必须经由人类审计员审核授权后，方能转化为有效的<strong>长期认知资产</strong>。
          </p>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="notice">{message}</div> : null}

      <div className="proposals-layout">
        {/* Main section: Pending Proposals (Left Column) */}
        <section className="proposals-main">
          <h2>待审核拟案队列 ({proposals.length})</h2>
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
                    <span className="proposal-content-label">记忆体拟案写入内容</span>
                    <h3 className="proposal-content-text">{proposal.content}</h3>
                  </div>
                  <div className="proposal-meta-badges">
                    <span className="badge badge-type">
                      {MEMORY_TYPE_LABELS[proposal.type] || proposal.type}
                    </span>
                    <div className="confidence-indicator">
                      <div className="confidence-track">
                        <div className="confidence-bar" style={{ width: `${proposal.confidence * 100}%` }}></div>
                      </div>
                      <span className="confidence-text">置信度: {(proposal.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {proposal.source_quote ? (
                  <div className="proposal-field">
                    <div className="field-title">来源摘录证据 (Evidence)</div>
                    <blockquote className="pre source-quote">
                      {proposal.source_quote}
                    </blockquote>
                  </div>
                ) : null}

                {proposal.reason ? (
                  <div className="proposal-field">
                    <div className="field-title">模型抽取理由说明 (Rationale)</div>
                    <div className="proposal-reason-box">
                      {proposal.reason}
                    </div>
                  </div>
                ) : null}

                <div className="related-review">
                  {relatedByProposal[proposal.id] === undefined ? (
                    <button
                      className="secondary btn-sm"
                      disabled={busy || relatedLoading[proposal.id]}
                      onClick={() => loadRelated(proposal.id)}
                    >
                      {relatedLoading[proposal.id] ? "正在分析相关认知冲突..." : "扫描库中相关记忆"}
                    </button>
                  ) : relatedByProposal[proposal.id].length === 0 ? (
                    <p className="muted" style={{ fontSize: '12px' }}>没有找到同项目、同类型的有效记忆候选。</p>
                  ) : (
                    <fieldset className="related-list">
                      <legend>人工核准替代候选 (Reviewer-Supervised Supersession Candidates)</legend>
                      <p className="candidate-desc">若此记忆更新或冲突了已有认知，请人工指定要替代的旧记忆实体。此操作并非自动裁决。</p>
                      {relatedByProposal[proposal.id].map((memory) => (
                        <label className={`related-memory ${supersedeByProposal[proposal.id] === memory.id ? 'selected' : ''}`} key={memory.id}>
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
                            <span className="related-memory-content">{memory.content}</span>
                            <small className="related-memory-meta">
                              分类: {MEMORY_TYPE_LABELS[memory.type] || memory.type} · 状态: {memory.status} · 写入时间: {memory.created_at}
                            </small>
                          </span>
                          <Link href={`/memories/${memory.id}`} target="_blank" className="related-detail-link">
                            查看档案 ↗
                          </Link>
                        </label>
                      ))}
                    </fieldset>
                  )}
                </div>

                <div className="proposal-actions">
                  <div className="expiration-col">
                    <label className="expiration-input">
                      设置到期生命周期 (Optional Expire)
                      <input
                        type="datetime-local"
                        value={expiresByProposal[proposal.id] || ""}
                        onChange={(event) => setExpiresByProposal((current) => ({
                          ...current,
                          [proposal.id]: event.target.value,
                        }))}
                      />
                    </label>
                    <span className="expiration-tip">到期后将根据请求驱动机制自动标记为 expired 并对大模型检索屏蔽，历史审计仍然留存。</span>
                  </div>
                  <div className="action-buttons-group">
                    <button
                      className="btn-approve"
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
                      {supersedeByProposal[proposal.id] ? "核准并替代旧记忆" : "核准并写入长期记忆"}
                    </button>
                    <button
                      className="secondary btn-reject"
                      disabled={busy}
                      onClick={() => run(() => rejectProposal(proposal.id))}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      拒绝提案
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Sidebar section: Extract Proposals Form (Right Column) */}
        <aside className="proposals-sidebar">
          <div className="extraction-panel">
            <h2>提案提取控制台</h2>
            <p className="muted" style={{ marginBottom: '18px', fontSize: '13px' }}>
              模拟 Agent 交互上下文。贴入交互文本记录，触发模型自动抽取记忆提案（Proposals）。
            </p>
            <form onSubmit={onExtract}>
              <div className="two-col">
                <label>
                  审计人/操作员 ID
                  <input value={actorId} onChange={(event) => setActorId(event.target.value)} placeholder="如 reviewer" />
                </label>
                <label>
                  项目/命名空间 ID
                  <input value={projectId} onChange={(event) => setProjectId(event.target.value)} placeholder="如 memorynode-demo" />
                </label>
              </div>
              <label>
                原始文本记录 (Context Transcript)
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  placeholder="在此贴入原始对话记录，如 '这个项目必须使用 Qwen Cloud。'"
                />
              </label>
              <button disabled={busy} type="submit" style={{ width: '100%' }}>
                {busy ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    <span>正在运行 Qwen 抽取引擎...</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span>运行 Qwen 抽取引擎</span>
                  </>
                )}
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
          box-shadow: var(--card-shadow);
        }

        .proposal-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--card-shadow);
        }

        .proposal-card:hover {
          border-color: var(--border-color-hover);
          transform: translateY(-2px);
          box-shadow: var(--card-shadow-hover);
        }

        .proposal-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 18px;
        }

        .proposal-content-wrapper {
          flex: 1;
        }

        .proposal-content-label {
          font-size: 10px;
          text-transform: uppercase;
          color: var(--color-accent);
          font-weight: 700;
          letter-spacing: 0.1em;
          display: block;
          margin-bottom: 6px;
        }

        .proposal-content-text {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.5;
          letter-spacing: -0.01em;
        }

        .proposal-meta-badges {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          flex-shrink: 0;
        }

        .badge-type {
          background: rgba(6, 182, 212, 0.08);
          color: var(--color-accent-hover);
          border: 1px solid rgba(6, 182, 212, 0.2);
        }

        .confidence-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .confidence-track {
          width: 60px;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
          overflow: hidden;
        }

        .confidence-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--color-accent) 0%, var(--color-primary) 100%);
          border-radius: 3px;
        }

        .confidence-text {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
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
          letter-spacing: 0.06em;
        }

        .source-quote {
          background: #050813;
          border-left: 3px solid var(--color-accent);
          border-radius: 0 8px 8px 0;
          font-size: 13.5px;
          max-height: 180px;
        }

        .proposal-reason-box {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .related-review {
          border-top: 1px solid var(--border-color);
          padding-top: 18px;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 6px;
        }

        .related-list {
          border: 0;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 10px;
        }

        .related-list legend {
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .candidate-desc {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 10px;
          line-height: 1.4;
        }

        .related-memory {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.005);
        }

        .related-memory:hover {
          border-color: var(--border-color-hover);
          background: rgba(255, 255, 255, 0.015);
        }

        .related-memory.selected {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.04);
        }

        .related-memory input {
          margin: 0;
          cursor: pointer;
          width: auto;
        }

        .related-memory-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .related-memory-content {
          font-size: 13.5px;
          color: var(--text-primary);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .related-memory-meta {
          color: var(--text-muted);
          font-size: 11px;
        }

        .related-detail-link {
          color: var(--color-accent);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .related-detail-link:hover {
          color: var(--color-accent-hover);
          text-decoration: underline;
        }

        .proposal-actions {
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-top: 1px solid var(--border-color);
          padding-top: 18px;
        }

        .expiration-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .expiration-input {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 12px;
          color: var(--text-secondary);
          font-size: 12px;
          width: 100%;
        }

        .expiration-input input {
          flex: 1;
          max-width: 250px;
          padding: 8px 12px;
          font-size: 13px;
        }

        .expiration-tip {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
          padding-left: 2px;
        }

        .action-buttons-group {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          width: 100%;
        }

        .btn-approve {
          background: var(--color-primary);
          color: #050814;
        }

        .btn-approve:hover {
          background: var(--color-primary-hover);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.25);
        }

        .btn-reject {
          color: var(--text-primary);
          border-color: var(--border-color);
        }

        .btn-reject:hover {
          color: #ffffff;
          border-color: var(--color-danger);
          background: rgba(244, 63, 94, 0.08);
          box-shadow: none;
        }

        .banner-icon-container {
          background: rgba(6, 182, 212, 0.1);
          border-radius: 8px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .banner-icon {
          width: 20px;
          height: 20px;
          color: var(--color-accent-hover);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1200px) {
          .proposals-layout {
            grid-template-columns: 1fr;
          }
          .proposals-sidebar {
            position: static;
          }
        }

        @media (max-width: 580px) {
          .action-buttons-group {
            flex-direction: column;
          }
          .action-buttons-group button {
            width: 100%;
          }
          .expiration-input {
            flex-direction: column;
            align-items: flex-start;
          }
          .expiration-input input {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
