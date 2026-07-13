"use client";

import React, { useState } from "react";

export default function Hero({ t }) {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("pip install memorynode-sdk");
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <main className="hero-section">
      {/* Background Orbiting Particles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] pointer-events-none hidden md:block z-0">
        <div className="animate-orbit absolute w-2 h-2 rounded-full bg-sky-500/20"></div>
        <div className="animate-orbit-reverse absolute w-1.5 h-1.5 rounded-full bg-purple-500/25"></div>
      </div>

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-white/5 text-[10.5px] font-semibold text-slate-400 mb-8 uppercase tracking-wider">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
          </span>
          <span>{t("自治记忆治理层：开源 v0.4.2", "Governed Memory Layer: Open Source v0.4.2")}</span>
        </div>

        <h1 className="hero-title">
          {t("自治记忆，归于人治。", "Autonomous Memory, Governed by Humans.")}
        </h1>
        
        <p className="hero-subtitle">
          {t(
            "智能体不应盲目吸纳上下文。MemoryNode 提供基于证据的事实提取、人类在环的待审缓冲、基于关联的冲突覆盖与审计追踪。为高安全性的编码智能体与工作流而生。",
            "Stop blindly committing raw contexts. MemoryNode parses evidence-backed proposals, isolates untrusted memories in a drafts buffer, resolves semantic overrides, and maintains absolute audit history."
          )}
        </p>

        {/* Action Buttons */}
        <div className="hero-cta-buttons">
          <a href="#playground" className="pill-btn pill-btn-gradient text-sm py-3 px-8">
            {t("体验交互沙盒", "Explore Simulator")}
          </a>
          <a href="#api" className="pill-btn pill-btn-dark text-sm py-3 px-8">
            {t("查看集成文档", "Developer Setup")}
          </a>
        </div>

        {/* Installation and CLI Command bar */}
        <div className="hero-terminal-container">
          <div className="editor-frame bg-[#04060a]">
            <div className="editor-header">
              <div className="editor-dots">
                <span className="editor-dot r"></span>
                <span className="editor-dot y"></span>
                <span className="editor-dot g"></span>
              </div>
              <span className="editor-title">GET STARTED</span>
              <button 
                onClick={handleCopy} 
                className="text-[10px] text-slate-400 hover:text-white cursor-pointer font-bold"
              >
                {copyFeedback ? t("已复制", "Copied") : t("复制", "Copy")}
              </button>
            </div>
            <div className="editor-body text-left font-mono p-4 flex justify-between items-center text-xs">
              <span className="text-sky-300">pip install memorynode-sdk</span>
              <span className="text-slate-500 font-sans text-[11px]">{t("支持 Python / MCP 服务端", "Python & MCP Server ready")}</span>
            </div>
          </div>
          
          <div className="hero-integrations-bar">
            <span>{t("支持集成：", "Integrations:")} Cursor / Claude Code / Windsurf / FastHTML</span>
            <span>•</span>
            <a href="https://github.com/unnoderes/MemoryNode/releases" className="hover:text-white transition-colors">{t("下载 CLI 二进制包", "Download CLI Binaries")}</a>
          </div>
        </div>

        {/* Stats metrics grid */}
        <div className="w-full max-w-3xl mx-auto border border-white/5 bg-[#05070a]/40 backdrop-blur-md rounded-2xl p-1 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/5">
            <div className="text-center py-4 px-4">
              <div className="text-lg md:text-xl font-bold text-white tracking-tight">Sub-ms</div>
              <div className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider mt-1">{t("FTS5 检索速度", "FTS5 Recall Speed")}</div>
            </div>
            <div className="text-center py-4 px-4">
              <div className="text-lg md:text-xl font-bold text-white tracking-tight">100%</div>
              <div className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider mt-1">{t("人类在环审核", "Admin In-the-Loop")}</div>
            </div>
            <div className="text-center py-4 px-4">
              <div className="text-lg md:text-xl font-bold text-white tracking-tight">3-Tier</div>
              <div className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider mt-1">{t("记忆生命周期", "Lifecycle Stages")}</div>
            </div>
            <div className="text-center py-4 px-4">
              <div className="text-lg md:text-xl font-bold text-white tracking-tight">0%</div>
              <div className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider mt-1">{t("静默写入污染", "Silent Poisoning")}</div>
            </div>
          </div>
        </div>

        {/* Core Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mt-16 max-w-5xl mx-auto border border-white/5 bg-[#05070a]/30 rounded-2xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-white/5">
          <div className="p-8 group relative text-left hover:bg-white/[0.01] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold mb-6 shadow-lg group-hover:scale-110 transition-transform">01</div>
            <h3 className="text-white font-bold text-[14px] mb-3">{t("1. 证据出处 (Provenance)", "1. Strict Provenance")}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("所有提取记忆都必须保存 Source Quote（原句引用），提供大模型上下文以判定事实出处，防止捏造事实或产生幻觉。", "Every fact retains a direct source quote citation from conversational logs, preventing fabrications and hallucinated updates.")}
            </p>
          </div>
          
          <div className="p-8 group relative text-left hover:bg-white/[0.01] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold mb-6 shadow-lg group-hover:scale-110 transition-transform">02</div>
            <h3 className="text-white font-bold text-[14px] mb-3">{t("2. 待审隔离 (Isolation Buffer)", "2. Isolation Buffer")}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("新提案生成后默认处于 pending 隔离态，无法被智能体检索，必须通过人类管理员通过控制台或 CLI 执行批准后才激活。", "New suggestions are buffered in a pending state, physically isolated from active recall until checked by an admin.")}
            </p>
          </div>
          
          <div className="p-8 group relative text-left hover:bg-white/[0.01] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold mb-6 shadow-lg group-hover:scale-110 transition-transform">03</div>
            <h3 className="text-white font-bold text-[14px] mb-3">{t("3. 冲突覆写 (Supersession)", "3. Conflict Resolution")}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("允许关联已存在的旧事实 ID 执行覆盖（Approve & Supersede），废弃旧数据并重建检索关联，保证事实时效性。", "Allows reviewers to link new approvals to older memory IDs, executing a clean override that revokes stale context.")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
