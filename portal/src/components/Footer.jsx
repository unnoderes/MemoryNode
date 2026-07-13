"use client";

import React from "react";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-[#05070a]/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 text-xs">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-[#9845E8] rounded-full"></span>
          <span>MemoryNode: Governed persistent memory for autonomous Qwen agents</span>
        </div>
        
        <div className="flex items-center gap-8 font-semibold">
          <a href="https://github.com/unnoderes/MemoryNode" target="_blank" className="hover:text-white transition-colors">GitHub Repository</a>
          <span className="text-slate-700">|</span>
          <span>Qwen Cloud Hackathon (MemoryAgent Track)</span>
        </div>

        <div>
          <span>© 2026 MemoryNode Project. MIT License.</span>
        </div>
      </div>
    </footer>
  );
}
