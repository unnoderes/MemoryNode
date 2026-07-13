"use client";

import React from "react";

export default function ParadigmShift({ t }) {
  return (
    <section>
      <div className="section-header-block">
        <h2 className="section-title">
          {t("设计理念革命：自治记忆 vs 传统向量记忆", "Paradigm Shift: Governed Memory vs Vector DB")}
        </h2>
        <p className="section-desc">
          {t("为什么传统智能体将记忆直接写入向量库是危险且低效？", "Why traditional direct database commits are dangerous for production agents.")}
        </p>
      </div>

      <div className="paradigm-comparison-grid">
        {/* Traditional Vector DB */}
        <div className="p-8 rounded-2xl text-left vector-db-card">
          <h3 className="text-base font-bold text-red-500 mb-4">{t("✕ 传统盲目记忆 (Vector DB Auto-commit)", "Traditional Vector DB Auto-commit")}</h3>
          <ul className="space-y-4 text-xs sm:text-sm text-slate-400 leading-relaxed">
            <li className="flex gap-2.5">
              <span className="text-red-500 font-bold">✕</span>
              <span>{t("静默写入副作用：智能体在后台自动生成并保存事实，用户不知情、不可见。", "Silent side-effects: Agent writes embeddings automatically without any admin visibility.")}</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-red-500 font-bold">✕</span>
              <span>{t("注入污染隐患：通过对话中带有偏见的叙述或恶意 Prompt，可污染智能体知识库。", "Injection poisoning: Untrusted user dialogues can inject and poison agent instructions.")}</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-red-500 font-bold">✕</span>
              <span>{t("黑盒无法追踪：大模型检索出了某些历史设定，却无法指出来源于哪次会话。", "Zero traceability: Recall statements lack source context, failing structural compliance.")}</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-red-500 font-bold">✕</span>
              <span>{t("规则冲突交织：当偏好或准则改变时，新旧条目在向量库中共存，逻辑打架。", "Outdated entanglements: Old facts remain active next to new rules, causing logic loops.")}</span>
            </li>
          </ul>
        </div>

        {/* Governed Memory */}
        <div className="p-8 rounded-2xl text-left governed-mem-card">
          <h3 className="text-base font-bold text-emerald-400 mb-4">{t("✓ MemoryNode 受管记忆 (Governed Memory)", "MemoryNode Governed Memory")}</h3>
          <ul className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <li className="flex gap-2.5">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>{t("提案缓冲机制：新信息提取生成待审提议，未经人工批准绝对不能进入智能体检索。", "Isolated Drafts: Candidate facts are isolated in draft pools, keeping search index clean.")}</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>{t("严格事实出处：每条生效的记忆都强绑定原文引用（Source Quote）和提取 Rationales。", "Fact-to-Evidence Link: All active facts are structurally linked to source quote citations.")}</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>{t("显式冲突覆盖：批准新事实时，支持指定 supersede_memory_id 显式撤销并覆盖旧数据。", "Conflict Resolving: Explicitly link older memory IDs to declare state overrides.")}</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>{t("透明废弃归档：撤销（Revoke）或过期事实将即刻移出检索索引，但保留溯源审计日志。", "Audit-safe Revocation: Instantly block retrieval of revoked facts while archiving history.")}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
