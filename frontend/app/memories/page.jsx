"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { searchMemories, explainMemory, revokeMemory } from "../../lib/api";

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
  expire: "记忆到期",
};

function formatExpiresAt(value) {
  return new Date(value).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" });
}

export default function MemoriesPage() {
  const [q, setQ] = useState("Qwen Cloud");
  const [memories, setMemories] = useState([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function triggerSearch(term) {
    setBusy(true);
    setError("");
    try {
      const body = await searchMemories(term);
      const list = body.memories || [];
      setMemories(list);
      setSearched(true);
      if (list.length > 0) {
        if (!list.some(m => m.id === selectedId)) {
          setSelectedId(list[0].id);
        }
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSearch(event) {
    event.preventDefault();
    const term = q.trim();
    if (!term) {
      setError("请输入搜索关键词。");
      return;
    }
    await triggerSearch(term);
  }

  useEffect(() => {
    let active = true;
    if (selectedId) {
      setDetailLoading(true);
      explainMemory(selectedId)
        .then(body => {
          if (active) {
            setSelectedDetail(body);
          }
        })
        .catch(err => {
          if (active) {
            setError(err.message);
          }
        })
        .finally(() => {
          if (active) {
            setDetailLoading(false);
          }
        });
    } else {
      setSelectedDetail(null);
    }
    return () => {
      active = false;
    };
  }, [selectedId]);

  async function onRevoke() {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      await revokeMemory(selectedId);
      // Re-fetch detail
      const body = await explainMemory(selectedId);
      setSelectedDetail(body);
      // Re-fetch list
      const searchBody = await searchMemories(q);
      setMemories(searchBody.memories || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workbench-container">
      <header className="page-header">
        <h1>长期记忆库检索</h1>
        <p className="muted">在已授权的长期记忆资产中执行精确及全文检索。系统默认仅返回状态为“生效中”的活跃记忆实体。</p>
      </header>

      {/* Workbench Toolbar */}
      <div className="search-card">
        <form onSubmit={onSearch}>
          <label htmlFor="search-input" className="search-label-row">
            <span>检索关键词 (Search Query)</span>
            <span className="engine-badge">SQLite FTS5 检索引擎已就绪</span>
          </label>
          <div className="search-bar-row">
            <div className="input-with-icon">
              <svg className="input-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="search-input"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="输入检索内容，例如 Qwen Cloud..."
              />
            </div>
            <button disabled={busy} type="submit" className="btn-search">
              {busy ? (
                <>
                  <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  <span>检索中...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <span>执行检索</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="search-info-tip">
          <svg className="tip-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>默认配置下，安全检索仅返回当前<strong>生效中 (Active)</strong>的记忆。已到期、已替换或撤销的记忆对大模型推理不可见，可通过 UUID 进入详情页审计。</span>
        </div>

        <div className="search-suggestions">
          <span className="suggestion-label">快捷检索词:</span>
          {["Qwen Cloud", "FastAPI", "SQLite", "Next.js"].map((term) => (
            <button
              key={term}
              type="button"
              className="suggestion-tag"
              onClick={() => {
                setQ(term);
                triggerSearch(term);
              }}
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="soc-layout">
        {/* Left Column: Search Results */}
        <div className="soc-left-panel">
          <h2>检索结果 ({memories.length})</h2>

          {!searched ? (
            <div className="empty-workbench-state">
              <svg className="workbench-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3>长期记忆库检索准备就绪</h3>
              <p style={{ maxWidth: '420px', fontSize: '13px', opacity: 0.8 }}>
                在上方输入对话上下文或核心概念，检索机制将查找关联的记忆链条。
              </p>
            </div>
          ) : memories.length === 0 ? (
            <div className="empty-workbench-state">
              <svg className="workbench-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3>未找到匹配的记忆记录</h3>
              <p style={{ maxWidth: '420px', fontSize: '13px', opacity: 0.8 }}>
                未搜索到与 <strong>“{q}”</strong> 匹配的记忆。您可以尝试缩短关键词，或者前往“提案审核”页抽取并导入新的记忆资产。
              </p>
            </div>
          ) : (
            <div className="compact-memory-list">
              {memories.map((memory) => {
                const isSelected = memory.id === selectedId;
                return (
                  <div
                    key={memory.id}
                    className={`compact-memory-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedId(memory.id)}
                  >
                    <div className="compact-item-header">
                      <span className={`badge badge-${memory.status}`}>
                        {STATUS_LABELS[memory.status] || memory.status}
                      </span>
                      <span className="compact-item-type">
                        {MEMORY_TYPE_LABELS[memory.type] || memory.type}
                      </span>
                    </div>
                    <p className="compact-item-text">{memory.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Inline Dossier Audit */}
        <div className="soc-right-panel">
          {detailLoading ? (
            <div className="empty-audit-detail">
              <svg className="animate-spin empty-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p style={{ marginTop: '12px' }}>正在加载记忆档案与可信审计追踪...</p>
            </div>
          ) : selectedDetail ? (
            <div className="audit-detail-card">
              <div className="detail-card-header">
                <span className="detail-section-label">长期记忆可信审计流水</span>
                <div className={`status-banner-card banner-${selectedDetail.memory.status}`} style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '13.5px' }}>状态: {STATUS_LABELS[selectedDetail.memory.status] || selectedDetail.memory.status}</span>
                  {selectedDetail.memory.status === "active" && (
                    <button className="danger btn-sm" disabled={busy} onClick={onRevoke} style={{ padding: '4px 10px', fontSize: '11px' }}>
                      撤销此条记忆
                    </button>
                  )}
                </div>
                <h2>{selectedDetail.memory.content}</h2>
                <div className="detail-meta-row">
                  <span className="badge badge-type">
                    {MEMORY_TYPE_LABELS[selectedDetail.memory.type] || selectedDetail.memory.type}
                  </span>
                  <span className="conf-badge">
                    UUID: {selectedDetail.memory.id.substring(0, 8)}...
                  </span>
                  <Link href={`/memories/${selectedDetail.memory.id}`} className="audit-link-nav">
                    完整审计流水 ↗
                  </Link>
                </div>
              </div>

              <div className="detail-body">
                {selectedDetail.proposal?.source_quote && (
                  <div className="detail-field">
                    <div className="detail-field-title">原始会话证据摘录 (Evidence)</div>
                    <blockquote className="pre source-quote" style={{ fontSize: '12.5px', padding: '10px 12px' }}>
                      {selectedDetail.proposal.source_quote}
                    </blockquote>
                  </div>
                )}

                {selectedDetail.proposal?.reason && (
                  <div className="detail-field">
                    <div className="detail-field-title">大模型抽取推理理由 (Model Rationale)</div>
                    <div className="proposal-reason-box" style={{ fontSize: '12.5px', padding: '10px 12px' }}>
                      {selectedDetail.proposal.reason}
                    </div>
                  </div>
                )}

                <div className="dossier-grid-two" style={{ gridTemplateColumns: '1fr 1fr', padding: '12px', gap: '10px' }}>
                  <div className="dossier-grid-item">
                    <span className="dossier-label">项目空间</span>
                    <div className="dossier-value code-font" style={{ fontSize: '12px' }}>{selectedDetail.proposal?.project_id || "default"}</div>
                  </div>
                  <div className="dossier-grid-item">
                    <span className="dossier-label">到期生命周期</span>
                    <div className="dossier-value" style={{ fontSize: '12px' }}>
                      {selectedDetail.memory.expires_at ? formatExpiresAt(selectedDetail.memory.expires_at) : "永久有效"}
                    </div>
                  </div>
                </div>

                {selectedDetail.events && selectedDetail.events.length > 0 && (
                  <div className="detail-field">
                    <div className="detail-field-title">生命周期审计轨迹 (Audit Trail)</div>
                    <div className="timeline-mini" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      {selectedDetail.events.slice(0, 3).map((event) => (
                        <div key={event.id} style={{ display: 'flex', gap: '10px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                          <span className={`timeline-event-badge badge-event-${event.event_type}`} style={{ fontSize: '9px', padding: '1px 4px' }}>
                            {EVENT_LABELS[event.event_type] || event.event_type}
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>由 {event.actor_id} 于 {event.created_at.split(' ')[0]} 触发</span>
                        </div>
                      ))}
                      {selectedDetail.events.length > 3 && (
                        <Link href={`/memories/${selectedDetail.memory.id}`} style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: '600', marginTop: '2px' }}>
                          查看全部 {selectedDetail.events.length} 个审计记录...
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-audit-detail">
              <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3>待选定记忆审计</h3>
              <p>请在左侧列表中点击选择一条记忆，以在此加载可审计档案详情并执行归档操作。</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .workbench-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .search-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: var(--card-shadow);
        }

        .search-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .engine-badge {
          font-size: 10px;
          color: var(--color-accent);
          font-weight: 700;
          letter-spacing: 0.05em;
          background: rgba(6, 182, 212, 0.08);
          border: 1px solid rgba(6, 182, 212, 0.2);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .search-bar-row {
          display: flex;
          gap: 12px;
          position: relative;
        }

        .input-with-icon {
          position: relative;
          flex: 1;
        }

        .input-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-with-icon input {
          padding-left: 44px;
        }

        .btn-search {
          background: var(--color-accent);
          color: #050814;
        }

        .btn-search:hover {
          background: var(--color-accent-hover);
          box-shadow: 0 4px 15px var(--color-accent-glow);
        }

        .search-info-tip {
          font-size: 12px;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          gap: 10px;
          align-items: center;
          line-height: 1.4;
        }

        .tip-icon {
          color: var(--color-accent);
          flex-shrink: 0;
        }

        .search-suggestions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          padding-top: 12px;
        }

        .suggestion-label {
          font-size: 12px;
          color: var(--text-muted);
          margin-right: 4px;
        }

        .suggestion-tag {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .suggestion-tag:hover {
          background: rgba(6, 182, 212, 0.08);
          border-color: rgba(6, 182, 212, 0.3);
          color: var(--color-accent-hover);
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
          gap: 16px;
        }

        .compact-memory-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .compact-memory-item {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 14px 16px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .compact-memory-item:hover {
          border-color: var(--border-color-hover);
          background: rgba(255, 255, 255, 0.015);
        }

        .compact-memory-item.selected {
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
          font-size: 20px;
          font-weight: 700;
          line-height: 1.4;
          margin-bottom: 12px;
          color: var(--text-primary);
        }

        .detail-meta-row {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
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

        .audit-link-nav {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-accent);
        }

        .audit-link-nav:hover {
          color: var(--color-accent-hover);
          text-decoration: underline;
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

        .dossier-grid-two {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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

        .dossier-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .dossier-value {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .code-font {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .source-quote {
          background: #050813;
          border-left: 3px solid var(--color-accent);
          border-radius: 0 8px 8px 0;
          font-size: 13px;
          line-height: 1.5;
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
          background: rgba(244, 63, 94, 0.15);
          color: var(--color-danger-hover);
        }

        .badge-event-reject {
          background: rgba(148, 163, 184, 0.15);
          color: #cbd5e1;
        }

        .badge-event-expire {
          background: rgba(148, 163, 184, 0.15);
          color: var(--text-muted);
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

        .workbench-icon {
          width: 48px;
          height: 48px;
          color: var(--text-muted);
          opacity: 0.4;
        }

        .empty-workbench-state {
          text-align: center;
          padding: 60px 20px;
          border: 1px dashed var(--border-color);
          border-radius: 12px;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.005);
        }

        .error-icon {
          width: 40px;
          height: 40px;
          color: var(--color-danger);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .soc-layout {
            grid-template-columns: 1fr;
          }
          .soc-right-panel {
            position: static;
          }
        }

        @media (max-width: 768px) {
          .search-bar-row {
            flex-direction: column;
          }
          .search-bar-row button {
            width: 100%;
          }
          .search-info-tip {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
}
