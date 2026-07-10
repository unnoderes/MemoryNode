"use client";

import Link from "next/link";
import { useState } from "react";
import { searchMemories } from "../../lib/api";

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

function formatExpiresAt(value) {
  return new Date(value).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" });
}

export default function MemoriesPage() {
  const [q, setQ] = useState("Qwen Cloud");
  const [memories, setMemories] = useState([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function triggerSearch(term) {
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

  async function onSearch(event) {
    event.preventDefault();
    const term = q.trim();
    if (!term) {
      setError("请输入搜索关键词。");
      return;
    }
    await triggerSearch(term);
  }

  return (
    <div className="workbench-container">
      <header className="page-header">
        <h1>记忆检索工作台</h1>
        <p className="muted">输入检索关键词，在长期记忆资产库中执行语义与关键词搜索，并进行记忆血缘溯源与审计。</p>
      </header>

      {/* Workbench Toolbar */}
      <div className="search-card">
        <form onSubmit={onSearch}>
          <label htmlFor="search-input">
            检索关键词
          </label>
          <div className="search-bar-row">
            <input
              id="search-input"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="输入查询内容，例如 Qwen Cloud..."
            />
            <button disabled={busy} type="submit">
              {busy ? (
                <>
                  <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  <span>检索中...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <span>检索记忆</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="search-suggestions">
          <span className="suggestion-label">推荐快捷查询:</span>
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

      {/* Error state */}
      {error ? (
        <div className="workbench-error-state">
          <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3>检索请求失败</h3>
          <p className="muted" style={{ fontSize: '13px', maxWidth: '400px' }}>{error}</p>
          <button className="secondary" onClick={() => triggerSearch(q)} style={{ marginTop: '8px' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89" /></svg>
            重新尝试检索
          </button>
        </div>
      ) : null}

      {/* First time use state */}
      {!searched && !error ? (
        <div className="empty-workbench-state">
          <svg className="workbench-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3>欢迎使用记忆检索工作台</h3>
          <p style={{ maxWidth: '420px', fontSize: '13px', opacity: 0.8 }}>
            在上方输入对话上下文或核心概念，检索机制将查找关联的记忆链条。点击推荐项可快速体验。
          </p>
        </div>
      ) : null}

      {/* No results state */}
      {searched && memories.length === 0 && !error ? (
        <div className="empty-workbench-state">
          <svg className="workbench-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3>未找到匹配的记忆记录</h3>
          <p style={{ maxWidth: '420px', fontSize: '13px', opacity: 0.8 }}>
            未搜索到与 <strong>“{q}”</strong> 匹配的记忆。您可以尝试缩短关键词，或者前往“提案审核”页抽取并导入新的记忆资产。
          </p>
        </div>
      ) : null}

      {/* Results grid */}
      {searched && memories.length > 0 && !error ? (
        <section className="memory-results-grid">
          {memories.map((memory) => (
            <article className="memory-result-card" key={memory.id}>
              <div className="memory-card-top">
                <div className="memory-status-and-type">
                  <span className={`badge badge-${memory.status}`}>
                    {STATUS_LABELS[memory.status] || memory.status}
                  </span>
                  <span className="badge-type-label">
                    {MEMORY_TYPE_LABELS[memory.type] || memory.type}
                  </span>
                </div>
                {typeof memory.score === "number" ? (
                  <div className="memory-score-badge">
                    <span className="score-label">匹配度</span>
                    <span className="score-val">{(memory.score * 100).toFixed(0)}%</span>
                  </div>
                ) : null}
              </div>

              <div className="memory-card-body">
                <p className="memory-content-text">{memory.content}</p>
                {memory.expires_at ? <p className="memory-expiry">到期于 {formatExpiresAt(memory.expires_at)}</p> : null}
              </div>

              <div className="memory-card-footer">
                <span className="memory-id-tag">UUID: {memory.id.substring(0, 8)}...</span>
                <Link href={`/memories/${memory.id}`} className="audit-link">
                  <span>可信审计</span>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : null}

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
        }

        .search-bar-row {
          display: flex;
          gap: 12px;
        }

        .search-bar-row input {
          flex: 1;
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
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.3);
          color: var(--color-primary-hover);
        }

        .memory-results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .memory-result-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
          min-height: 180px;
          transition: all 0.2s ease;
        }

        .memory-result-card:hover {
          border-color: var(--border-color-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        }

        .memory-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .memory-status-and-type {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .badge-type-label {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 600;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .memory-score-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.15);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .score-label {
          color: var(--text-muted);
        }

        .score-val {
          color: #60a5fa;
          font-weight: 700;
        }

        .memory-content-text {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.5;
        }

        .memory-expiry {
          margin: 10px 0 0;
          color: var(--text-muted);
          font-size: 12px;
        }

        .memory-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
          font-size: 12px;
        }

        .memory-id-tag {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          color: var(--text-muted);
        }

        .audit-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          color: var(--color-primary);
        }

        .audit-link:hover {
          color: var(--color-primary-hover);
          text-decoration: none;
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
        }

        .workbench-icon {
          width: 48px;
          height: 48px;
          color: var(--text-muted);
          opacity: 0.5;
        }

        .workbench-error-state {
          text-align: center;
          padding: 40px 20px;
          background: rgba(239, 68, 68, 0.04);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 12px;
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
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

        @media (max-width: 768px) {
          .search-bar-row {
            flex-direction: column;
          }
          .search-bar-row button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
