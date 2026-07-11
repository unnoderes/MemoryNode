"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  approveProposal,
  extractProposals,
  listProposals,
  relatedMemories,
  rejectProposal,
} from "../../lib/api";
import { useLanguage } from "../../lib/language";

const DEMO_TRANSCRIPT = `这个项目必须使用 Qwen Cloud，而不是 OpenAI API。
我们已经决定 MVP 使用 FastAPI、SQLite 和 Next.js。
每条保存的记忆都应该能查到来源、说明原因，并且可以随时撤销。`;

const DEMO_TRANSCRIPT_EN = `This project must use Qwen Cloud instead of the OpenAI API.
We decided to build the MVP with FastAPI, SQLite, and Next.js.
Every saved memory must keep its source and reason, and it must remain revocable.`;

const MEMORY_TYPE_LABELS = {
  user_preference: "用户偏好",
  project_constraint: "项目约束",
  project_decision: "项目决策",
  recurring_workflow: "重复工作流",
  known_pitfall: "已知坑点",
  fact: "事实",
};

export default function ProposalsPage() {
  const { language, t } = useLanguage();
  const languageRef = useRef(language);
  languageRef.current = language;
  const currentT = (zh, en) => languageRef.current === "zh" ? zh : en;
  const typeLabels = language === "zh" ? MEMORY_TYPE_LABELS : {
    user_preference: "User preference", project_constraint: "Project constraint",
    project_decision: "Project decision", recurring_workflow: "Recurring workflow",
    known_pitfall: "Known pitfall", fact: "Fact",
  };
  const statusLabels = language === "zh" ? { active: "生效中", revoked: "已撤销", expired: "已过期" } : {
    active: "Active", revoked: "Revoked", expired: "Expired",
  };
  const [actorId, setActorId] = useState("demo-user");
  const [projectId, setProjectId] = useState("memorynode-demo");
  const [transcript, setTranscript] = useState(DEMO_TRANSCRIPT);
  const [proposals, setProposals] = useState([]);
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractStartedAt, setExtractStartedAt] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [newProposalIds, setNewProposalIds] = useState([]);
  const [relatedByProposal, setRelatedByProposal] = useState({});
  const [relatedLoading, setRelatedLoading] = useState({});
  const [supersedeByProposal, setSupersedeByProposal] = useState({});
  const [expiresByProposal, setExpiresByProposal] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [extractExpanded, setExtractExpanded] = useState(false);

  useEffect(() => {
    setTranscript((current) => current === DEMO_TRANSCRIPT || current === DEMO_TRANSCRIPT_EN
      ? (language === "zh" ? DEMO_TRANSCRIPT : DEMO_TRANSCRIPT_EN)
      : current);
  }, [language]);

  useEffect(() => {
    if (!extracting) return;
    const updateElapsed = () => setElapsedSeconds(Math.floor((Date.now() - extractStartedAt) / 1000));
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [extracting, extractStartedAt]);

  useEffect(() => {
    if (newProposalIds.length === 0) return;
    const timer = setTimeout(() => setNewProposalIds([]), 800);
    return () => clearTimeout(timer);
  }, [newProposalIds]);

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
    if (extracting) return;
    const text = transcript.trim();
    if (!text) {
      setError(t("请输入原始记录。", "Enter a conversation first."));
      return;
    }
    setExtracting(true);
    setExtractStartedAt(Date.now());
    setElapsedSeconds(0);
    setError("");
    setMessage("");
    try {
      const body = await extractProposals({ actorId, projectId, transcript: text });
      const extracted = body.proposals || [];
      const extractedIds = extracted.map((proposal) => proposal.id);
      await refresh();
      if (extracted.length === 0) {
        setMessage(currentT(
          "分析完成，没有发现需要长期保存的内容。",
          "Analysis complete. Nothing needs to be saved as long-term memory.",
        ));
        return;
      }

      setSelectedId(extracted[0].id);
      setNewProposalIds(extractedIds);
      setTranscript("");
      setExtractExpanded(false);
      setMessage(currentT(
        `已找到 ${extracted.length} 条建议，请确认是否保存。`,
        `Found ${extracted.length} suggestions. Review them before saving.`,
      ));
    } catch {
      setError(currentT(
        "这次没有提取成功，请稍后重试。你的原始对话仍然保留。",
        "Extraction did not complete. Please try again. Your original conversation is still here.",
      ));
    } finally {
      setExtracting(false);
    }
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
        <h1>{t("审核新记忆", "Review New Memories")}</h1>
        <p className="muted">{t("AI 会从对话中找出值得记住的内容。只有经过你的确认，它们才会成为长期记忆。", "AI finds information worth remembering. It becomes long-term memory only after you approve it.")}</p>
      </header>

      {/* Governance Boundary Alert */}
      <div className="governance-banner">
        <div className="banner-icon-container">
          <svg className="banner-icon" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h4 style={{ fontWeight: 700, marginBottom: '4px', color: '#ffffff' }}>{t("AI 不能直接保存长期记忆", "AI cannot save long-term memory on its own")}</h4>
          <p style={{ fontSize: '13px', opacity: 0.95, lineHeight: '1.5' }}>
            {t("AI 提取的内容会先进入待审核列表。你可以查看原文和提取理由，再决定批准或拒绝。", "AI suggestions enter a review queue first. Check the source and reason, then approve or reject each one.")}
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
              <span>{t("从对话中提取记忆", "Extract Memories from a Conversation")}</span>
              <svg className="chevron-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className="extractor-content">
              <form onSubmit={onExtract}>
                <div className="two-col">
                  <label>
                    {t("操作人 ID", "User ID")}
                    <input value={actorId} onChange={(event) => setActorId(event.target.value)} placeholder={t("例如 reviewer", "For example: reviewer")} />
                  </label>
                  <label>
                    {t("项目 ID", "Project ID")}
                    <input value={projectId} onChange={(event) => setProjectId(event.target.value)} placeholder={t("例如 memorynode-demo", "For example: memorynode-demo")} />
                  </label>
                </div>
                <label>
                  {t("原始对话", "Conversation")}
                  <textarea
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                    placeholder={t("粘贴一段对话，例如：这个项目必须使用 Qwen Cloud。", "Paste a conversation, for example: This project must use Qwen Cloud.")}
                  />
                </label>
                <button disabled={busy || extracting} type="submit" style={{ width: '100%' }} aria-busy={extracting}>
                  {extracting ? <span className="extract-spinner" aria-hidden="true" /> : null}
                  {extracting
                    ? t("Qwen 正在分析…", "Qwen is analyzing…")
                    : t("提取记忆提案", "Extract Memory Suggestions")}
                </button>
                {extracting ? (
                  <div className="extract-live-status" role="status" aria-live="polite" aria-atomic="true">
                    <strong>{t("正在寻找值得记住的内容", "Looking for information worth remembering")}</strong>
                    <span aria-hidden="true">
                      {elapsedSeconds === 0
                        ? t("正在提交请求…", "Sending request…")
                        : t(`已等待 ${elapsedSeconds} 秒`, `${elapsedSeconds} seconds elapsed`)}
                    </span>
                    <span className="sr-only">
                      {elapsedSeconds < 5
                        ? t("正在提交请求…", "Sending request…")
                        : t(
                          `已等待 ${Math.floor(elapsedSeconds / 5) * 5} 秒`,
                          `${Math.floor(elapsedSeconds / 5) * 5} seconds elapsed`,
                        )}
                    </span>
                    <p>{t(
                      "分析结果只会进入待审核列表，不会自动保存。",
                      "Results enter the review queue only. Nothing is saved automatically.",
                    )}</p>
                  </div>
                ) : null}
              </form>
            </div>
          </div>

          {/* Proposals List */}
          <div className="proposals-list-section">
            <h2>{t("等待你确认", "Waiting for Review")} ({proposals.length})</h2>
            {proposals.length === 0 && !extracting ? (
              <div className="empty">
                <svg className="empty-icon" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{t("暂时没有需要审核的内容", "Nothing to review yet")}</span>
                <p style={{ fontSize: '13px', opacity: 0.7 }}>{t("在上方粘贴一段对话，AI 会帮你找出值得记住的内容。", "Paste a conversation above and AI will suggest what may be worth remembering.")}</p>
              </div>
            ) : proposals.length > 0 ? (
              <div className="compact-proposal-list">
                {proposals.map((proposal) => {
                  const isSelected = proposal.id === selectedId;
                  return (
                    <div
                      key={proposal.id}
                      className={`compact-proposal-item ${isSelected ? 'selected' : ''} ${newProposalIds.includes(proposal.id) ? 'new-proposal' : ''}`}
                      onClick={() => setSelectedId(proposal.id)}
                    >
                      <div className="compact-item-header">
                        <span className="compact-item-type">{typeLabels[proposal.type] || proposal.type}</span>
                        <span className="compact-item-conf">{(proposal.confidence * 100).toFixed(0)}% {t("置信度/说服力", "confidence")}</span>
                      </div>
                      <p className="compact-item-text">{proposal.content}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {extracting ? (
              <div className="proposal-skeletons" aria-hidden="true">
                {[0, 1, 2].map((item) => (
                  <div className="proposal-skeleton" key={item}>
                    <span className="skeleton-line skeleton-label" />
                    <span className="skeleton-line" />
                    <span className="skeleton-line skeleton-short" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Detail Panel */}
        <div className="soc-right-panel">
          {selectedProposal ? (
            <div className="audit-detail-card">
              <div className="detail-card-header">
                <span className="detail-section-label">{t("待审核内容", "Suggested Memory")}</span>
                <h2>{selectedProposal.content}</h2>
                <div className="detail-meta-row">
                  <span className="badge badge-type">
                    {typeLabels[selectedProposal.type] || selectedProposal.type}
                  </span>
                  <div className="confidence-indicator" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <div className="confidence-blocks" style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      {Array.from({ length: 10 }).map((_, idx) => {
                        const isActive = idx < Math.round(selectedProposal.confidence * 10);
                        return (
                          <div
                            key={idx}
                            style={{
                              width: '4px',
                              height: '8px',
                              borderRadius: '1px',
                              background: isActive ? 'var(--text-primary)' : 'rgba(255, 255, 255, 0.05)',
                              transition: 'all 0.2s ease',
                            }}
                          />
                        );
                      })}
                    </div>
                    <span className="confidence-text">{t("置信度/说服力", "Confidence/Persuasiveness")}：{(selectedProposal.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div className="detail-body">
                {selectedProposal.source_quote && (
                  <div className="detail-field">
                    <div className="detail-field-title">{t("来自哪句话", "Source Quote")}</div>
                    <blockquote className="pre source-quote">
                      {selectedProposal.source_quote}
                    </blockquote>
                  </div>
                )}

                {selectedProposal.reason && (
                  <div className="detail-field">
                    <div className="detail-field-title">{t("为什么建议记住", "Why Remember This")}</div>
                    <div className="proposal-reason-box">
                      {selectedProposal.reason}
                    </div>
                  </div>
                )}

                <div className="detail-field">
                  <div className="detail-field-title">{t("是否要替换已有记忆", "Replace an Existing Memory?")}</div>
                  <div className="related-review-block">
                    {relatedByProposal[selectedId] === undefined ? (
                      <button
                        type="button"
                        className="secondary btn-sm"
                        disabled={busy || extracting || relatedLoading[selectedId]}
                        onClick={() => loadRelated(selectedId)}
                      >
                        {relatedLoading[selectedId] ? t("查找中…", "Searching…") : t("查找相关记忆", "Find Related Memories")}
                      </button>
                    ) : relatedByProposal[selectedId].length === 0 ? (
                      <p className="muted text-xs">{t("没有找到相关的旧记忆。", "No related memories found.")}</p>
                    ) : (
                      <fieldset className="related-list">
                        <p className="candidate-desc">{t("如果这条新内容更新了旧记忆，请手动选择要替换的那一条。系统不会自动替换：", "If this updates an old memory, choose the one to replace. The system never replaces memories automatically:")}</p>
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
                                {t("类型", "Type")}：{typeLabels[memory.type] || memory.type} · {t("状态", "Status")}：{statusLabels[memory.status] || memory.status}
                              </small>
                            </span>
                            <Link href={`/memories/${memory.id}`} target="_blank" className="related-detail-link">
                              {t("查看详情", "View Details")} ↗
                            </Link>
                          </label>
                        ))}
                      </fieldset>
                    )}
                  </div>
                </div>

                <div className="detail-field operations-field">
                  <div className="detail-field-title">{t("确认如何处理", "Choose an Action")}</div>
                  <div className="proposal-actions">
                    <div className="expiration-col">
                      <label className="expiration-input">
                        {t("到期时间（可选）", "Expiry Time (Optional)")}
                        <input
                          type="datetime-local"
                          value={expiresByProposal[selectedId] || ""}
                          onChange={(event) => setExpiresByProposal((current) => ({
                            ...current,
                            [selectedId]: event.target.value,
                          }))}
                        />
                      </label>
                      <span className="expiration-tip">{t("留空表示长期有效。到期后，这条记忆不会再出现在默认搜索中，但历史记录仍会保留。", "Leave blank to keep it indefinitely. After expiry, it leaves default search but keeps its history.")}</span>
                    </div>

                    <div className="action-buttons-group">
                      <button
                        className="btn-approve"
                        disabled={busy || extracting}
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
                        {supersedeByProposal[selectedId] ? t("批准并替换旧记忆", "Approve and Replace") : t("批准并保存", "Approve and Save")}
                      </button>

                      <button
                        className="secondary btn-reject"
                        disabled={busy || extracting}
                        onClick={() => run(() => rejectProposal(selectedId))}
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {t("拒绝", "Reject")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-audit-detail">
              <svg className="empty-icon" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3>{t("请选择一条内容", "Select a Suggestion")}</h3>
              <p>{t("点击左侧列表中的提案，查看它来自哪里、为什么值得记住，并决定是否保存。", "Select an item on the left to inspect its source and reason, then decide whether to save it.")}</p>
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
          background: rgba(255, 255, 255, 0.05);
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

        .extract-live-status {
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          line-height: 1.5;
          padding: 12px 14px;
        }

        .extract-live-status strong {
          color: var(--text-primary);
          font-size: 13px;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .extract-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(0, 0, 0, 0.25);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: extract-spin 0.8s linear infinite;
        }

        @keyframes extract-spin {
          to { transform: rotate(360deg); }
        }

        .proposal-skeletons {
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
        }

        .proposal-skeleton {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .skeleton-line {
          height: 11px;
          width: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #242424 25%, #333 50%, #242424 75%);
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.4s ease-in-out infinite;
        }

        .skeleton-label { width: 28%; height: 8px; }
        .skeleton-short { width: 68%; }

        @keyframes skeleton-shimmer {
          to { background-position: -200% 0; }
        }

        .compact-proposal-item.new-proposal {
          animation: proposal-fade-in 0.5s ease-out;
        }

        @keyframes proposal-fade-in {
          from { opacity: 0; transform: translateY(4px); }
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
          background: rgba(255, 255, 255, 0.05);
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
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
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
          background: #0a0a0a;
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
          border-color: rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.08);
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
          color: #0a0a0a;
        }

        .btn-approve:hover {
          background: var(--color-primary-hover);
          box-shadow: 0 4px 15px rgba(255, 255, 255, 0.15);
        }

        .btn-reject {
          color: var(--text-primary);
          border-color: var(--border-color);
        }

        .btn-reject:hover {
          color: #ffffff;
          border-color: var(--color-danger);
          background: rgba(255, 255, 255, 0.05);
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
          background: rgba(255, 255, 255, 0.08);
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

        @media (prefers-reduced-motion: reduce) {
          .extract-spinner,
          .skeleton-line,
          .compact-proposal-item.new-proposal {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
