"use client";

import React from "react";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#111] bg-[#070a0f]/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-600 text-xs">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-slate-700 rounded-full"></span>
          <span>MemoryNode: Governed memory infrastructure for AI agents</span>
        </div>
        
        <div className="flex items-center gap-8 font-semibold">
          <a href="https://github.com/unnoderes/MemoryNode" target="_blank" className="hover:text-white transition-colors">GitHub</a>
          <a href="https://github.com/unnoderes/MemoryNode/releases" className="hover:text-white transition-colors">Downloads</a>
          <span>MIT License</span>
        </div>

        <div>
          <span>© 2026 MemoryNode Project. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
