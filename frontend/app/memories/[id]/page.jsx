"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { explainMemory, revokeMemory } from "../../../lib/api";

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
  approve: "核准批准",
  reject: "安全拒绝",
  revoke: "人工撤销",
  supersede: "替代旧记忆",
  superseded: "已被替代",
};

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
    <div className="detail-container">
      <header className="detail-header">
        <div>
          <Link href="/memories" className="back-link">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回记忆库</span>
          </Link>
          <h1 style={{ marginTop: '8px' }}>可信记忆审计与归档</h1>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}

      {!detail && !error ? (
        <div className="empty" style={{ padding: '60px 0' }}>
          <svg className="animate-spin empty-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span style={{ marginTop: '12px' }}>正在加载记忆档案与可信审计追踪...</span>
        </div>
      ) : null}

      {detail ? (
        <>
          {/* Top Status & Operation Panel */}
          <div className={`status-banner-card banner-${memory.status}`}>
            <div className="banner-text-wrapper">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                {memory.status === 'active' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                )}
              </svg>
              <div>
                <span className="banner-title">
                  当前记忆状态: {STATUS_LABELS[memory.status] || memory.status}
                </span>
                <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '2px' }}>
                  {memory.status === 'active'
                    ? "该记忆体目前在系统中为生效活跃状态，对大语言模型上下文检索可见并作为运行约束。"
                    : memory.status === 'revoked'
                    ? "该记忆体已被人工撤销，已对外部 API 及推理屏蔽。审计日志及历史记录已归档以备合规性核验。"
                    : "该记忆已到期，不再在大语言模型推理中激活。"}
                </p>
              </div>
            </div>
            {memory.status === "active" ? (
              <button className="danger" disabled={busy} onClick={onRevoke}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                {busy ? "正在撤销..." : "撤销此记忆"}
              </button>
            ) : null}
          </div>

          {detail.supersedes || detail.superseded_by ? (
            <div className="supersession-links">
              {detail.supersedes ? (
                <span>
                  替代自 <Link href={`/memories/${detail.supersedes.id}`}>{detail.supersedes.content}</Link>
                </span>
              ) : null}
              {detail.superseded_by ? (
                <span>
                  已被替代 <Link href={`/memories/${detail.superseded_by.id}`}>{detail.superseded_by.content}</Link>
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="detail-layout">
            {/* Left Column: Dossier Details */}
            <section className="dossier-column">
              <div className="dossier-card">
                <div className="dossier-header-row">
                  <span className="dossier-section-title">记忆体元档案</span>
                  <span className="dossier-id">UUID: {memory.id}</span>
                </div>
                
                <div className="dossier-content-block">
                  <span className="dossier-label">核定记忆文本</span>
                  <div className="dossier-value memory-text">{memory.content}</div>
                </div>

                <div className="dossier-grid-two">
                  <div>
                    <span className="dossier-label">类别分区</span>
                    <div className="dossier-value" style={{ fontWeight: 600 }}>
                      {MEMORY_TYPE_LABELS[memory.type] || memory.type}
                    </div>
                  </div>
                  <div>
                    <span className="dossier-label">归属项目</span>
                    <div className="dossier-value" style={{ fontFamily: 'monospace' }}>
                      {proposal?.project_id || "default"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="dossier-card">
                <span className="dossier-section-title">可信溯源：原始会话摘录证据</span>
                <blockquote className="pre source-quote">
                  {proposal?.source_quote || "暂无来源会话摘录证据。"}
                </blockquote>
              </div>

              <div className="dossier-card">
                <span className="dossier-section-title">模型抽取及写入理由</span>
                <div className="dossier-reason-box">
                  {proposal?.reason || "暂无大模型写入理由。"}
                </div>
              </div>
            </section>

            {/* Right Column: Audit Timeline */}
            <aside>
              <div className="timeline-card">
                <div className="timeline-header-row">
                  <span className="dossier-section-title">生命周期审计轨迹流水</span>
                  <span className="timeline-count">共 {events.length} 个记录</span>
                </div>

                {events.length === 0 ? (
                  <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>暂无审计流水事件记录。</p>
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
                              {EVENT_LABELS[event.event_type] || event.event_type}
                            </span>
                            <span className="timeline-actor">由 <strong>{event.actor_id}</strong> 触发</span>
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
        }

        .back-link:hover {
          color: var(--text-primary);
          text-decoration: none;
        }

        .status-banner-card {
          padding: 20px 24px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .banner-active {
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.15);
          color: var(--color-primary-hover);
        }

        .banner-revoked {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: var(--color-danger-hover);
        }

        .banner-expired {
          background: rgba(100, 116, 139, 0.05);
          border: 1px solid rgba(100, 116, 139, 0.15);
          color: var(--text-secondary);
        }

        .banner-text-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .banner-title {
          font-weight: 700;
          font-size: 16px;
          display: block;
        }

        .detail-layout {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 32px;
          align-items: start;
        }

        .supersession-links {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px 16px;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .supersession-links a {
          color: var(--color-primary);
          overflow-wrap: anywhere;
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
          font-size: 13px;
          font-weight: 700;
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
          font-size: 14px;
          color: var(--text-primary);
        }

        .dossier-value.memory-text {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.5;
        }

        .dossier-grid-two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
        }

        .dossier-reason-box {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 14px;
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .timeline-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
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
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
        }

        .timeline-dot.dot-revoke {
          background: var(--color-danger);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
        }

        .timeline-dot.dot-reject {
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
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-primary-hover);
        }

        .badge-event-revoke {
          background: rgba(239, 68, 68, 0.15);
          color: var(--color-danger-hover);
        }

        .badge-event-reject {
          background: rgba(100, 116, 139, 0.15);
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
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 8px 10px;
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
