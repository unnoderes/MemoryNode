"use client";

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
  approve: "批准",
  reject: "拒绝",
  revoke: "撤销",
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
    <main>
      <h1>记忆详情</h1>

      {error ? <p className="error">{error}</p> : null}
      {!detail && !error ? <p className="empty">正在加载记忆...</p> : null}

      {detail ? (
        <section className="grid">
          <article className="card grid">
            <div className="row">
              <strong>{memory.content}</strong>
              {memory.status === "active" ? (
                <button className="danger" disabled={busy} onClick={onRevoke}>
                  撤销
                </button>
              ) : null}
            </div>
            <p className="meta">
              状态：{STATUS_LABELS[memory.status] || memory.status} | 类型：{MEMORY_TYPE_LABELS[memory.type] || memory.type}
            </p>
          </article>

          <article className="card grid">
            <h2>来源摘录</h2>
            <p className="pre">{proposal.source_quote || "暂无来源摘录。"}</p>
          </article>

          <article className="card grid">
            <h2>记忆理由</h2>
            <p>{proposal.reason || "暂无理由。"}</p>
          </article>

          <article className="card grid">
            <h2>事件记录</h2>
            {events.length === 0 ? <p className="muted">暂无事件。</p> : null}
            {events.map((event) => (
              <div className="pre" key={event.id}>
                {event.created_at} | {EVENT_LABELS[event.event_type] || event.event_type} | {event.actor_id}
                {event.note ? ` | ${event.note}` : ""}
              </div>
            ))}
          </article>
        </section>
      ) : null}
    </main>
  );
}
