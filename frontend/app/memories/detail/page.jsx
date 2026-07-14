"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { explainMemory, revokeMemory } from "../../../lib/api";
import { useLanguage } from "../../../lib/language";

const MEMORY_TYPE_LABELS = {
  user_preference: "用户偏好",
  project_constraint: "项目约束",
  project_decision: "项目决策",
  recurring_workflow: "重复工作流",
  known_pitfall: "已知坑点",
  fact: "事实",
};

const STATUS_LABELS = {
  active: "生效中",
  revoked: "已撤销",
  expired: "已过期",
};

const EVENT_LABELS = {
  approve: "已批准",
  reject: "已拒绝",
  revoke: "已撤销",
  supersede: "替代旧记忆",
  superseded: "已被替代",
  expire: "已到期",
};

function formatExpiresAt(value, language) {
  return new Date(value).toLocaleString(language === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function MemoryDetailPage() {
  const { language, t } = useLanguage();
  const typeLabels = language === "zh" ? MEMORY_TYPE_LABELS : {
    user_preference: "User preference", project_constraint: "Project constraint",
    project_decision: "Project decision", recurring_workflow: "Recurring workflow",
    known_pitfall: "Known pitfall", fact: "Fact",
  };
  const statusLabels = language === "zh" ? STATUS_LABELS : { active: "Active", revoked: "Revoked", expired: "Expired" };
  const eventLabels = language === "zh" ? EVENT_LABELS : {
    approve: "Approved", reject: "Rejected", revoke: "Revoked",
    supersede: "Replaced old memory", superseded: "Replaced", expire: "Expired",
  };
  const [id, setId] = useState("");
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh(memoryId = id) {
    const body = await explainMemory(memoryId);
    setDetail(body);
  }

  useEffect(() => {
    const memoryId = new URLSearchParams(window.location.search).get("id") || "";
    setId(memoryId);
    if (memoryId) refresh(memoryId).catch((err) => setError(err.message));
    else setError(t("缺少记忆 ID。", "Missing memory ID."));
  }, []);

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
    <div className="detail-container">
      <header className="detail-header">
        <div>
          <Link href="/memories" className="back-link">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>{t("返回记忆库", "Back to Memories")}</span>
          </Link>
          <h1 style={{ marginTop: '12px' }}>{t("记忆详情", "Memory Details")}</h1>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}

      {!detail && !error ? (
        <div className="empty" style={{ padding: '60px 0' }}>
          <svg className="animate-spin empty-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span style={{ marginTop: '12px' }}>{t("正在加载记忆详情和历史记录…", "Loading memory details and history…")}</span>
        </div>
      ) : null}

      {detail ? (
        <>
          {/* Top Status & Operation Panel */}
          <div className={`status-banner-card banner-${memory.status}`}>
            <div className="banner-text-wrapper">
              <div className={`banner-status-icon-box icon-box-${memory.status}`}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  {memory.status === 'active' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  ) : memory.status === 'revoked' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
              </div>
              <div>
                <span className="banner-title">
                  {t("当前状态", "Status")}：{statusLabels[memory.status] || memory.status}
                </span>
                <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px', lineHeight: '1.4' }}>
                  {memory.status === 'active'
                    ? t("这条记忆当前有效，会出现在默认搜索结果中。", "This memory is active and appears in default search.")
                    : memory.status === 'revoked'
                    ? t("这条记忆已被撤销，不会再出现在默认搜索中，但来源和历史记录仍然保留。", "This memory was revoked. It no longer appears in default search, but its source and history remain available.")
                    : t("这条记忆已经到期，不会再出现在默认搜索中，但仍可查看和追溯。", "This memory has expired. It no longer appears in default search, but remains available for review.")}
                </p>
              </div>
            </div>
            {memory.status === "active" ? (
              <button className="danger btn-revoke-action" disabled={busy} onClick={onRevoke}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                {busy ? t("正在撤销…", "Revoking…") : t("撤销这条记忆", "Revoke Memory")}
              </button>
            ) : null}
          </div>

          {detail.supersedes || detail.superseded_by ? (
            <div className="supersession-links">
              {detail.supersedes ? (
                <div className="supersede-link-item">
                  <span className="supersede-badge">{t("替换了这条旧记忆", "Replaced this older memory")}</span>
                  <Link href={`/memories/detail/?id=${encodeURIComponent(detail.supersedes.id)}`}>
                    <span>{detail.supersedes.content}</span>
                    <small>ID: {detail.supersedes.id.substring(0, 8)}… ↗</small>
                  </Link>
                </div>
              ) : null}
              {detail.superseded_by ? (
                <div className="supersede-link-item">
                  <span className="supersede-badge superseded-by">{t("后来被这条新记忆替换", "Later replaced by this memory")}</span>
                  <Link href={`/memories/detail/?id=${encodeURIComponent(detail.superseded_by.id)}`}>
                    <span>{detail.superseded_by.content}</span>
                    <small>ID: {detail.superseded_by.id.substring(0, 8)}… ↗</small>
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="detail-layout">
            {/* Left Column: Dossier Details */}
            <section className="dossier-column">
              <div className="dossier-card">
                <div className="dossier-header-row">
                  <span className="dossier-section-title">{t("记忆内容", "Memory")}</span>
                  <span className="dossier-id">ID: {memory.id}</span>
                </div>
                
                <div className="dossier-content-block">
                  <span className="dossier-label">{t("保存的内容", "Saved Content")}</span>
                  <div className="dossier-value memory-text">{memory.content}</div>
                </div>

                <div className="dossier-grid-two">
                  <div className="dossier-grid-item">
                    <span className="dossier-label">{t("类型", "Type")}</span>
                    <div className="dossier-value highlight-type">
                      {typeLabels[memory.type] || memory.type}
                    </div>
                  </div>
                  <div className="dossier-grid-item">
                    <span className="dossier-label">{t("所属项目", "Project")}</span>
                    <div className="dossier-value code-font">
                      {proposal?.project_id || "default"}
                    </div>
                  </div>
                  <div className="dossier-grid-item">
                    <span className="dossier-label">{t("到期时间", "Expires")}</span>
                    <div className="dossier-value">
                      {memory.expires_at ? formatExpiresAt(memory.expires_at, language) : t("长期有效", "No expiry")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="dossier-card">
                <span className="dossier-section-title">{t("来自哪句话", "Source Quote")}</span>
                <blockquote className="pre source-quote">
                  {proposal?.source_quote || t("没有保存原始摘录。", "No source quote was saved.")}
                </blockquote>
              </div>

              <div className="dossier-card">
                <span className="dossier-section-title">{t("为什么建议记住", "Why Remember This")}</span>
                <div className="dossier-reason-box">
                  {proposal?.reason || t("没有保存提取理由。", "No extraction reason was saved.")}
                </div>
              </div>
            </section>

            {/* Right Column: Audit Timeline */}
            <aside>
              <div className="timeline-card">
                <div className="timeline-header-row">
                  <span className="dossier-section-title">{t("变更记录", "History")}</span>
                  <span className="timeline-count">{t(`共 ${events.length} 条`, `${events.length} events`)}</span>
                </div>

                {events.length === 0 ? (
                  <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>{t("还没有变更记录。", "No history yet.")}</p>
                ) : (
                  <div className="timeline">
                    {events.map((event, idx) => (
                      <div className="timeline-item" key={event.id}>
                        <div className="timeline-marker-col">
                          <div className={`timeline-dot dot-${event.event_type}`}></div>
                          {idx < events.length - 1 && <div className="timeline-line"></div>}
                        </div>
                        <div className="timeline-body">
                          <div className="timeline-event-header">
                            <span className={`timeline-event-badge badge-event-${event.event_type}`}>
                              {eventLabels[event.event_type] || event.event_type}
                            </span>
                            <span className="timeline-actor">{t("操作人", "By")}：<strong>{event.actor_id}</strong></span>
                          </div>
                          <div className="timeline-time">{event.created_at}</div>
                          {event.note ? (
                            <div className="timeline-note">
                              {event.note}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </>
      ) : null}

      <style>{`
        .detail-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: var(--text-secondary);
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .back-link:hover {
          color: var(--color-accent);
          text-decoration: none;
        }

        .status-banner-card {
          padding: 20px 24px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          box-shadow: var(--card-shadow);
        }

        .banner-active {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: var(--color-primary-hover);
        }

        .banner-revoked {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--color-danger-hover);
        }

        .banner-expired {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-secondary);
        }

        .banner-text-wrapper {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .banner-status-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .icon-box-active {
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-primary);
        }

        .icon-box-revoked {
          background: rgba(255, 255, 255, 0.08);
          color: var(--color-danger);
        }

        .icon-box-expired {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-muted);
        }

        .banner-title {
          font-weight: 700;
          font-size: 16px;
          display: block;
        }

        .btn-revoke-action {
          flex-shrink: 0;
        }

        .detail-layout {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 32px;
          align-items: start;
        }

        .supersession-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.005);
        }

        .supersede-link-item {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .supersede-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--color-accent-hover);
          border: 1px solid rgba(255, 255, 255, 0.15);
          text-transform: uppercase;
        }

        .supersede-badge.superseded-by {
          background: rgba(255, 255, 255, 0.04);
          color: #a3a3a3;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .supersede-link-item a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
          font-weight: 500;
          font-size: 13.5px;
        }

        .supersede-link-item a:hover {
          color: var(--color-accent-hover);
          text-decoration: underline;
        }

        .supersede-link-item small {
          color: var(--text-muted);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
        }

        .dossier-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .dossier-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: var(--card-shadow);
        }

        .dossier-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 12px;
          margin-bottom: 4px;
        }

        .dossier-section-title {
          font-size: 11px;
          font-weight: 800;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .dossier-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          color: var(--text-muted);
        }

        .dossier-content-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .dossier-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .dossier-value {
          font-size: 14.5px;
          color: var(--text-secondary);
        }

        .dossier-value.memory-text {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.5;
        }

        .dossier-grid-two {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          background: rgba(255, 255, 255, 0.008);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
        }

        .dossier-grid-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .highlight-type {
          font-weight: 700;
          color: var(--color-accent-hover);
        }

        .code-font {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .source-quote {
          background: #0a0a0a;
          border-left: 3px solid var(--color-accent);
          border-radius: 0 8px 8px 0;
          font-size: 13.5px;
          line-height: 1.6;
        }

        .dossier-reason-box {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 14px 16px;
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .timeline-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          box-shadow: var(--card-shadow);
        }

        .timeline-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 16px;
          margin-bottom: 20px;
        }

        .timeline-count {
          font-size: 12px;
          color: var(--text-muted);
        }

        .timeline {
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .timeline-item {
          display: flex;
          gap: 16px;
        }

        .timeline-marker-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }

        .timeline-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--border-color-hover);
          border: 2px solid var(--bg-card);
          z-index: 2;
          margin-top: 6px;
        }

        .timeline-dot.dot-approve {
          background: var(--color-primary);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
        }

        .timeline-dot.dot-revoke {
          background: var(--color-danger);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
        }

        .timeline-dot.dot-reject {
          background: var(--text-muted);
        }

        .timeline-dot.dot-expire {
          background: var(--text-muted);
        }

        .timeline-line {
          width: 2px;
          flex: 1;
          background: var(--border-color);
          margin: 4px 0;
        }

        .timeline-body {
          flex: 1;
          padding-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .timeline-event-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .timeline-event-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .badge-event-approve {
          background: rgba(255, 255, 255, 0.12);
          color: var(--color-primary-hover);
        }

        .badge-event-revoke {
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-danger-hover);
        }

        .badge-event-reject {
          background: rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
        }

        .badge-event-expire {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
        }

        .timeline-actor {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .timeline-time {
          font-size: 11px;
          color: var(--text-muted);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .timeline-note {
          font-size: 13px;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 8px 12px;
          margin-top: 4px;
          line-height: 1.4;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .detail-layout {
            grid-template-columns: 1fr;
          }
          .status-banner-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .status-banner-card button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
