"use client";

import React, { useState, useEffect } from "react";

const PRESETS = [
  {
    id: "preset-1",
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
        confidence: 0.94
      },
      {
        id: "mem-8093",
        type: "user_preference",
        content_zh: "Mike 偏好在 JavaScript 模块中使用 ESM 导入格式。",
        content_en: "Mike prefers ESM imports for JavaScript modules.",
        quote_zh: "请在 JavaScript 代码中使用 ESM imports 导入模块",
        quote_en: "please use ESM imports for JavaScript modules",
        confidence: 0.92
      }
    ]
  },
  {
    id: "preset-2",
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
        confidence: 0.91
      },
      {
        id: "mem-8095",
        type: "project_decision",
        content_zh: "使用 SQLite FTS5 引擎作为文本检索索引。",
        content_en: "SQLite FTS5 will be used as the text search index.",
        quote_zh: "使用 SQLite 内置的 FTS5 引擎作为检索索引",
        quote_en: "use the built-in FTS5 engine as the search index",
        confidence: 0.89
      }
    ]
  },
  {
    id: "preset-3",
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
        confidence: 0.98
      }
    ]
  }
];

export default function Simulator({ language, t }) {
  const [activePreset, setActivePreset] = useState("preset-1");
  const [customText, setCustomText] = useState("");
  const [pipelineState, setPipelineState] = useState("idle"); // idle, extracting, extracted
  const [proposals, setProposals] = useState([]);
  const [activeMemories, setActiveMemories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Update proposals and reset state when preset changes
  useEffect(() => {
    setSearchQuery("");
    if (activePreset === "custom") {
      setPipelineState("idle");
      setProposals([]);
      setActiveMemories([]);
    } else {
      const preset = PRESETS.find((p) => p.id === activePreset);
      if (preset) {
        setPipelineState("idle");
        // Add pending status to presets
        setProposals(
          preset.proposals.map((prop) => ({
            ...prop,
            status: "pending",
          }))
        );
        setActiveMemories([]);
      }
    }
  }, [activePreset]);

  const handleExtract = () => {
    let sourceProposals = [];
    if (activePreset === "custom") {
      if (!customText.trim()) return;
      sourceProposals = extractCustomProposals(customText);
    } else {
      const preset = PRESETS.find((p) => p.id === activePreset);
      if (preset) {
        sourceProposals = preset.proposals.map((prop) => ({
          ...prop,
          status: "pending",
        }));
      }
    }

    setPipelineState("extracting");
    setTimeout(() => {
      setProposals(
        sourceProposals.map((prop) => ({
          ...prop,
          status: "pending",
        }))
      );
      setPipelineState("extracted");
    }, 1200);
  };

  const extractCustomProposals = (text) => {
    const list = [];
    const low = text.toLowerCase();
    
    if (low.includes("超时") || low.includes("timeout") || low.includes("time") || low.includes("时间")) {
      list.push({
        id: "mem-cust-1",
        type: "project_constraint",
        content_zh: "项目接口与网络请求的超时阈值应统一限定为 5000ms。",
        content_en: "Project API network request timeout limit is set to 5000ms.",
        quote_zh: text.length > 50 ? text.substring(0, 50) + "..." : text,
        quote_en: text.length > 50 ? text.substring(0, 50) + "..." : text,
        confidence: 0.95
      });
    }
    
    if (low.includes("python") || low.includes("go") || low.includes("java") || low.includes("rust") || low.includes("js") || low.includes("ts") || low.includes("react") || low.includes("next")) {
      list.push({
        id: "mem-cust-2",
        type: "project_decision",
        content_zh: "项目核心开发技术栈及主要编程语言与框架规范选型。",
        content_en: "Project core development tech stack, framework, and language specifications.",
        quote_zh: text.length > 50 ? text.substring(0, 50) + "..." : text,
        quote_en: text.length > 50 ? text.substring(0, 50) + "..." : text,
        confidence: 0.91
      });
    }
    
    if (low.includes("mike") || low.includes("喜欢") || low.includes("偏好") || low.includes("prefer") || low.includes("like") || low.includes("习惯")) {
      list.push({
        id: "mem-cust-3",
        type: "user_preference",
        content_zh: "开发者的个性化编码风格偏好、环境设定与工具习惯设定。",
        content_en: "Developer's personalized coding preferences, environment setup, and tool habits.",
        quote_zh: text.length > 50 ? text.substring(0, 50) + "..." : text,
        quote_en: text.length > 50 ? text.substring(0, 50) + "..." : text,
        confidence: 0.93
      });
    }
    
    if (low.includes("安全") || low.includes("密钥") || low.includes("key") || low.includes("password") || low.includes("密码") || low.includes("env") || low.includes("git")) {
      list.push({
        id: "mem-cust-4",
        type: "known_pitfall",
        content_zh: "严禁向公共代码库提交包含 API 密钥或敏感配置的 .env 凭证文件与本地 SQLite 数据库。",
        content_en: "Strictly prohibit committing configuration (.env) files or databases containing API keys to repositories.",
        quote_zh: text.length > 50 ? text.substring(0, 50) + "..." : text,
        quote_en: text.length > 50 ? text.substring(0, 50) + "..." : text,
        confidence: 0.98
      });
    }
    
    if (list.length === 0) {
      const truncated = text.length > 40 ? text.substring(0, 40) + "..." : text;
      list.push({
        id: "mem-cust-generic",
        type: "fact",
        content_zh: `提炼交互日志中的核心事实信息："${truncated}"`,
        content_en: `Refined core factual statement from transcript: "${truncated}"`,
        quote_zh: text,
        quote_en: text,
        confidence: 0.85
      });
    }
    
    return list;
  };

  const handleDecision = (id, approved) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const status = approved ? "approved" : "rejected";
          // If approved, push to active memories list
          if (approved) {
            setActiveMemories((m) => {
              if (m.some((x) => x.id === id)) return m;
              return [...m, { ...p, status: "active" }];
            });
          }
          return { ...p, status };
        }
        return p;
      })
    );
  };

  const handleReset = () => {
    setSearchQuery("");
    setPipelineState("idle");
    setActiveMemories([]);
    if (activePreset === "custom") {
      setProposals([]);
    } else {
      const preset = PRESETS.find((p) => p.id === activePreset);
      if (preset) {
        setProposals(
          preset.proposals.map((prop) => ({
            ...prop,
            status: "pending",
          }))
        );
      }
    }
  };

  const getBadgeLabel = (type) => {
    const labels = {
      user_preference: t("用户偏好", "User preference"),
      project_constraint: t("项目约束", "Project constraint"),
      project_decision: t("项目决策", "Project decision"),
      recurring_workflow: t("重复工作流", "Recurring workflow"),
      known_pitfall: t("已知坑点", "Known pitfall"),
      fact: t("事实", "Fact"),
    };
    return labels[type] || type;
  };

  // FTS5 local filter
  const filteredMemories = activeMemories.filter((m) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const content = language === "zh" ? m.content_zh.toLowerCase() : m.content_en.toLowerCase();
    const type = getBadgeLabel(m.type).toLowerCase();
    return content.includes(query) || type.includes(query) || m.id.toLowerCase().includes(query);
  });

  return (
    <section id="playground">
      <div className="section-header-block">
        <h2 className="section-title">
          {t("记忆治理流水线交互沙盒", "Memory Governance Sandbox")}
        </h2>
        <p className="section-desc">
          {t(
            "体验原始交互日志如何经过 Qwen-LLM 规则过滤、生成待审提议、通过人工校验并最终写入活性 SQLite 索引的完整流程。",
            "Witness how raw conversational transcript flows are filtered by Qwen, suggested as drafts, reviewed by human, and committed to FTS5 index."
          )}
        </p>
      </div>

      {/* Preset Selector */}
      <div className="max-w-5xl mx-auto mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {PRESETS.map((preset, idx) => (
            <button
              key={preset.id}
              onClick={() => setActivePreset(preset.id)}
              className={`preset-card ${activePreset === preset.id ? "active" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded ${
                    activePreset === preset.id
                      ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                      : "bg-neutral-800"
                  }`}
                ></span>
                <span className="font-bold text-xs text-white">
                  {language === "zh" ? preset.title_zh : preset.title_en}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {language === "zh" ? preset.user_msg_zh : preset.user_msg_en}
              </p>
            </button>
          ))}
          {/* Custom Input Tab */}
          <button
            onClick={() => setActivePreset("custom")}
            className={`preset-card ${activePreset === "custom" ? "active" : ""}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`w-1.5 h-1.5 rounded ${
                  activePreset === "custom"
                    ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    : "bg-neutral-800"
                }`}
              ></span>
              <span className="font-bold text-xs text-white">
                {t("自定义对话输入", "Custom Dialogue")}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
              {t("在此处输入您自定义的对话，体验提取事实的逻辑...", "Type your custom transcript to test parsing facts...")}
            </p>
          </button>
        </div>
      </div>

      <div className="simulator-layout">
        {/* Left Column: Chat thread mockup / Custom input */}
        <div className="simulator-column-left">
          <div className="glass-card glow-border p-6 h-full flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse"></span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {activePreset === "custom"
                    ? t("输入自定义交互日志", "Enter Custom Transcript")
                    : t("原始交互日志", "Raw Chat Transcript")}
                </h3>
              </div>
              <span className="text-[9.5px] font-mono text-slate-500">
                {activePreset === "custom" ? "MODE: CUSTOM_INPUT" : "ID: session_90d2e8"}
              </span>
            </div>

            {activePreset === "custom" ? (
              <div className="flex-grow flex flex-col gap-4">
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder={t(
                    "例如：'Mike 说，为了防止秘钥泄露，不能直接将包含 OpenAI 密钥的 .env 文件提交到代码仓库中，大家注意。'",
                    "E.g., 'Mike said that to prevent key leakage, we must never commit the .env file containing the OpenAI key directly to the code repository.'"
                  )}
                  className="interactive-textarea flex-grow min-h-[180px] text-xs"
                />
                <div className="flex justify-between items-center mt-2">
                  <button
                    onClick={handleReset}
                    className="pill-btn pill-btn-dark text-xs py-2 px-4 cursor-pointer"
                  >
                    {t("重置沙盒", "Reset Sandbox")}
                  </button>
                  <button
                    onClick={handleExtract}
                    disabled={!customText.trim() || pipelineState === "extracting"}
                    className="pill-btn pill-btn-white text-xs py-2 px-6 font-bold cursor-pointer disabled:opacity-50"
                  >
                    {pipelineState === "extracting" ? t("提取中...", "Extracting...") : t("提取提案", "Extract")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-grow justify-between">
                {/* Chat Bubble List */}
                <div className="space-y-6 flex-grow overflow-y-auto pr-1">
                  {/* User message */}
                  <div className="flex flex-col items-start gap-2 max-w-[90%]">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                      <span className="w-5 h-5 rounded bg-neutral-900 border border-white/5 flex items-center justify-center text-[9px] text-slate-300">
                        U
                      </span>
                      <span>Mike (Developer)</span>
                      <span>•</span>
                      <span>10:42 AM</span>
                    </div>
                    <div className="bg-neutral-950 border border-white/5 p-4 rounded text-xs text-slate-200 leading-relaxed shadow-sm">
                      {language === "zh"
                        ? PRESETS.find((p) => p.id === activePreset)?.user_msg_zh
                        : PRESETS.find((p) => p.id === activePreset)?.user_msg_en}
                    </div>
                  </div>

                  {/* Assistant message */}
                  <div className="flex flex-col items-end gap-2 max-w-[90%] ml-auto">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold justify-end">
                      <span>10:42 AM</span>
                      <span>•</span>
                      <span>Coding Agent</span>
                      <span className="w-5 h-5 rounded bg-white border border-white flex items-center justify-center text-[9px] text-black">
                        A
                      </span>
                    </div>
                    <div className="bg-neutral-900 border border-white/5 p-4 rounded text-xs text-slate-200 leading-relaxed shadow-sm">
                      {language === "zh"
                        ? PRESETS.find((p) => p.id === activePreset)?.assistant_msg_zh
                        : PRESETS.find((p) => p.id === activePreset)?.assistant_msg_en}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-6">
                  <button
                    onClick={handleReset}
                    className="pill-btn pill-btn-dark text-xs py-2 px-4 cursor-pointer"
                  >
                    {t("重置沙盒", "Reset")}
                  </button>
                  <button
                    onClick={handleExtract}
                    disabled={pipelineState === "extracting"}
                    className="pill-btn pill-btn-white text-xs py-2 px-6 font-bold cursor-pointer disabled:opacity-50"
                  >
                    {pipelineState === "extracting" ? t("提取中...", "Extracting...") : t("提取提案", "Extract")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Governance Pipeline */}
        <div className="simulator-column-right">
          <div className="glass-card glow-border p-6 min-h-[400px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse"></span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {t("记忆治理流水线", "Governance Pipeline")}
                  </h3>
                </div>
                <span className="text-[9.5px] font-mono text-slate-500">STAGE: EV-0.5.0</span>
              </div>

              {pipelineState === "idle" && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-10 h-10 rounded border border-dashed border-white/10 flex items-center justify-center mb-4 text-slate-600 font-bold">
                    →
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    {t("流水线待命中", "Pipeline Standby")}
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-[240px] leading-relaxed">
                    {t("请在左侧点击“提取提案”开始解析交互记忆事实。", "Click 'Extract' on the left to start parsing facts.")}
                  </p>
                </div>
              )}

              {pipelineState === "extracting" && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  {/* Glowing progress spinner */}
                  <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white animate-spin mb-4"></div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    {t("Qwen-LLM 语义事实解析中...", "Qwen-LLM Semantic Parsing...")}
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-[240px]">
                    {t("提取事实实体、判定匹配出处原句...", "Extracting facts and mapping context source quotes...")}
                  </p>
                </div>
              )}

              {pipelineState === "extracted" && (
                <div className="space-y-6">
                  {/* Step 1: Suggesting */}
                  <div className="relative pl-6 border-l border-white/5">
                    <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
                    <div className="mb-3">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {t("阶段一：结构化语义提案", "Step 1: LLM Suggestion")}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t("基于 Qwen 大模型提炼的事实，强绑定对话原文引用", "Extract structured proposal with source quotes.")}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {proposals.map((prop) => (
                        <div
                          key={prop.id}
                          className="p-3.5 rounded bg-black/40 border border-white/5 shadow-inner relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`m-badge m-badge-${prop.type} text-[8px] px-1.5 py-0.5`}>
                                {getBadgeLabel(prop.type)}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                CONF: {(prop.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            {/* Individual approval status badge */}
                            {prop.status === "approved" && (
                              <span className="text-[8px] font-extrabold text-[#10B981] uppercase tracking-wider">
                                {t("已批准", "Approved")}
                              </span>
                            )}
                            {prop.status === "rejected" && (
                              <span className="text-[8px] font-extrabold text-[#EF4444] uppercase tracking-wider">
                                {t("已驳回", "Rejected")}
                              </span>
                            )}
                            {prop.status === "pending" && (
                              <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider animate-pulse">
                                {t("待审核", "Pending")}
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-slate-200 font-bold leading-relaxed mb-2">
                            {language === "zh" ? prop.content_zh : prop.content_en}
                          </p>
                          <div className="text-[10.5px] text-slate-400 border-l border-slate-700 pl-2 py-0.5 italic mb-3">
                            "{language === "zh" ? prop.quote_zh : prop.quote_en}"
                          </div>

                          {/* Individual review buttons */}
                          {prop.status === "pending" && (
                            <div className="flex gap-2 justify-end border-t border-white/5 pt-2.5">
                              <button
                                onClick={() => handleDecision(prop.id, false)}
                                className="text-[10px] font-bold px-2.5 py-1 rounded border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 cursor-pointer transition-all"
                              >
                                {t("驳回 ✕", "Reject ✕")}
                              </button>
                              <button
                                onClick={() => handleDecision(prop.id, true)}
                                className="text-[10px] font-bold px-2.5 py-1 rounded border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 cursor-pointer transition-all"
                              >
                                {t("批准 ✓", "Approve ✓")}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Human Audit Gate */}
                  <div className="relative pl-6 border-l border-white/5">
                    <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
                    <div className="mb-2">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {t("阶段二：人类在环控制阀", "Step 2: Human Audit Gate")}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t(
                          "所有提案在被人工手动批准前，物理隔离，不被任何检索召回，保障知识安全",
                          "Drafts are isolated. No recall queries are indexed prior to validation."
                        )}
                      </div>
                    </div>
                    {proposals.some((p) => p.status === "approved") ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-bold shadow-sm">
                        <span className="w-1.5 h-1.5 rounded bg-emerald-400 animate-pulse"></span>
                        <span>{t("管理员控制台已授权批准", "Authorized by Admin review")}</span>
                      </div>
                    ) : proposals.every((p) => p.status === "rejected") ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold shadow-sm">
                        <span className="w-1.5 h-1.5 rounded bg-red-400"></span>
                        <span>{t("已全部驳回提案", "All proposals rejected")}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 text-xs font-bold shadow-sm">
                        <span className="w-1.5 h-1.5 rounded bg-yellow-400 animate-pulse"></span>
                        <span>{t("等待您的决策（请在上方进行批准/驳回）", "Awaiting review (Approve/Reject above)")}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: SQLite FTS5 Indexed Library */}
            <div className="border-t border-white/5 pt-6 mt-6">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full shadow-[0_0_6px_#10B981]"></span>
                  <div className="text-[10px] text-white font-bold uppercase tracking-wider">
                    {t("SQLite FTS5 活性检索库", "SQLite FTS5 Active Library")}
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-500 uppercase">
                  {t("活性记忆检索索引", "Active Retrieval Index")}
                </span>
              </div>

              {/* FTS5 Search Input */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("输入关键词匹配检索活性记忆...", "Search active memories with SQLite Match...")}
                  className="w-full bg-[#050505] border border-white/5 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-white/20 transition-all font-mono"
                />
              </div>

              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {filteredMemories.length > 0 ? (
                  filteredMemories.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 rounded border border-white/5 bg-[#050505] text-xs transition-all hover:bg-neutral-900"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[9px] text-white bg-neutral-900 border border-white/10 px-1 py-0.5 rounded uppercase">
                          {m.id}
                        </span>
                        <span className="text-slate-300 font-medium truncate font-sans">
                          {language === "zh" ? m.content_zh : m.content_en}
                        </span>
                      </div>
                      <span className="text-[8px] font-extrabold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ml-2">
                        Active
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-600 text-[11px] font-sans border border-dashed border-white/5 rounded">
                    {searchQuery.trim()
                      ? t("未匹配到相关活性记忆", "No matching active memories found.")
                      : t(
                          "暂无活性索引。请在上方批准提案以写入该检索库中。",
                          "No active index. Approve proposals above to index them here."
                        )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
