"use client";

import React from "react";

export default function Header({ language, setLanguage, t }) {
  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-6xl z-50 bg-[#07080f]/75 backdrop-blur-xl border border-white/10 py-3 px-6 md:px-8 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse"></span>
          <span className="text-base font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            MemoryNode
          </span>
          <span className="text-[9px] font-extrabold text-purple-300 border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
            Qwen Hackathon
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-slate-400">
          <a href="#playground" className="hover:text-cyan-400 transition-colors duration-200">{t("交互沙盒", "Playground")}</a>
          <a href="#architecture" className="hover:text-cyan-400 transition-colors duration-200">{t("核心架构", "Architecture")}</a>
          <a href="#api" className="hover:text-cyan-400 transition-colors duration-200">{t("API 接口", "API Docs")}</a>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            className="text-[11px] font-bold px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer"
          >
            {language === "zh" ? "English" : "中文"}
          </button>
          
          <a 
            href="https://github.com/unnoderes/MemoryNode" 
            target="_blank"
            className="text-[11px] font-extrabold px-4 py-1.5 rounded-full bg-white text-black hover:bg-slate-200 transition-all duration-200 shadow-md"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
