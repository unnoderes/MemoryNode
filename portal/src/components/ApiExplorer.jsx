"use client";

import React, { useState } from "react";
import { DEV_API_DATA } from "../lib/constants";

const MOCK_RESPONSES = {
  extract: {
    status: 200,
    body: {
      "status": "success",
      "proposals": [
        {
          "id": "prop_908f2",
          "content": "Mike prefers raw CSS over Tailwind CSS in React development.",
          "type": "user_preference",
          "confidence": 0.94,
          "source_quote": "I prefer writing raw CSS instead of Tailwind...",
          "reason": "User explicitly stated coding preferences."
        }
      ]
    }
  },
  approve: {
    status: 200,
    body: {
      "status": "success",
      "memory_id": "mem_01c23f",
      "activated": true,
      "superseded_id": "mem_old_902",
      "expires_at": "2026-12-31T23:59:59Z"
    }
  },
  search: {
    status: 200,
    body: {
      "query": "React CSS",
      "results_count": 1,
      "memories": [
        {
          "id": "mem_01c23f",
          "content": "Mike prefers raw CSS over Tailwind CSS in React development.",
          "type": "user_preference",
          "confidence": 0.94,
          "source_quote": "I prefer writing raw CSS instead of Tailwind...",
          "created_at": "2026-07-14T00:30:00Z"
        }
      ]
    }
  },
  revoke: {
    status: 200,
    body: {
      "status": "success",
      "memory_id": "mem_04d82c",
      "action": "revoked",
      "deindexed_from_fts5": true
    }
  }
};

export default function ApiExplorer({ language, t }) {
  const [activeApiTab, setActiveApiTab] = useState("extract");
  const [codeLang, setCodeLang] = useState("python");
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const responseJson = JSON.stringify(MOCK_RESPONSES[activeApiTab].body, null, 2);
  const requestCode = codeLang === "python" ? DEV_API_DATA[activeApiTab].python : DEV_API_DATA[activeApiTab].curl;

  return (
    <section id="api">
      <div className="section-header-block">
        <h2 className="section-title">
          {t("极简的集成协议 (API Reference)", "Minimal API reference")}
        </h2>
        <p className="section-desc">
          {t("开箱即用的 RESTful 风格的 HTTP 接口，可轻松与您的任何 AI Agents 智能体框架无缝整合。", "Integrate MemoryNode into your custom LangChain, AutoGen, or custom agent flow with REST contracts.")}
        </p>
      </div>

      <div className="api-explorer-grid">
        {/* Left Side: Route Directory */}
        <div className="glass-card p-4 space-y-1.5 glow-border">
          <div className="text-[10px] font-bold text-slate-500 uppercase px-3 mb-3 tracking-widest">{t("核心生命周期接口", "Core API routes")}</div>
          {Object.keys(DEV_API_DATA).map((key) => (
            <button
              key={key}
              onClick={() => setActiveApiTab(key)}
              className={`api-route-btn ${activeApiTab === key ? 'active' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                  DEV_API_DATA[key].method === 'POST' ? 'text-emerald-400 bg-emerald-950/20 border border-emerald-900/30' : 'text-sky-400 bg-sky-950/20 border border-sky-900/30'
                }`}>
                  {DEV_API_DATA[key].method}
                </span>
                <span className="font-mono text-xs font-semibold">{DEV_API_DATA[key].url}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Right Side: Split-Pane Editor */}
        <div className="flex flex-col gap-4">
          <div className="glass-card glow-border p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 mb-4 gap-4">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white mb-1 font-mono uppercase tracking-wider">
                  {DEV_API_DATA[activeApiTab].method} {DEV_API_DATA[activeApiTab].url}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === "zh" ? DEV_API_DATA[activeApiTab].desc_zh : DEV_API_DATA[activeApiTab].desc_en}
                </p>
              </div>
              
              {/* Language Selector */}
              <div className="flex gap-1.5 bg-[#070a0f] p-1 rounded-lg border border-white/5">
                <button 
                  onClick={() => setCodeLang("python")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${
                    codeLang === 'python' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Python
                </button>
                <button 
                  onClick={() => setCodeLang("curl")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${
                    codeLang === 'curl' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  cURL
                </button>
              </div>
            </div>

            {/* Split Pane: Request & Response */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Request Code Block */}
              <div className="editor-frame bg-[#04060a]">
                <div className="editor-header">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {codeLang === 'python' ? 'main.py' : 'terminal'}
                  </span>
                  <button
                    onClick={() => handleCopy(requestCode)}
                    className="text-[10px] text-slate-400 hover:text-white font-bold cursor-pointer"
                  >
                    {copyFeedback ? t("已复制!", "Copied!") : t("复制代码", "Copy Request")}
                  </button>
                </div>
                <div className="editor-body p-4 overflow-x-auto text-[11px] bg-[#04060a] text-slate-300 font-mono min-h-[220px]">
                  <pre className="whitespace-pre">{requestCode}</pre>
                </div>
              </div>

              {/* Response JSON Block */}
              <div className="editor-frame bg-[#04060a]">
                <div className="editor-header">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">response.json</span>
                    <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-1 py-0.5 rounded">200 OK</span>
                  </div>
                  <button
                    onClick={() => handleCopy(responseJson)}
                    className="text-[10px] text-slate-400 hover:text-white font-bold cursor-pointer"
                  >
                    {copyFeedback ? t("已复制!", "Copied!") : t("复制 JSON", "Copy JSON")}
                  </button>
                </div>
                <div className="editor-body p-4 overflow-x-auto text-[11px] bg-[#04060a] text-emerald-400/90 font-mono min-h-[220px] leading-relaxed">
                  <pre className="whitespace-pre">{responseJson}</pre>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
