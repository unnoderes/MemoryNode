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

  const [selectedId, setSelectedId] = useState(null);
  const [extractExpanded, setExtractExpanded] = useState(false);

  async function refresh() {
    const body = await listProposals();
    const list = body.proposals || [];
    setProposals(list);
    if (list.length > 0) {
      if (!list.some(p => p.id === selectedId)) {
        setSelectedId(list[0].id);
      }
    } else {
      setSelectedId(null);
    }
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
      setExtractExpanded(false); // Collapse extractor after success
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

  useEffect(() => {
    if (selectedId && relatedByProposal[selectedId] === undefined) {
      loadRelated(selectedId).catch(() => {});
    }
  }, [selectedId]);

  const selectedProposal = proposals.find(p => p.id === selectedId);

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

      <div className="soc-layout">
        {/* Left Column: Extraction & Proposals List */}
        <div className="soc-left-panel">

          {/* Collapsible Extractor */}
          <div className={`collapsible-extractor ${extractExpanded ? 'expanded' : ''}`}>
            <button
              type="button"
              className="extractor-toggle-btn"
              onClick={() => setExtractExpanded(!extractExpanded)}
            >
              <span>模拟交互拟案提取</span>
              <svg className="chevron-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className="extractor-content">
              <form onSubmit={onExtract}>
                <div className="two-col">
                  <label>
                    审计员 ID
                    <input value={actorId} onChange={(event) => setActorId(event.target.value)} placeholder="如 reviewer" />
                  </label>
                  <label>
                    命名空间
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
                  {busy ? "正在分析提取..." : "模型提取拟案"}
                </button>
              </form>
            </div>
          </div>

          {/* Proposals List */}
          <div className="proposals-list-section">
            <h2>待审核拟案队列 ({proposals.length})</h2>
            {proposals.length === 0 ? (
              <div className="empty">
                <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>暂无待审核的记忆提案</span>
                <p style={{ fontSize: '13px', opacity: 0.7 }}>您可以使用上方控制面板提取新拟案。</p>
              </div>
            ) : (
              <div className="compact-proposal-list">
                {proposals.map((proposal) => {
                  const isSelected = proposal.id === selectedId;
                  return (
                    <div
                      key={proposal.id}
                      className={`compact-proposal-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedId(proposal.id)}
                    >
                      <div className="compact-item-header">
                        <span className="compact-item-type">{MEMORY_TYPE_LABELS[proposal.type] || proposal.type}</span>
                        <span className="compact-item-conf">{(proposal.confidence * 100).toFixed(0)}% conf</span>
                      </div>
                      <p className="compact-item-text">{proposal.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detail Panel */}
        <div className="soc-right-panel">
          {selectedProposal ? (
            <div className="audit-detail-card">
              <div className="detail-card-header">
                <span className="detail-section-label">安全隔离拟案审计档案</span>
                <h2>{selectedProposal.content}</h2>
                <div className="detail-meta-row">
                  <span className="badge badge-type">
                    {MEMORY_TYPE_LABELS[selectedProposal.type] || selectedProposal.type}
                  </span>
                  <div className="confidence-indicator" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <div className="confidence-track" style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div className="confidence-bar" style={{ height: '100%', background: 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-primary) 100%)', width: `${selectedProposal.confidence * 100}%` }}></div>
                    </div>
                    <span className="confidence-text">置信度: {(selectedProposal.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div className="detail-body">
                {selectedProposal.source_quote && (
                  <div className="detail-field">
                    <div className="detail-field-title">原始会话证据摘录 (Evidence)</div>
                    <blockquote className="pre source-quote">
                      {selectedProposal.source_quote}
                    </blockquote>
                  </div>
                )}

                {selectedProposal.reason && (
                  <div className="detail-field">
                    <div className="detail-field-title">大模型抽取理由说明 (Rationale)</div>
                    <div className="proposal-reason-box">
                      {selectedProposal.reason}
                    </div>
                  </div>
                )}

                <div className="detail-field">
                  <div className="detail-field-title">人机核准替代候选 (Reviewer-Supervised Supersession)</div>
                  <div className="related-review-block">
                    {relatedByProposal[selectedId] === undefined ? (
                      <button
                        type="button"
                        className="secondary btn-sm"
                        disabled={busy || relatedLoading[selectedId]}
                        onClick={() => loadRelated(selectedId)}
                      >
                        {relatedLoading[selectedId] ? "分析中..." : "扫描库中关联冲突实体"}
                      </button>
                    ) : relatedByProposal[selectedId].length === 0 ? (
                      <p className="muted text-xs">库中无冲突记忆实体。</p>
                    ) : (
                      <fieldset className="related-list">
                        <p className="candidate-desc">若此拟案更新了已有认知，请选择核准替代的记忆实体（人工监督，非自动裁决）：</p>
                        {relatedByProposal[selectedId].map((memory) => (
                          <label className={`related-memory ${supersedeByProposal[selectedId] === memory.id ? 'selected' : ''}`} key={memory.id}>
                            <input
                              type="radio"
                              name={`supersede-${selectedId}`}
                              checked={supersedeByProposal[selectedId] === memory.id}
                              onChange={() => setSupersedeByProposal((current) => ({
                                ...current,
                                [selectedId]: memory.id,
                              }))}
                            />
                            <span className="related-memory-body">
                              <span className="related-memory-content">{memory.content}</span>
                              <small className="related-memory-meta">
                                分类: {MEMORY_TYPE_LABELS[memory.type] || memory.type} · 状态: {memory.status}
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
                </div>

                <div className="detail-field operations-field">
                  <div className="detail-field-title">准入授权操作面板 (Access Control Panel)</div>
                  <div className="proposal-actions">
                    <div className="expiration-col">
                      <label className="expiration-input">
                        设置到期生命周期 (Optional Expiration)
                        <input
                          type="datetime-local"
                          value={expiresByProposal[selectedId] || ""}
                          onChange={(event) => setExpiresByProposal((current) => ({
                            ...current,
                            [selectedId]: event.target.value,
                          }))}
                        />
                      </label>
                      <span className="expiration-tip">到期后将根据请求驱动机制自动标记为 expired，对大模型检索屏蔽，保留历史审计流水。</span>
                    </div>

                    <div className="action-buttons-group">
                      <button
                        className="btn-approve"
                        disabled={busy}
                        onClick={() => run(() => approveProposal(
                          selectedId,
                          "reviewer",
                          supersedeByProposal[selectedId],
                          expiresByProposal[selectedId]
                            ? new Date(expiresByProposal[selectedId]).toISOString()
                            : null,
                        ))}
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {supersedeByProposal[selectedId] ? "核准并替代旧实体" : "核准并写入长期记忆"}
                      </button>

                      <button
                        className="secondary btn-reject"
                        disabled={busy}
                        onClick={() => run(() => rejectProposal(selectedId))}
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        安全拒绝并销毁
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-audit-detail">
              <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3>待选定拟案审计</h3>
              <p>请在左侧列表中点击选择一个隔离拟案，以在此加载可审计档案并执行准入授权操作。</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .proposals-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .soc-layout {
          display: grid;
          grid-template-columns: minmax(360px, 420px) 1fr;
          gap: 24px;
          min-height: calc(100vh - 200px);
          align-items: start;
        }

        .soc-left-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .collapsible-extractor {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--card-shadow);
        }

        .extractor-toggle-btn {
          width: 100%;
          padding: 14px 20px;
          background: rgba(255, 255, 255, 0.015);
          color: var(--text-primary);
          font-weight: 700;
          font-size: 13.5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 0;
          border-radius: 0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .extractor-toggle-btn:hover {
          background: rgba(6, 182, 212, 0.05);
          color: var(--color-accent-hover);
          box-shadow: none;
          transform: none;
        }

        .chevron-icon {
          transition: transform 0.3s ease;
          color: var(--text-muted);
        }

        .collapsible-extractor.expanded .chevron-icon {
          transform: rotate(180deg);
        }

        .extractor-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease;
          padding: 0 20px;
        }

        .collapsible-extractor.expanded .extractor-content {
          max-height: 600px;
          padding: 20px;
          border-top: 1px solid var(--border-color);
        }

        .proposals-list-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .compact-proposal-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .compact-proposal-item {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 14px 16px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .compact-proposal-item:hover {
          border-color: var(--border-color-hover);
          background: rgba(255, 255, 255, 0.015);
        }

        .compact-proposal-item.selected {
          border-color: var(--color-accent);
          background: rgba(6, 182, 212, 0.05);
          box-shadow: inset 0 0 10px rgba(6, 182, 212, 0.03);
        }

        .compact-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .compact-item-type {
          font-size: 10px;
          font-weight: 700;
          color: var(--color-accent-hover);
          background: rgba(6, 182, 212, 0.08);
          border: 1px solid rgba(6, 182, 212, 0.2);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .compact-item-conf {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .compact-item-text {
          font-size: 13.5px;
          color: var(--text-primary);
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .soc-right-panel {
          position: sticky;
          top: 40px;
        }

        .audit-detail-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 28px;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .detail-card-header {
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 18px;
        }

        .detail-section-label {
          font-size: 10px;
          font-weight: 800;
          color: var(--color-accent);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
          display: block;
        }

        .detail-card-header h2 {
          font-size: 22px;
          font-weight: 700;
          line-height: 1.4;
          margin-bottom: 12px;
          color: var(--text-primary);
        }

        .detail-meta-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .conf-badge {
          font-size: 11px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 3px 10px;
          border-radius: 4px;
          color: var(--text-secondary);
        }

        .detail-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .detail-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-field-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
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

        .related-review-block {
          background: rgba(255, 255, 255, 0.005);
          border-radius: 8px;
        }

        .related-list {
          border: 0;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 10px;
        }

        .candidate-desc {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 6px;
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

        .empty-audit-detail {
          background: var(--bg-card);
          border: 1px dashed var(--border-color);
          border-radius: 12px;
          padding: 60px 24px;
          text-align: center;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          min-height: 400px;
          justify-content: center;
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

        @media (max-width: 1200px) {
          .soc-layout {
            grid-template-columns: 1fr;
          }
          .soc-right-panel {
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