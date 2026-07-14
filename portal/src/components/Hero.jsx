"use client";

import React from "react";

export default function Hero({ t }) {
  return (
    <main className="hero-section">
      {/* Background Orbiting Particles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] pointer-events-none hidden md:block z-0">
        <div className="animate-orbit absolute w-2 h-2 rounded-full bg-white/10"></div>
        <div className="animate-orbit-reverse absolute w-1.5 h-1.5 rounded-full bg-white/15"></div>
      </div>

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-neutral-900 border border-white/5 text-[10.5px] font-bold text-slate-400 mb-8 uppercase tracking-wider">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded bg-white opacity-75"></span>
            <span className="relative inline-flex rounded h-1.5 w-1.5 bg-white"></span>
          </span>
          <span>{t("阿里云通义千问 Hackathon 参赛作品：MemoryAgent 赛道", "Qwen Cloud Global AI Hackathon Entry: MemoryAgent Track")}</span>
        </div>

        <h1 className="hero-title">
          <span className="text-white block sm:inline">{t("MemoryNode:", "MemoryNode:")}</span>{" "}
          <span className="bg-gradient-to-r from-white via-neutral-300 to-neutral-500 bg-clip-text text-transparent block sm:inline">
            {t("通义千问智能体持久化记忆治理层", "Human-Governed Memory for Qwen Agents")}
          </span>
        </h1>
        
        <p className="hero-subtitle">
          {t(
            "专为通义千问大模型（Qwen-2.5-Coder / Qwen-3.7-Max）定制的持久化记忆管理系统。提供基于证据的事实提取、待审隔离缓冲、冲突显式覆盖与完整审计追踪，解决智能体在长期自主工作流中的记忆污染与 Prompt 注入隐患。",
            "A secure persistent memory governance middleware built for Qwen agents. MemoryNode provides semantic fact extraction, draft buffer isolation, human-in-the-loop review, and auditable supersession. Prevent silent context poisoning."
          )}
        </p>

        {/* Action Buttons */}
        <div className="hero-cta-buttons">
          <a href="#playground" className="pill-btn pill-btn-gradient text-sm py-3 px-8 font-bold">
            {t("体验交互沙盒", "Explore Sandbox")}
          </a>
          <a href="#architecture" className="pill-btn pill-btn-dark text-sm py-3 px-8 font-bold">
            {t("查看系统架构", "View Architecture")}
          </a>
        </div>

        {/* Hackathon Project Metadata Specs Card */}
        <div className="hero-terminal-container max-w-3xl mx-auto mt-12 mb-16">
          <div className="editor-frame bg-[#050505]">
            <div className="editor-header flex items-center justify-between border-b border-white/5 px-4 py-2 bg-black/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Specifications</span>
              </div>
              <span className="text-[9px] font-mono text-slate-500">SUBMISSION MANIFEST</span>
            </div>
            
            <div className="p-5 text-left text-xs text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-4 leading-relaxed font-sans">
              <div className="space-y-3">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-medium">{t("目标赛事", "Target Arena")}</span>
                  <span className="font-bold text-white text-right">{t("Qwen Cloud 挑战赛", "Qwen Cloud Global AI Hackathon")}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-medium">{t("申报赛道", "Challenge Track")}</span>
                  <span className="font-bold text-white text-right">MemoryAgent Track</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-medium">{t("主办单位", "Host Sponsor")}</span>
                  <span className="font-bold text-white text-right">{t("阿里巴巴云 (Alibaba Cloud)", "Alibaba Cloud")}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-medium">{t("基础大模型", "Agent Core Model")}</span>
                  <span className="font-bold text-white text-right">Qwen-2.5-Coder / 3.7-Max</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-medium">{t("底层核心依赖", "Tech Core Stack")}</span>
                  <span className="font-bold text-white text-right">FastAPI + SQLite FTS5</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-medium">{t("安全控制模式", "Security Architecture")}</span>
                  <span className="font-bold text-white text-right">{t("人类在环主动校验", "Human-in-the-loop Gate")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Core Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mt-16 max-w-5xl mx-auto border border-white/5 bg-[#050505]/45 rounded-lg overflow-hidden divide-y md:divide-y-0 md:divide-x divide-white/5">
          <div className="p-8 group relative text-left hover:bg-white/[0.01] transition-colors">
            <div className="w-10 h-10 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center text-white text-xs font-bold mb-6 group-hover:scale-105 transition-transform">01</div>
            <h3 className="text-white font-bold text-[14px] mb-3">{t("1. 证据出处 (Provenance)", "1. Strict Provenance")}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("基于 Qwen-2.5-Coder 提取的记忆提案均强绑定对话原文引用（Source Quote）和事实推导理由，杜绝大模型的主观凭空捏造与幻觉偏见。", "Every rule suggested by Qwen models retains a direct source quote citation from dialogue logs, preventing fabrications and hallucinated updates.")}
            </p>
          </div>
          
          <div className="p-8 group relative text-left hover:bg-white/[0.01] transition-colors">
            <div className="w-10 h-10 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center text-white text-xs font-bold mb-6 group-hover:scale-105 transition-transform">02</div>
            <h3 className="text-white font-bold text-[14px] mb-3">{t("2. 待审隔离 (Isolation Buffer)", "2. Isolation Buffer")}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("提取提案首先进入 pending 状态进行物理隔离，绝不影响实时上下文召回。只有经过人类管理员控制台或 CLI 显式批准后才激活写入检索库。", "New suggestions are buffered in a pending state, isolated from active recall until approved by an admin via console or CLI.")}
            </p>
          </div>
          
          <div className="p-8 group relative text-left hover:bg-white/[0.01] transition-colors">
            <div className="w-10 h-10 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center text-white text-xs font-bold mb-6 group-hover:scale-105 transition-transform">03</div>
            <h3 className="text-white font-bold text-[14px] mb-3">{t("3. 冲突覆写 (Supersession)", "3. Conflict Resolution")}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("允许管理员在核准新事实时关联旧冲突事实 ID 进行覆盖（Approve & Supersede），即刻撤销陈旧或冲突的历史记忆并重建检索链条。", "Allows reviewers to link new approvals to older memory IDs, executing an override that revokes stale context while preserving the audit path.")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
