"use client";

import React, { useState, useEffect } from "react";
import { PRESETS } from "../lib/constants";

export default function Simulator({ language, t }) {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [inputText, setInputText] = useState(PRESETS[0].transcript_zh);
  const [isExtracting, setIsExtracting] = useState(false);
  const [simLogs, setSimLogs] = useState([]);
  
  // Simulated DB
  const [proposals, setProposals] = useState([]);
  const [activeMemories, setActiveMemories] = useState([]);
  const [rejectedProposals, setRejectedProposals] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectedMemory, setInspectedMemory] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);

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
    setSimLogs((prev) => [...prev, `[${time}] [${tag}] ${message}`]);
  };

  const handlePresetSelect = (idx) => {
    setSelectedPreset(idx);
    addLog("UI", `Loaded Preset ${idx + 1}: ${language === 'zh' ? PRESETS[idx].title_zh : PRESETS[idx].title_en}`);
  };

  const triggerExtraction = () => {
    if (!inputText.trim()) return;
    setIsExtracting(true);
    setProposals([]);
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
        const presetProposals = PRESETS[selectedPreset].mockProposals.map((p) => ({
          ...p,
          id: "prop-" + Math.floor(Math.random() * 100000),
          status: "pending"
        }));
        setProposals(presetProposals);
        addLog("SYSTEM", `Successfully structured ${presetProposals.length} memory proposals. Isolating in Proposals Buffer.`);
        setIsExtracting(false);
      }
    }, 450);
  };

  const handleApprove = (prop) => {
    addLog("AUDIT", `Reviewer approved proposal ${prop.id}.`);
    
    const newMemory = {
      id: "mem-" + Math.floor(Math.random() * 100000),
      content: prop.content,
      content_zh: prop.content_zh,
      type: prop.type,
      status: "active",
      confidence: prop.confidence,
      source_quote: prop.source_quote,
      source_quote_zh: prop.source_quote_zh,
      reason: prop.reason,
      reason_zh: prop.reason_zh,
      created_at: new Date().toISOString()
    };

    setActiveMemories(prev => [newMemory, ...prev]);
    setProposals(prev => prev.filter(p => p.id !== prop.id));
    addLog("DATABASE", `Memory ${newMemory.id} initialized. Stored in SQLite and FTS5 indices updated.`);
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
      setAuditEvents(prev => [
        ...prev,
        {
          id: "evt-revoke-" + Math.floor(Math.random() * 100),
          event: "revoked",
          actor: "reviewer-audit",
          timestamp: new Date().toISOString()
        }
      ]);
    }
    addLog("DATABASE", `Memory ${memory.id} revoked successfully.`);
  };

  const handleInspect = (memory) => {
    setInspectedMemory(memory);
    addLog("EXPLORE", `Inspecting lifecycle audit trail for memory: ${memory.id}`);
    
    const events = [
      {
        id: "evt-1",
        event: "proposal_extracted",
        actor: "qwen-llm-core",
        timestamp: memory.created_at || new Date(Date.now() - 60000).toISOString()
      },
      {
        id: "evt-2",
        event: "approved",
        actor: "human-reviewer",
        timestamp: memory.created_at || new Date().toISOString()
      }
    ];
    if (memory.status === "revoked") {
      events.push({
        id: "evt-3",
        event: "revoked",
        actor: "human-reviewer",
        timestamp: new Date().toISOString()
      });
    }
    setAuditEvents(events);
  };

  const filteredMemories = activeMemories.filter((m) => {
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

  return (
    <section id="playground">
      <div className="section-header-block">
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
          <div className="glass-card">
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
                    className={`p-3 rounded-lg border text-left text-xs transition-all ${
                      selectedPreset === idx 
                        ? 'bg-[#0f172a] border-[#38bdf8] text-white' 
                        : 'bg-[#070a0f] border-[#1e293b] text-slate-400 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="font-bold mb-1 truncate">
                      {language === "zh" ? preset.title_zh : preset.title_en}
                    </div>
                    <div className="line-clamp-2 opacity-60">
                      {language === "zh" ? preset.transcript_zh : preset.transcript_en}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <div className="text-[11px] text-slate-500 font-mono">
                {t("仿真解析模块：Qwen-2.5-Coder", "Emulator core: Qwen-2.5-Coder")}
              </div>
              <button
                onClick={triggerExtraction}
                disabled={isExtracting || !inputText.trim()}
                className="pill-btn pill-btn-white text-xs font-bold py-2 px-5 cursor-pointer"
              >
                {isExtracting ? t("正在分析...", "Parsing...") : t("运行记忆提取 (Extract)", "Run Extraction")}
              </button>
            </div>
          </div>

          {/* Suggestions buffer */}
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-4">
              <span className="step-number-badge">2</span>
              <h3 className="text-sm font-bold text-white">
                {t("待审核提议库 (Proposals Buffer)", "Proposals Draft Buffer")}
              </h3>
              {proposals.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-400 font-bold">
                  {t(`${proposals.length} 条待审`, `${proposals.length} pending`)}
                </span>
              )}
            </div>

            {proposals.length === 0 ? (
              <div className="py-14 text-center text-slate-500 text-xs border border-dashed border-[#1e293b] rounded-xl bg-[#070a0f]/40">
                {isExtracting 
                  ? t("AI 规则解析中，请注意查看右侧日志控制台...", "Extracting facts, monitor the console logs on the right...") 
                  : t("等待运行提取。生成的草稿提议将在此处等待人工判定...", "No draft proposals buffered yet. Run extraction to suggest memories.")}
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((prop) => (
                  <div key={prop.id} className="p-4 rounded-xl bg-[#070a0f] border border-[#1e293b] flex flex-col md:flex-row justify-between gap-4">
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
                    
                    <div className="flex md:flex-col justify-end gap-2 shrink-0 self-end md:self-center">
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
                        {t("批准", "Approve")}
                      </button>
                    </div>
                  </div>
                ))}
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
            <div className="editor-body p-4 text-[11px] max-h-48 overflow-y-auto font-mono space-y-1 bg-[#060810] text-[#86a5d4]">
              {simLogs.length === 0 ? (
                <span className="text-slate-600 italic">{t("等待提取操作输出治理轨迹...", "Logs will stream here...")}</span>
              ) : (
                simLogs.map((log, idx) => (
                  <div key={idx} className="break-all whitespace-pre-wrap">{log}</div>
                ))
              )}
            </div>
          </div>

          {/* Active library */}
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-4">
              <span className="step-number-badge">3</span>
              <h3 className="text-sm font-bold text-white">{t("活性检索库 (Active Memory Library)", "Active Memory Library")}</h3>
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
                  : t("无相关检索匹配结果。", "No matching facts found.")}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredMemories.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleInspect(m)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      inspectedMemory && inspectedMemory.id === m.id
                        ? 'bg-[#0f172a] border-sky-500'
                        : 'bg-[#070a0f] border-[#1e293b] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`m-badge m-badge-${m.type} text-[8.5px] px-1.5 py-0.5`}>
                        {getBadgeLabel(m.type)}
                      </span>
                      
                      {m.status === "revoked" ? (
                        <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider">{t("已废弃", "REVOKED")}</span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevoke(m);
                          }}
                          className="text-[9px] text-slate-500 hover:text-red-500 font-semibold cursor-pointer"
                        >
                          {t("撤销 (Revoke)", "Revoke")}
                        </button>
                      )}
                    </div>
                    
                    <p className="text-xs font-semibold text-slate-200 line-clamp-2">
                      {language === "zh" ? m.content_zh : m.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit log viewer */}
          {inspectedMemory && (
            <div className="glass-card border-slate-800 bg-[#070a0f] p-5">
              <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-3">
                {t("单条事实生命周期审计 Trace", "Memory Lifecycle Audit Trace")}
              </h4>
              
              <div className="space-y-2 text-xs mb-4">
                <div>
                  <span className="text-slate-500 font-semibold">ID:</span> <span className="font-mono text-slate-300">{inspectedMemory.id}</span>
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
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">{t("时间线记录", "Timeline Events")}</h5>
                <div className="space-y-2">
                  {auditEvents.map((evt) => (
                    <div key={evt.id} className="timeline-item">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">
                          {evt.event === "proposal_extracted" ? t("Qwen 分析提取提案", "Suggested by LLM") : ""}
                          {evt.event === "approved" ? t("人工审核确认活性", "Activated by review") : ""}
                          {evt.event === "revoked" ? t("人工指令废除事实", "Revoked from search") : ""}
                        </span>
                        <span className="text-[9px] text-slate-600">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {t("执行主体", "Actor")}: {evt.actor}
                      </div>
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
