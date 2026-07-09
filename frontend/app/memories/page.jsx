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

export default function MemoriesPage() {
  const [q, setQ] = useState("Qwen Cloud");
  const [memories, setMemories] = useState([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSearch(event) {
    event.preventDefault();
    const term = q.trim();
    if (!term) {
      setError("请输入搜索关键词。");
      return;
    }
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

  return (
    <main>
      <h1>记忆库</h1>

      <form onSubmit={onSearch}>
        <label>
          搜索
          <input value={q} onChange={(event) => setQ(event.target.value)} />
        </label>
        <div className="row">
          <button disabled={busy} type="submit">
            搜索记忆
          </button>
        </div>
      </form>

      {error ? <p className="error">{error}</p> : null}
      {searched && memories.length === 0 ? <p className="empty">没有找到记忆。</p> : null}

      <section className="grid">
        {memories.map((memory) => (
          <article className="card grid" key={memory.id}>
            <Link href={`/memories/${memory.id}`}>
              <strong>{memory.content}</strong>
            </Link>
            <p className="meta">
              {MEMORY_TYPE_LABELS[memory.type] || memory.type} | {STATUS_LABELS[memory.status] || memory.status}
              {typeof memory.score === "number" ? ` | 匹配分 ${memory.score}` : ""}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
