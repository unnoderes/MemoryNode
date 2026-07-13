"use client";

import React, { useState, useEffect } from "react";
import { PRESETS } from "../lib/constants";

export default function Simulator({ language, t }) {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [inputText, setInputText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [simLogs, setSimLogs] = useState([]);
  
  // Simulated DB
  const [proposals, setProposals] = useState([]);
  const [rejectedProposals, setRejectedProposals] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectedMemory, setInspectedMemory] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [libraryTab, setLibraryTab] = useState("active");

  // Keep track of the selections (expiry & supersede) per proposal ID
  const [approvalsConfig, setApprovalsConfig] = useState({}); // { [propId]: { expiry: 'never', supersedeId: '' } }

  const [activeMemories, setActiveMemories] = useState([
    {
      id: "mem-8921",
      content: "Mike leads the selection and lead role of SQLite database in MemoryNode.",
      content_zh: "Mike 负责 MemoryNode 中的 SQLite 数据库技术选型与决策牵头。",
      type: "project_decision",
      status: "active",
      confidence: 0.95,
      source_quote: "Mike will be the lead for this decision... use SQLite for database storage",
      source_quote_zh: "Mike 将作为本项决策的负责人... 数据库使用 SQLite",
      reason: "Historical team role and database architecture alignment.",
      reason_zh: "团队角色分工与数据库架构历史决策对齐。",
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "mem-3412",
      content: "ESM imports are mandatory for JavaScript modules in the project.",
      content_zh: "项目中的 JavaScript 模块强制要求使用 ESM 导入格式。",
      type: "user_preference",
      status: "active",
      confidence: 0.92,
      source_quote: "please use ESM imports for JavaScript modules",
      source_quote_zh: "请在 JavaScript 代码中使用 ESM imports 导入模块",
      reason: "User specified preferred module loader system.",
      reason_zh: "用户指定了模块加载器首选系统类型。",
      created_at: new Date(Date.now() - 7200000).toISOString()
    }
  ]);

  // Sync text area when language or preset changes
  useEffect(() => {
    setInputText(
      language === "zh"
        ? PRESETS[selectedPreset].transcript_zh
        : PRESETS[selectedPreset].transcript_en
    );
  }, [language, selectedPreset]);

  // Log helper
  const addLog = (tag, message) => {
    const time = new Date().toLocaleTimeString();
    setSimLogs((prev) => [`[${time}] [${tag}] ${message}`, ...prev]);
  };

  const handlePresetSelect = (idx) => {
    setSelectedPreset(idx);
    addLog("UI", `Loaded Preset ${idx + 1}: ${language === 'zh' ? PRESETS[idx].title_zh : PRESETS[idx].title_en}`);
  };

  // Custom text classification fallback when user edits the preset text
  const extractCustomProposals = (text) => {
    const lower = text.toLowerCase();
    const suggestions = [];
    
    if (lower.includes("tailwind") || lower.includes("css") || lower.includes("style")) {
      suggestions.push({
        id: "prop-c-css",
        content: lower.includes("tailwind") 
          ? "Mike wants to configure Tailwind CSS version 4 in the portal."
          : "Mike prefers raw CSS over Tailwind CSS to maintain maximum styling control.",
        content_zh: lower.includes("tailwind")
          ? "Mike 期望在门户网站中配置 Tailwind CSS v4 版本。"
          : "Mike 偏好使用原生 CSS 而非 Tailwind，以维护最大化的样式控制度。",
        type: "user_preference",
        confidence: 0.94,
        source_quote: text.slice(0, Math.min(100, text.length)),
        source_quote_zh: text.slice(0, Math.min(100, text.length)),
        reason: "Detected explicit frontend styling preference statements.",
        reason_zh: "检测到明确的前端样式偏好陈述。"
      });
    }
    
    if (lower.includes("database") || lower.includes("sqlite") || lower.includes("sql") || lower.includes("postgres")) {
      suggestions.push({
        id: "prop-c-db",
        content: "Team selected SQLite as primary database to keep setup simple.",
        content_zh: "团队选用 SQLite 作为主数据库以维持系统架构的简洁性。",
        type: "project_decision",
        confidence: 0.91,
        source_quote: text.slice(0, Math.min(100, text.length)),
        source_quote_zh: text.slice(0, Math.min(100, text.length)),
        reason: "Database selection finalized for local data storage.",
        reason_zh: "针对本地数据存储选定了数据库规格。"
      });
    }

    if (lower.includes("key") || lower.includes("token") || lower.includes("secret") || lower.includes(".env")) {
      suggestions.push({
        id: "prop-c-sec",
        content: "Strict rule: Never commit environment configurations (.env) containing API keys to Git.",
        content_zh: "严格规约：严禁向 Git 代码库提交包含 API 密钥的环境变量配置 (.env)。",
        type: "known_pitfall",
        confidence: 0.99,
        source_quote: text.slice(0, Math.min(100, text.length)),
        source_quote_zh: text.slice(0, Math.min(100, text.length)),
        reason: "High-risk credential exposure risk identified in workflow.",
        reason_zh: "工作流中识别到高风险的凭证暴露隐患。"
      });
    }
    
    if (suggestions.length === 0) {
      suggestions.push({
        id: "prop-c-gen",
        content: "Extracted informational fact from custom user input transcript.",
        content_zh: "从自定义用户输入记录中提取的事实描述陈述。",
        type: "fact",
        confidence: 0.78,
        source_quote: text.slice(0, Math.min(80, text.length)) + (text.length > 80 ? "..." : ""),
        source_quote_zh: text.slice(0, Math.min(80, text.length)) + (text.length > 80 ? "..." : ""),
        reason: "Generic contextual fact extraction.",
        reason_zh: "通用语境的事实性关联提取。"
      });
    }
    
    return suggestions;
  };

  const triggerExtraction = () => {
    if (!inputText.trim()) return;
    setIsExtracting(true);
    setProposals([]);
    setApprovalsConfig({});
    addLog("SYSTEM", "Initializing memory suggestion parser...");
    
    let step = 0;
    const interval = setInterval(() => {
      step += 25;
      if (step === 25) {
        addLog("LLM", "Reading conversational syntax structure and filtering greetings...");
      } else if (step === 50) {
        addLog("LLM", "Mapping concepts into taxonomies: 'user_preference', 'project_decision'...");
      } else if (step === 75) {
        addLog("LLM", "Slicing original source reference segments (Source Quotes)...");
      } else if (step === 100) {
        clearInterval(interval);
        
        // Determine if text is the preset transcript or custom modified
        const currentPresetText = language === "zh"
          ? PRESETS[selectedPreset].transcript_zh
          : PRESETS[selectedPreset].transcript_en;
        
        let extracted;
        if (inputText.trim() === currentPresetText.trim()) {
          extracted = PRESETS[selectedPreset].mockProposals.map((p) => ({
            ...p,
            id: "prop-" + Math.floor(Math.random() * 100000),
            status: "pending"
          }));
        } else {
          // Custom parsing
          extracted = extractCustomProposals(inputText).map((p) => ({
            ...p,
            status: "pending"
          }));
        }

        setProposals(extracted);
        addLog("SYSTEM", `Successfully structured ${extracted.length} memory proposals. Isolating in Proposals Buffer.`);
        setIsExtracting(false);
      }
    }, 3000);
  };

  const updateConfig = (propId, key, value) => {
    setApprovalsConfig(prev => ({
      ...prev,
      [propId]: {
        ...(prev[propId] || { expiry: "never", supersedeId: "" }),
        [key]: value
      }
    }));
  };

  const handleApprove = (prop) => {
    const config = approvalsConfig[prop.id] || { expiry: "never", supersedeId: "" };
    const { expiry, supersedeId } = config;

    addLog("AUDIT", `Reviewer approved proposal ${prop.id}. (TTL: ${expiry}, Supersede ID: ${supersedeId || "None"})`);
    
    const newMemoryId = "mem-" + Math.floor(Math.random() * 100000);
    const expiresAt = expiry === "never" 
      ? null 
      : expiry === "30s" 
        ? new Date(Date.now() + 30000).toISOString()
        : expiry === "1h" 
          ? new Date(Date.now() + 3600000).toISOString()
          : new Date(Date.now() + 86400000).toISOString();

    const newMemory = {
      id: newMemoryId,
      content: prop.content,
      content_zh: prop.content_zh,
      type: prop.type,
      status: "active",
      confidence: prop.confidence,
      source_quote: prop.source_quote,
      source_quote_zh: prop.source_quote_zh,
      reason: prop.reason,
      reason_zh: prop.reason_zh,
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    };

    // Apply supersede if selected
    if (supersedeId) {
      setActiveMemories(prev => prev.map(m => m.id === supersedeId ? { ...m, status: "superseded", superseded_by: newMemoryId } : m));
      addLog("DATABASE", `Memory ${supersedeId} superseded by new memory ${newMemoryId}.`);
    }

    setActiveMemories(prev => [newMemory, ...prev]);
    setProposals(prev => prev.filter(p => p.id !== prop.id));
    
    // Log database indexing
    addLog("DATABASE", `Memory ${newMemoryId} initialized. Stored in SQLite and FTS5 indices updated.`);

    // Setup client-side timer for 30s expiry demo
    if (expiry === "30s") {
      addLog("SYSTEM", `TTL Scheduler: Scheduled eviction for memory ${newMemoryId} in 30 seconds.`);
      setTimeout(() => {
        setActiveMemories(prev => {
          const target = prev.find(m => m.id === newMemoryId);
          if (target && target.status === "active") {
            addLog("DATABASE", `TTL Expiry: Memory ${newMemoryId} reached TTL. Evicting from FTS5 index and archiving...`);
            return prev.map(m => m.id === newMemoryId ? { ...m, status: "expired" } : m);
          }
          return prev;
        });
      }, 30000);
    }
  };

  const handleReject = (prop) => {
    addLog("AUDIT", `Reviewer rejected proposal ${prop.id}. Marking as archived.`);
    setRejectedProposals(prev => [prop, ...prev]);
    setProposals(prev => prev.filter(p => p.id !== prop.id));
  };

  const handleRevoke = (memory) => {
    addLog("AUDIT", `Revoking active memory ${memory.id}. De-indexing from FTS5...`);
    setActiveMemories(prev => prev.map(m => m.id === memory.id ? { ...m, status: "revoked" } : m));
    
    if (inspectedMemory && inspectedMemory.id === memory.id) {
      setInspectedMemory(prev => ({ ...prev, status: "revoked" }));
    }
    addLog("DATABASE", `Memory ${memory.id} revoked successfully.`);
  };

  const handleInspect = (memory) => {
    setInspectedMemory(memory);
    addLog("EXPLORE", `Inspecting lifecycle audit trail for memory: ${memory.id}`);
  };

  const handleResetSimulator = () => {
    setActiveMemories([
      {
        id: "mem-8921",
        content: "Mike leads the selection and lead role of SQLite database in MemoryNode.",
        content_zh: "Mike 负责 MemoryNode 中的 SQLite 数据库技术选型与决策牵头。",
        type: "project_decision",
        status: "active",
        confidence: 0.95,
        source_quote: "Mike will be the lead for this decision... use SQLite for database storage",
        source_quote_zh: "Mike 将作为本项决策的负责人... 数据库使用 SQLite",
        reason: "Historical team role and database architecture alignment.",
        reason_zh: "团队角色分工与数据库架构历史决策对齐。",
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "mem-3412",
        content: "ESM imports are mandatory for JavaScript modules in the project.",
        content_zh: "项目中的 JavaScript 模块强制要求使用 ESM 导入格式。",
        type: "user_preference",
        status: "active",
        confidence: 0.92,
        source_quote: "please use ESM imports for JavaScript modules",
        source_quote_zh: "请在 JavaScript 代码中使用 ESM imports 导入模块",
        reason: "User specified preferred module loader system.",
        reason_zh: "用户指定了模块加载器首选系统类型。",
        created_at: new Date(Date.now() - 7200000).toISOString()
      }
    ]);
    setProposals([]);
    setRejectedProposals([]);
    setSearchQuery("");
    setInspectedMemory(null);
    setApprovalsConfig({});
    setSimLogs([]);
    addLog("SYSTEM", "Simulator sandbox reset. Default active memories restored.");
  };

  useEffect(() => {
    if (inspectedMemory) {
      const currentMemoryState = activeMemories.find(m => m.id === inspectedMemory.id);
      if (currentMemoryState) {
        const events = [
          {
            id: "evt-1",
            event: "proposal_extracted",
            actor: "qwen-llm-core",
            timestamp: currentMemoryState.created_at || new Date(Date.now() - 60000).toISOString()
          },
          {
            id: "evt-2",
            event: "approved",
            actor: "human-reviewer",
            timestamp: currentMemoryState.created_at || new Date().toISOString()
          }
        ];
        
        if (currentMemoryState.expires_at) {
          events.push({
            id: "evt-ttl",
            event: "ttl_scheduled",
            actor: "human-reviewer",
            timestamp: currentMemoryState.created_at,
            details: `TTL Expiry: ${new Date(currentMemoryState.expires_at).toLocaleTimeString()}`
          });
        }

        if (currentMemoryState.status === "revoked") {
          events.push({
            id: "evt-3",
            event: "revoked",
            actor: "human-reviewer",
            timestamp: new Date().toISOString()
          });
        } else if (currentMemoryState.status === "superseded") {
          events.push({
            id: "evt-3",
            event: "superseded",
            actor: "human-reviewer",
            timestamp: new Date().toISOString(),
            details: `Superseded by memory: ${currentMemoryState.superseded_by}`
          });
        } else if (currentMemoryState.status === "expired") {
          events.push({
            id: "evt-3",
            event: "expired",
            actor: "ttl-scheduler",
            timestamp: new Date().toISOString()
          });
        }
        setAuditEvents(events);
      }
    }
  }, [inspectedMemory, activeMemories]);

  const filteredMemories = activeMemories.filter((m) => {
    if (libraryTab !== "all" && m.status !== libraryTab) {
      return false;
    }
    const text = language === "zh" ? m.content_zh : m.content;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  });

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

  const statusColorMap = {
    active: "border-[#1e293b] hover:border-slate-700 bg-[#070a0f]",
    revoked: "border-red-900/30 bg-red-950/5 opacity-70",
    superseded: "border-purple-900/30 bg-purple-950/5 opacity-70",
    expired: "border-amber-900/30 bg-amber-950/5 opacity-70"
  };

  return (
    <section id="playground">
      <div className="section-header-block">
        <div className="flex justify-between items-center max-w-5xl mx-auto mb-2">
          <div></div>
          <button 
            onClick={handleResetSimulator}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#1e293b] bg-slate-950 text-slate-400 hover:text-white transition-all cursor-pointer hover:bg-slate-900"
          >
            {t("重置沙盒 (Reset Sandbox)", "Reset Sandbox")}
          </button>
        </div>
        <h2 className="section-title">
          {t("记忆生命周期交互演练沙盒", "Interactive Memory Sandbox")}
        </h2>
        <p className="section-desc">
          {t("在下方体验记忆被提取、缓存、人工审核、亚毫秒级检索及一键废除的完整过程。此演示 100% 运行于浏览器本地。", "Walk through the full process of memory suggesting, buffering, human approval, and FTS5 revocation in this local simulator.")}
        </p>
      </div>

      <div className="simulator-layout">
        <div className="simulator-column-left">
          
          {/* Input logs */}
          <div className="glass-card glow-border">
            <div className="flex items-center gap-3 mb-4">
              <span className="step-number-badge">1</span>
              <h3 className="text-sm font-bold text-white">{t("输入原始日志 (Transcript Input)", "Transcript Input")}</h3>
            </div>

            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="interactive-textarea"
              placeholder={t("请输入原始交互日志...", "Enter raw chat transcript...")}
            />

            <div className="mt-4">
              <span className="text-[11px] text-slate-400 font-semibold">{t("推荐预置示例模板：", "Try a preset example:")}</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(idx)}
                    className={`preset-card ${selectedPreset === idx ? "active" : ""}`}
                  >
                    <div className="font-bold mb-1 truncate text-xs">
                      {language === "zh" ? preset.title_zh : preset.title_en}
                    </div>
                    <div className="line-clamp-2 text-[11px] opacity-60">
                      {language === "zh" ? preset.transcript_zh : preset.transcript_en}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <div className="text-[11px] text-slate-500 font-mono">
                {t("仿真解析模块：Qwen-2.5-Coder (支持自定义内容解析)", "Emulator core: Qwen-2.5-Coder (Supports custom parsing)")}
              </div>
              <button
                onClick={triggerExtraction}
                disabled={isExtracting || !inputText.trim()}
                className="pill-btn pill-btn-white text-xs font-bold py-2.5 px-6 cursor-pointer disabled:opacity-50"
              >
                {isExtracting ? t("正在分析...", "Parsing...") : t("运行记忆提取 (Extract)", "Run Extraction")}
              </button>
            </div>
          </div>

          {/* Suggestions buffer */}
          <div className="glass-card glow-border">
            <div className="flex items-center gap-3 mb-4">
              <span className="step-number-badge">2</span>
              <h3 className="text-sm font-bold text-white">
                {t("待审核提议库 (Proposals Buffer)", "Proposals Draft Buffer")}
              </h3>
              {proposals.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-400 font-bold animate-pulse">
                  {t(`${proposals.length} 条待审`, `${proposals.length} pending`)}
                </span>
              )}
            </div>

            {proposals.length === 0 ? (
              <div className="py-14 text-center text-slate-500 text-xs border border-dashed border-[#1e293b] rounded-xl bg-[#070a0f]/40">
                {isExtracting 
                  ? t("AI 规则解析中，大约需要 3 秒，请查看右侧控制台...", "Extracting facts, takes around 3s, monitor the console logs...") 
                  : t("等待运行提取。生成的草稿提议将在此处等待人工判定...", "No draft proposals buffered yet. Run extraction to suggest memories.")}
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((prop) => {
                  const config = approvalsConfig[prop.id] || { expiry: "never", supersedeId: "" };
                  return (
                    <div key={prop.id} className="p-4 rounded-xl bg-[#070a0f] border border-[#1e293b] flex flex-col gap-4">
                      <div className="space-y-2 flex-grow">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`m-badge m-badge-${prop.type}`}>
                            {getBadgeLabel(prop.type)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {t("可信度", "Confidence")}: {(prop.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-200 leading-relaxed">
                          {language === "zh" ? prop.content_zh : prop.content}
                        </p>
                        <div className="text-[11px] text-slate-400 border-l-2 border-slate-700 pl-3">
                          <span className="font-bold text-slate-300">{t("原文出处", "Source Quote")}:</span> "
                          {language === "zh" ? prop.source_quote_zh : prop.source_quote}
                          "
                        </div>
                        <div className="text-[10.5px] text-slate-500">
                          <span className="font-semibold">{t("提取理由", "Rationale")}:</span>{" "}
                          {language === "zh" ? prop.reason_zh : prop.reason}
                        </div>
                      </div>
                      
                      {/* Configuration selectors */}
                      <div className="flex flex-wrap items-end justify-between gap-4 pt-3 border-t border-[#1e293b]/60">
                        <div className="flex flex-wrap gap-4">
                          {/* Expiry Selector */}
                          <div className="flex flex-col gap-1 min-w-[120px]">
                            <label className="text-[9.5px] text-slate-500 font-bold uppercase">{t("过期策略 (TTL)", "Expiry TTL")}</label>
                            <select
                              value={config.expiry}
                              onChange={(e) => updateConfig(prop.id, "expiry", e.target.value)}
                              className="bg-[#0c1017] border border-[#1e293b] rounded-lg p-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-slate-500 cursor-pointer"
                            >
                              <option value="never">{t("永久有效", "Never Expire")}</option>
                              <option value="30s">{t("30 秒 (演示)", "30s (Demo)")}</option>
                              <option value="1h">{t("1 小时", "1 Hour")}</option>
                              <option value="1d">{t("1 天", "1 Day")}</option>
                            </select>
                          </div>

                          {/* Supersede Selector */}
                          <div className="flex flex-col gap-1 min-w-[160px]">
                            <label className="text-[9.5px] text-slate-500 font-bold uppercase">{t("覆盖旧冲突记忆", "Supersede Conflict")}</label>
                            <select
                              value={config.supersedeId}
                              onChange={(e) => updateConfig(prop.id, "supersedeId", e.target.value)}
                              className="bg-[#0c1017] border border-[#1e293b] rounded-lg p-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-slate-500 cursor-pointer max-w-[220px]"
                            >
                              <option value="">{t("无 (作为新事实写入)", "None (New Memory)")}</option>
                              {activeMemories.filter(m => m.status === "active").map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.id}: {language === "zh" ? m.content_zh : m.content}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2 self-end">
                          <button
                            onClick={() => handleReject(prop)}
                            className="text-[11px] px-3.5 py-1.5 rounded-lg border border-red-950 bg-red-950/20 text-red-400 font-bold hover:bg-red-950/40 transition-colors cursor-pointer"
                          >
                            {t("拒绝", "Reject")}
                          </button>
                          <button
                            onClick={() => handleApprove(prop)}
                            className="text-[11px] px-3.5 py-1.5 rounded-lg border border-emerald-950 bg-emerald-950/20 text-emerald-400 font-bold hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          >
                            {t("批准并激活", "Approve & Save")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right logs & library */}
        <div className="simulator-column-right">
          
          {/* Logs console */}
          <div className="editor-frame">
            <div className="editor-header">
              <div className="editor-dots">
                <span className="editor-dot r"></span>
                <span className="editor-dot y"></span>
                <span className="editor-dot g"></span>
              </div>
              <span className="editor-title">LOGS TERMINAL</span>
              <div></div>
            </div>
            <div className="editor-body p-4 text-[11px] h-48 overflow-y-auto font-mono flex flex-col bg-[#060810] text-[#86a5d4]">
              {simLogs.length === 0 ? (
                <span className="text-slate-600 italic">{t("等待提取操作输出治理轨迹...", "Logs will stream here...")}</span>
              ) : (
                simLogs.map((log, idx) => (
                  <div key={idx} className="break-all whitespace-pre-wrap leading-relaxed border-b border-[#0c1017]/30 pb-0.5">{log}</div>
                ))
              )}
            </div>
          </div>

          {/* Active library */}
          <div className="glass-card glow-border">
            <div className="flex items-center gap-3 mb-4">
              <span className="step-number-badge">3</span>
              <h3 className="text-sm font-bold text-white">{t("活性检索库 (Active Memory Library)", "Active Memory Library")}</h3>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 mb-4 bg-[#070a0f] p-1 rounded-lg border border-[#1e293b]">
              {["active", "superseded", "revoked", "expired", "all"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLibraryTab(tab)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer capitalize ${
                    libraryTab === tab 
                      ? 'bg-white/10 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab === "active" ? t("活性", "Active") : 
                   tab === "superseded" ? t("被覆盖", "Superseded") : 
                   tab === "revoked" ? t("已撤销", "Revoked") : 
                   tab === "expired" ? t("已过期", "Expired") : 
                   t("全部", "All")}
                </button>
              ))}
            </div>

            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("检索事实 (SQLite FTS5)...", "Search facts (SQLite FTS5)...")}
              className="w-full text-xs bg-[#070a0f] border border-[#1e293b] rounded-lg p-2.5 text-white mb-4 placeholder-slate-600 focus:outline-none focus:border-slate-500"
            />

            {filteredMemories.length === 0 ? (
              <div className="py-8 text-center text-slate-600 text-xs border border-dashed border-[#1e293b] rounded-lg bg-[#070a0f]/20">
                {activeMemories.length === 0 
                  ? t("暂无活性记忆。请在左侧批准一些提案事实以载入索引。", "No active memories. Approve proposals to save.")
                  : t("当前分类下无检索匹配结果。", "No matching facts found under this category.")}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredMemories.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleInspect(m)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      inspectedMemory && inspectedMemory.id === m.id
                        ? 'border-sky-500 bg-[#0f172a] shadow-[0_0_12px_rgba(56,189,248,0.08)]'
                        : statusColorMap[m.status]
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`m-badge m-badge-${m.type} text-[8.5px] px-1.5 py-0.5`}>
                          {getBadgeLabel(m.type)}
                        </span>
                        {m.status !== "active" && (
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            m.status === "revoked" ? "text-red-400 bg-red-950/40 border border-red-900/50" :
                            m.status === "superseded" ? "text-purple-400 bg-purple-950/40 border border-purple-900/50" :
                            "text-amber-400 bg-amber-950/40 border border-amber-900/50"
                          }`}>
                            {m.status === "revoked" ? t("已撤销", "REVOKED") :
                             m.status === "superseded" ? t("被覆盖", "SUPERSEDED") :
                             t("已过期", "EXPIRED")}
                          </span>
                        )}
                      </div>
                      
                      {m.status === "active" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevoke(m);
                          }}
                          className="text-[9.5px] text-slate-500 hover:text-red-400 font-semibold cursor-pointer border border-[#1e293b] hover:border-red-900/40 px-1.5 py-0.5 rounded bg-black/20"
                        >
                          {t("撤销", "Revoke")}
                        </button>
                      )}
                    </div>
                    
                    <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-relaxed">
                      {language === "zh" ? m.content_zh : m.content}
                    </p>
                    {m.expires_at && m.status === "active" && (
                      <div className="text-[9px] text-amber-500/80 mt-1.5 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                        <span>TTL: {new Date(m.expires_at).toLocaleTimeString()} ({t("限时活性", "Timed Recall")})</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit log viewer */}
          {inspectedMemory && (
            <div className="glass-card border-slate-800 bg-[#070a0f] p-5 shadow-2xl">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">
                  {t("单条事实生命周期审计 Trace", "Memory Lifecycle Audit Trace")}
                </h4>
                <button 
                  onClick={() => setInspectedMemory(null)}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold cursor-pointer"
                >
                  {t("关闭", "Close")}
                </button>
              </div>
              
              <div className="space-y-2 text-xs mb-4">
                <div>
                  <span className="text-slate-500 font-semibold">ID:</span> <span className="font-mono text-sky-400 bg-sky-950/20 px-1.5 py-0.5 rounded border border-sky-900/30">{inspectedMemory.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">{t("存储事实", "Memory Statement")}:</span>{" "}
                  <span className="text-slate-200">{language === "zh" ? inspectedMemory.content_zh : inspectedMemory.content}</span>
                </div>
                <div className="border-l-2 border-slate-800 pl-2.5 py-0.5 text-slate-400">
                  <span className="text-slate-500 font-semibold">{t("出处原文", "Evidence")}:</span> "
                  {language === "zh" ? inspectedMemory.source_quote_zh : inspectedMemory.source_quote}
                  "
                </div>
              </div>

              <div className="border-t border-[#1e293b] pt-3">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">{t("时间线记录", "Timeline Events")}</h5>
                <div className="space-y-3 relative pl-4 border-l border-[#1e293b]">
                  {auditEvents.map((evt, idx) => (
                    <div key={evt.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full bg-slate-800 border border-slate-700"></span>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">
                          {evt.event === "proposal_extracted" ? t("Qwen 分析提取提案", "Suggested by LLM") : ""}
                          {evt.event === "approved" ? t("人工审核确认活性", "Activated by review") : ""}
                          {evt.event === "revoked" ? t("人工指令废除事实", "Revoked from search") : ""}
                          {evt.event === "ttl_scheduled" ? t("计划 TTL 自动过期", "TTL Expired rule scheduled") : ""}
                          {evt.event === "expired" ? t("TTL 租约到期自动废弃", "Expired via TTL trigger") : ""}
                          {evt.event === "superseded" ? t("因事实迭代被新事实覆盖", "Superseded by new statement") : ""}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {t("执行主体", "Actor")}: <span className="font-mono text-slate-400">{evt.actor}</span>
                      </div>
                      {evt.details && (
                        <div className="text-[9.5px] text-sky-400/90 font-mono mt-1 bg-sky-950/20 px-2 py-0.5 rounded border border-sky-950 max-w-max">
                          {evt.details}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

