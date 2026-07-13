"use client";

import React from "react";

export default function Header({ language, setLanguage, t }) {
  return (
    <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-[#111]">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 bg-sky-400 rounded-full shadow-[0_0_12px_#38bdf8] animate-pulse"></span>
        <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          MemoryNode
        </span>
      </div>
      
      <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <a href="#playground" className="hover:text-white transition-colors">{t("交互沙盒", "Playground")}</a>
        <a href="#architecture" className="hover:text-white transition-colors">{t("核心架构", "Architecture")}</a>
        <a href="#api" className="hover:text-white transition-colors">{t("API 接口", "API Docs")}</a>
      </nav>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
          className="text-[11px] font-bold px-3 py-1.5 rounded border border-[#1e293b] bg-[#090d14] hover:bg-[#111827] text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          {language === "zh" ? "English" : "中文"}
        </button>
        
        <a 
          href="https://github.com/unnoderes/MemoryNode" 
          target="_blank"
          className="pill-btn pill-btn-white text-[11px] py-2 px-4 font-bold"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
