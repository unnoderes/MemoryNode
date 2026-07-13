"use client";

import React from "react";

export default function Header({ language, setLanguage, t }) {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#020202]/75 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-12">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 bg-[#9845E8] rounded-full shadow-[0_0_10px_#9845E8] animate-pulse"></span>
          <span className="text-base font-bold tracking-tight text-white">
            MemoryNode
          </span>
          <span className="text-[9px] font-extrabold text-[#9845E8] border border-[#9845E8]/20 bg-[#9845E8]/5 px-2 py-0.5 rounded uppercase tracking-wider hidden sm:inline-block">
            Qwen Hackathon Submission
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-slate-400">
          <a href="#playground" className="hover:text-white transition-colors">{t("交互沙盒", "Playground")}</a>
          <a href="#architecture" className="hover:text-white transition-colors">{t("核心架构", "Architecture")}</a>
          <a href="#api" className="hover:text-white transition-colors">{t("API 接口", "API Docs")}</a>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            className="text-[11px] font-bold px-3 py-1.5 rounded border border-white/5 bg-[#090d14] hover:bg-[#111827] text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {language === "zh" ? "English" : "中文"}
          </button>
          
          <a 
            href="https://github.com/unnoderes/MemoryNode" 
            target="_blank"
            className="pill-btn pill-btn-white text-[11px] py-1.5 px-4 font-bold"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
