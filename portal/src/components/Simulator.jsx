"use client";

import React, { useState } from "react";
import { PRESETS } from "../lib/constants";

const SIM_DATA = [
  {
    title_zh: "开发编码偏好 (Coding Preference)",
    title_en: "Coding Preference",
    user_msg_zh: "你好，我是开发者 Mike。我正在开发一个 React 应用。在编写 CSS 时，我更喜欢直接写原生的 CSS，而不是使用 Tailwind，因为这能让我有百分百的掌控感。另外，请在 JavaScript 代码中使用 ESM imports 导入模块。",
    user_msg_en: "Hello, I am developer Mike. I am working on a React app. When writing CSS, I prefer writing raw CSS instead of Tailwind because it gives me 100% control. Also, please use ESM imports for JavaScript modules.",
    assistant_msg_zh: "收到偏好设定。项目将统一采用原生 CSS 编写样式以保证控制权，且所有 JS 模块均强制使用 ESM imports 导入。",
    assistant_msg_en: "Understood. We will use raw CSS for styling to maintain complete control, and enforce ESM imports for all JavaScript modules.",
    proposals: [
      {
        id: "mem-8092",
        type: "user_preference",
        content_zh: "Mike 在 React 开发中偏好使用原生 CSS，而非 Tailwind CSS。",
        content_en: "Mike prefers raw CSS over Tailwind CSS in React development.",
        quote_zh: "我更喜欢直接写原生的 CSS，而不是使用 Tailwind，因为这能让我有百分百的掌控感",
        quote_en: "I prefer writing raw CSS instead of Tailwind because it gives me 100% control",
        confidence: 0.94,
        status: "active"
      },
      {
        id: "mem-8093",
        type: "user_preference",
        content_zh: "Mike 偏好在 JavaScript 模块中使用 ESM 导入格式。",
        content_en: "Mike prefers ESM imports for JavaScript modules.",
        quote_zh: "请在 JavaScript 代码中使用 ESM imports 导入模块",
        quote_en: "please use ESM imports for JavaScript modules",
        confidence: 0.92,
        status: "active"
      }
    ]
  },
  {
    title_zh: "项目架构决策 (Arch Decision)",
    title_en: "Project Arch Decision",
    user_msg_zh: "在今天的架构评审会议上，我们决定项目数据库使用 SQLite 以保持本地简单性。为了实现文本的快速检索，我们将使用 SQLite 内置的 FTS5 引擎作为检索索引。Mike 将作为本项决策的负责人。",
    user_msg_en: "During the architecture review meeting, we decided to use SQLite for database storage to keep it simple locally. To achieve fast text search, we will use the built-in FTS5 engine as the search index. Mike is the lead for this decision.",
    assistant_msg_zh: "数据库架构已确立。主存储使用 SQLite，并配置 FTS5 全文索引作为高速检索引擎，负责人为 Mike。",
    assistant_msg_en: "Database architecture recorded. Using SQLite for storage and FTS5 for text search index, with Mike designated as lead.",
    proposals: [
      {
        id: "mem-8094",
        type: "project_decision",
        content_zh: "项目数据库需使用 SQLite 以确保本地的简洁性。",
        content_en: "Project database must be SQLite to ensure local simplicity.",
        quote_zh: "决定项目数据库使用 SQLite 以保持本地简单性",
        quote_en: "decided to use SQLite for database storage to keep it simple locally",
        confidence: 0.91,
        status: "active"
      },
      {
        id: "mem-8095",
        type: "project_decision",
        content_zh: "使用 SQLite FTS5 引擎作为文本检索索引。",
        content_en: "SQLite FTS5 will be used as the text search index.",
        quote_zh: "使用 SQLite 内置的 FTS5 引擎作为检索索引",
        quote_en: "use the built-in FTS5 engine as the search index",
        confidence: 0.89,
        status: "active"
      }
    ]
  },
  {
    title_zh: "安全规约限制 (Security Policy)",
    title_en: "Security Policy",
    user_msg_zh: "警告：切勿将包含真实 API 密钥（例如 OpenAI API Key）的 .env 配置文件或 sqlite 数据源文件提交到 GitHub 开源仓库中。这是一个非常严重的安全隐患，所有凭据必须保存在本地环境变量中。",
    user_msg_en: "Warning: Never commit .env files containing real API keys (e.g., OpenAI API Key) or SQLite data files to GitHub. This is a severe security risk; all credentials must be kept in local environment variables.",
    assistant_msg_zh: "安全预警已载入。严禁向 Git 代码库提交 .env 文件及 SQLite 数据库，所有接口密钥需通过本地环境变量配置。",
    assistant_msg_en: "Security precautions set. Never commit .env files or SQLite databases to public repositories. Credentials must remain in local environment variables.",
    proposals: [
      {
        id: "mem-8096",
        type: "known_pitfall",
        content_zh: "严禁向代码仓库提交包含 API 密钥的配置文件 (.env) 或数据库文件。",
        content_en: "Never commit configuration (.env) files or databases containing API keys to repository.",
        quote_zh: "切勿将包含真实 API 密钥的 .env 配置文件或 sqlite 数据源文件提交到 GitHub",
        quote_en: "Never commit .env files containing real API keys... or SQLite data files to GitHub",
        confidence: 0.98,
        status: "active"
      }
    ]
  }
];

export default function Simulator({ language, t }) {
  const [activePreset, setActivePreset] = useState(0);
  const data = SIM_DATA[activePreset];

  const getBadgeLabel = (type) => {
    const labels = {
      user_preference: t("用户偏好", "User preference"),
      project_constraint: t("项目约束", "Project constraint"),
      project_decision: t("项目决策", "Project decision"),
      recurring_workflow: t("重复工作流", "Recurring workflow"),
      known_pitfall: t("已知坑点", "Known pitfall"),
      fact: t("事实", "Fact")
    };
    return labels[type] || type;
  };

  return (
    <section id="playground">
      <div className="section-header-block">
        <h2 className="section-title">
          {t("记忆治理流水线交互沙盒", "Memory Governance Sandbox")}
        </h2>
        <p className="section-desc">
          {t("体验原始交互日志如何经过 Qwen-LLM 规则过滤、生成待审提议、通过人工校验并最终写入活性 SQLite 索引的完整流程。", "Witness how raw conversational transcript flows are filtered by Qwen, suggested as drafts, reviewed by human, and committed to FTS5 index.")}
        </p>
      </div>

      {/* Preset Selector */}
      <div className="max-w-5xl mx-auto mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SIM_DATA.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setActivePreset(idx)}
              className={`preset-card ${activePreset === idx ? 'active' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded ${
                  activePreset === idx ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-neutral-800'
                }`}></span>
                <span className="font-bold text-xs text-white">
                  {language === "zh" ? preset.title_zh : preset.title_en}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {language === "zh" ? preset.user_msg_zh : preset.user_msg_en}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="simulator-layout">
        {/* Left Column: Chat thread mockup */}
        <div className="simulator-column-left">
          <div className="glass-card glow-border p-6 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t("原始交互日志", "Raw Chat Transcript")}</h3>
              </div>
              <span className="text-[9.5px] font-mono text-slate-500">ID: session_90d2e8</span>
            </div>

            {/* Chat Bubble List */}
            <div className="space-y-6 flex-grow overflow-y-auto pr-1">
              {/* User message */}
              <div className="flex flex-col items-start gap-2 max-w-[85%]">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                  <span className="w-5 h-5 rounded bg-neutral-900 border border-white/5 flex items-center justify-center text-[9px] text-slate-300">U</span>
                  <span>Mike (Developer)</span>
                  <span>•</span>
                  <span>10:42 AM</span>
                </div>
                <div className="bg-neutral-950 border border-white/5 p-4 rounded text-xs text-slate-200 leading-relaxed shadow-sm">
                  {language === "zh" ? data.user_msg_zh : data.user_msg_en}
                </div>
              </div>

              {/* Assistant message */}
              <div className="flex flex-col items-end gap-2 max-w-[85%] ml-auto">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold justify-end">
                  <span>10:42 AM</span>
                  <span>•</span>
                  <span>Coding Agent</span>
                  <span className="w-5 h-5 rounded bg-white border border-white flex items-center justify-center text-[9px] text-black">A</span>
                </div>
                <div className="bg-neutral-900 border border-white/5 p-4 rounded text-xs text-slate-200 leading-relaxed shadow-sm">
                  {language === "zh" ? data.assistant_msg_zh : data.assistant_msg_en}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Governance Pipeline */}
        <div className="simulator-column-right">
          <div className="glass-card glow-border p-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t("记忆治理流水线", "Governance Pipeline")}</h3>
              </div>
              <span className="text-[9.5px] font-mono text-slate-500">STAGE: EV-0.4.2</span>
            </div>

            {/* Pipeline Steps */}
            <div className="space-y-6">
              {/* Step 1: Suggesting */}
              <div className="relative pl-6 border-l border-white/5">
                <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
                <div className="mb-3">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t("阶段一：Qwen-LLM 结构化提取", "Step 1: LLM Suggestion")}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{t("从原始语境中提炼规则提案，附带原文出处与提取理由", "Extract structured proposal with source quotes and rationales.")}</div>
                </div>

                <div className="space-y-3">
                  {data.proposals.map((prop, index) => (
                    <div key={index} className="p-3.5 rounded bg-black/40 border border-white/5 shadow-inner">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`m-badge m-badge-${prop.type} text-[8px] px-1.5 py-0.5`}>
                          {getBadgeLabel(prop.type)}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">CONFIDENCE: {(prop.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-[11.5px] text-slate-200 font-bold leading-relaxed mb-2">
                        {language === "zh" ? prop.content_zh : prop.content_en}
                      </p>
                      <div className="text-[10.5px] text-slate-400 border-l border-slate-700 pl-2 py-0.5 italic">
                        "{language === "zh" ? prop.quote_zh : prop.quote_en}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Human Audit Gate */}
              <div className="relative pl-6 border-l border-white/5">
                <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
                <div className="mb-2">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t("阶段二：人类在环校验", "Step 2: Human Audit Gate")}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{t("提案隔离存放，必须通过管理员控制台或 CLI 执行显式授权", "Isolated drafts await review. No recall index before approval.")}</div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-neutral-700 bg-neutral-900 text-white text-xs font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]"></span>
                  <span>{t("由 Mike-Dev 控制台批准 (已激活)", "Authorized by Mike-Dev (Active)")}</span>
                </div>
              </div>

              {/* Step 3: SQLite FTS5 Indexed */}
              <div className="relative pl-6">
                <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t("阶段三：装载进入 FTS5 索引", "Step 3: SQLite FTS5 Indexed")}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 mb-2">{t("转入活性检索库，提供亚毫秒级匹配，支持基于关联的显式覆盖", "Active facts stored. millisecond-level retrieval ready.")}</div>
                </div>

                <div className="space-y-2">
                  {data.proposals.map((prop, index) => (
                    <div key={index} className="flex items-center justify-between p-2.5 rounded border border-white/5 bg-[#050505] text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[9.5px] text-white bg-neutral-900 border border-white/10 px-1 py-0.5 rounded">{prop.id}</span>
                        <span className="text-slate-300 font-medium truncate">{language === "zh" ? prop.content_zh : prop.content_en}</span>
                      </div>
                      <span className="text-[8px] font-extrabold text-black bg-white border border-white px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ml-2">Active</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
