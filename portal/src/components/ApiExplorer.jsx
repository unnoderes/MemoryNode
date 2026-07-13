"use client";

import React, { useState } from "react";
import { DEV_API_DATA } from "../lib/constants";

export default function ApiExplorer({ language, t }) {
  const [activeApiTab, setActiveApiTab] = useState("extract");
  const [codeLang, setCodeLang] = useState("python");
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <section id="api" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-[#111]">
      <div className="text-center mb-16">
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-4">
          {t("极简的集成协议 (API Reference)", "Minimal API reference")}
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          {t("开箱即用的 RESTful 风格的 HTTP 接口，可轻松与您的任何 AI Agents 智能体框架无缝整合。", "Integrate MemoryNode into your custom LangChain, AutoGen, or custom agent flow with REST contracts.")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Menu */}
        <div className="glass-card p-4 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase px-3 mb-3">{t("核心生命周期接口", "Core API routes")}</div>
          {Object.keys(DEV_API_DATA).map((key) => (
            <button
              key={key}
              onClick={() => setActiveApiTab(key)}
              className={`w-full flex items-center justify-between text-left p-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeApiTab === key
                  ? 'bg-[#0f172a] text-white border-l-2 border-sky-400 pl-4'
                  : 'text-slate-400 hover:bg-[#070a0f] hover:text-white pl-3'
              }`}
            >
              <div>
                <span className={`text-[9px] font-extrabold mr-2 uppercase ${
                  DEV_API_DATA[key].method === 'POST' ? 'text-emerald-400' : 'text-sky-400'
                }`}>
                  {DEV_API_DATA[key].method}
                </span>
                <span>{DEV_API_DATA[key].url}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Snippet Viewer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-4 mb-4">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white mb-1 font-mono">
                  {DEV_API_DATA[activeApiTab].method} {DEV_API_DATA[activeApiTab].url}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === "zh" ? DEV_API_DATA[activeApiTab].desc_zh : DEV_API_DATA[activeApiTab].desc_en}
                </p>
              </div>
              
              <div className="flex gap-2 bg-[#070a0f] p-1 rounded-lg border border-[#1e293b]">
                <button 
                  onClick={() => setCodeLang("python")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    codeLang === 'python' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Python
                </button>
                <button 
                  onClick={() => setCodeLang("curl")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    codeLang === 'curl' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  cURL
                </button>
              </div>
            </div>

            {/* Code viewer */}
            <div className="editor-frame bg-[#060810] border-[#1e293b]">
              <div className="editor-header bg-[#0e131f] py-2 px-4 border-b border-[#1e293b] flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-mono">
                  {codeLang === 'python' ? 'main.py' : 'terminal'}
                </span>
                <button
                  onClick={() => handleCopy(codeLang === 'python' ? DEV_API_DATA[activeApiTab].python : DEV_API_DATA[activeApiTab].curl)}
                  className="text-[10px] text-slate-400 hover:text-white font-semibold cursor-pointer"
                >
                  {copyFeedback ? t("已复制!", "Copied!") : t("复制代码", "Copy")}
                </button>
              </div>
              <div className="editor-body p-4 overflow-x-auto text-[11.5px] bg-[#060810] text-slate-300">
                <pre className="whitespace-pre">{codeLang === "python" ? DEV_API_DATA[activeApiTab].python : DEV_API_DATA[activeApiTab].curl}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
