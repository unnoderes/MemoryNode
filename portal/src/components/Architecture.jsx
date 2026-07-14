"use client";

import React, { useState } from "react";
import { ARCH_STEPS } from "../lib/constants";

export default function Architecture({ language, t }) {
  const [activeNode, setActiveNode] = useState("extractor");

  return (
    <section id="architecture">
      <div className="section-header-block">
        <h2 className="section-title">
          {t("系统架构数据流看板", "Dynamic Dataflow Architecture")}
        </h2>
        <p className="section-desc">
          {t("点击下方任意阶段节点，查看该阶段在 AI 智能体场景下的具体设计意图与工程依赖。", "Click any stage node below to view details and specifications.")}
        </p>
      </div>

      {/* Dynamic diagram container */}
      <div className="flow-diagram-container max-w-5xl mx-auto mb-12">
        <div 
          onClick={() => setActiveNode("raw")}
          className={`flow-step-node ${activeNode === "raw" ? "active" : ""}`}
        >
          <div className="flow-step-title">{t("原始交互日志", "Raw Input")}</div>
          <div className="flow-step-tech">Chat Transcript</div>
        </div>
        <div className={`flow-arrow-line ${activeNode === "extractor" ? "active" : ""}`}></div>
        
        <div 
          onClick={() => setActiveNode("extractor")}
          className={`flow-step-node ${activeNode === "extractor" ? "active" : ""}`}
        >
          <div className="flow-step-title">{t("LLM 事实提取", "Qwen Extractor")}</div>
          <div className="flow-step-tech">Semantic Parse</div>
        </div>
        <div className={`flow-arrow-line ${activeNode === "proposals" ? "active" : ""}`}></div>
        
        <div 
          onClick={() => setActiveNode("proposals")}
          className={`flow-step-node ${activeNode === "proposals" ? "active" : ""}`}
        >
          <div className="flow-step-title">{t("缓冲提案库", "Proposals DB")}</div>
          <div className="flow-step-tech">SQLite Drafts</div>
        </div>
        <div className={`flow-arrow-line ${activeNode === "reviewer" ? "active" : ""}`}></div>
        
        <div 
          onClick={() => setActiveNode("reviewer")}
          className={`flow-step-node ${activeNode === "reviewer" ? "active" : ""}`}
        >
          <div className="flow-step-title">{t("人工控制阀", "Human Approval")}</div>
          <div className="flow-step-tech">Console / CLI</div>
        </div>
        <div className={`flow-arrow-line ${activeNode === "active" ? "active" : ""}`}></div>
        
        <div 
          onClick={() => setActiveNode("active")}
          className={`flow-step-node ${activeNode === "active" ? "active" : ""}`}
        >
          <div className="flow-step-title">{t("活性全文索引", "FTS5 Recall")}</div>
          <div className="flow-step-tech">SQLite Index</div>
        </div>
      </div>

      {/* Node detail block */}
      <div className="glass-card max-w-3xl mx-auto">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
          {t("选定阶段诊断与工程指标", "Diagnostic Specs & Purpose")}
        </div>
        <h3 className="text-lg font-bold text-white mb-3">
          {language === "zh" ? ARCH_STEPS[activeNode].title_zh : ARCH_STEPS[activeNode].title_en}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
          {language === "zh" ? ARCH_STEPS[activeNode].desc_zh : ARCH_STEPS[activeNode].desc_en}
        </p>
        <div className="border-t border-[#1e293b] pt-4 flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase">{t("涉及基础设施", "Infrastructure Dependency")}</span>
          <span className="font-mono text-xs text-white">{ARCH_STEPS[activeNode].tech}</span>
        </div>
      </div>
    </section>
  );
}
