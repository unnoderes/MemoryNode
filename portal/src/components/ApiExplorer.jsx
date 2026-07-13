"use client";

import React, { useState } from "react";
import { DEV_API_DATA } from "../lib/constants";

const MOCK_RESPONSES = {
  extract: {
    url: "POST /v1/proposals/extract",
    status: 200,
    body: {
      "status": "success",
      "proposals": [
        {
          "id": "prop_908f2",
          "content": "Mike prefers raw CSS over Tailwind CSS in React development.",
          "type": "user_preference",
          "confidence": 0.94,
          "source_quote": "I prefer writing raw CSS instead of Tailwind...",
          "reason": "User explicitly stated coding preferences."
        }
      ]
    }
  },
  approve: {
    url: "POST /v1/proposals/prop_908f2/approve",
    status: 200,
    body: {
      "status": "success",
      "memory_id": "mem_01c23f",
      "activated": true,
      "superseded_id": "mem_old_902",
      "expires_at": "2026-12-31T23:59:59Z",
      "audit_event_logged": true
    }
  },
  search: {
    url: "GET /v1/memories/search?q=React+CSS",
    status: 200,
    body: {
      "query": "React CSS",
      "results_count": 1,
      "memories": [
        {
          "id": "mem_01c23f",
          "content": "Mike prefers raw CSS over Tailwind CSS in React development.",
          "type": "user_preference",
          "confidence": 0.94,
          "source_quote": "I prefer writing raw CSS instead of Tailwind...",
          "created_at": "2026-07-14T00:30:00Z"
        }
      ]
    }
  },
  revoke: {
    url: "POST /v1/memories/mem_04d82c/revoke",
    status: 200,
    body: {
      "status": "success",
      "memory_id": "mem_04d82c",
      "action": "revoked",
      "deindexed_from_fts5": true,
      "archived_in_history": true
    }
  }
};

export default function ApiExplorer({ language, t }) {
  const [activeApiTab, setActiveApiTab] = useState("extract");
  const [codeLang, setCodeLang] = useState("python");
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const [activeSubTab, setActiveSubTab] = useState("code"); // "code" | "response"
  const [apiResponse, setApiResponse] = useState(null);
  const [isApiLoading, setIsApiLoading] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleTestApi = () => {
    setIsApiLoading(true);
    setApiResponse(null);
    setActiveSubTab("response");

    setTimeout(() => {
      setApiResponse(MOCK_RESPONSES[activeApiTab]);
      setIsApiLoading(false);
    }, 1200);
  };

  const handleApiTabSelect = (key) => {
    setActiveApiTab(key);
    setActiveSubTab("code");
    setApiResponse(null);
  };

  return (
    <section id="api">
      <div className="section-header-block">
        <h2 className="section-title">
          {t("极简的集成协议 (API Reference)", "Minimal API reference")}
        </h2>
        <p className="section-desc">
          {t("开箱即用的 RESTful 风格的 HTTP 接口，可轻松与您的任何 AI Agents 智能体框架无缝整合。", "Integrate MemoryNode into your custom LangChain, AutoGen, or custom agent flow with REST contracts.")}
        </p>
      </div>

      <div className="api-explorer-grid">
        {/* Menu */}
        <div className="glass-card p-4 space-y-1 glow-border">
          <div className="text-[10px] font-bold text-slate-500 uppercase px-3 mb-3">{t("核心生命周期接口", "Core API routes")}</div>
          {Object.keys(DEV_API_DATA).map((key) => (
            <button
              key={key}
              onClick={() => handleApiTabSelect(key)}
              className={`w-full flex items-center justify-between text-left p-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeApiTab === key
                  ? 'bg-[#0f172a] text-white border-l-2 border-sky-400 pl-4'
                  : 'text-slate-400 hover:bg-[#070a0f] hover:text-white pl-3'
              }`}
            >
              <div>
                <span className={`text-[9px] font-extrabold mr-2 uppercase ${
                  DEV_API_DATA[key].method === 'POST' ? 'text-emerald-400' : 'text-sky-400'
                }`}>
                  {DEV_API_DATA[key].method}
                </span>
                <span>{DEV_API_DATA[key].url}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Snippet Viewer */}
        <div>
          <div className="glass-card glow-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#1e293b] pb-4 mb-4 gap-4">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white mb-1 font-mono">
                  {DEV_API_DATA[activeApiTab].method} {DEV_API_DATA[activeApiTab].url}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === "zh" ? DEV_API_DATA[activeApiTab].desc_zh : DEV_API_DATA[activeApiTab].desc_en}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleTestApi}
                  disabled={isApiLoading}
                  className="text-[10.5px] font-bold px-3 py-1.5 rounded-lg border border-sky-950 bg-sky-950/20 text-sky-400 hover:bg-sky-950/40 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {t("运行测试 (Test API)", "Test API")}
                </button>
              </div>
            </div>

            {/* Inner Tabs for Code or Response */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex gap-1.5 bg-[#070a0f] p-1 rounded-lg border border-[#1e293b]">
                <button 
                  onClick={() => setActiveSubTab("code")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${
                    activeSubTab === 'code' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t("请求代码", "Request Code")}
                </button>
                <button 
                  onClick={() => setActiveSubTab("response")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${
                    activeSubTab === 'response' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t("测试响应", "Response JSON")}
                </button>
              </div>

              {activeSubTab === "code" ? (
                <div className="flex gap-2 bg-[#070a0f] p-1 rounded-lg border border-[#1e293b]">
                  <button 
                    onClick={() => setCodeLang("python")}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      codeLang === 'python' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Python
                  </button>
                  <button 
                    onClick={() => setCodeLang("curl")}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      codeLang === 'curl' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    cURL
                  </button>
                </div>
              ) : (
                apiResponse && (
                  <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                    HTTP {apiResponse.status} OK
                  </div>
                )
              )}
            </div>

            {/* Code / Output viewer */}
            <div className="editor-frame bg-[#060810] border-[#1e293b]">
              <div className="editor-header bg-[#0e131f] py-2 px-4 border-b border-[#1e293b] flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-mono">
                  {activeSubTab === "code" 
                    ? (codeLang === 'python' ? 'main.py' : 'terminal')
                    : 'response.json'
                  }
                </span>
                
                {activeSubTab === "code" ? (
                  <button
                    onClick={() => handleCopy(codeLang === 'python' ? DEV_API_DATA[activeApiTab].python : DEV_API_DATA[activeApiTab].curl)}
                    className="text-[10px] text-slate-400 hover:text-white font-semibold cursor-pointer"
                  >
                    {copyFeedback ? t("已复制!", "Copied!") : t("复制代码", "Copy")}
                  </button>
                ) : (
                  apiResponse && (
                    <button
                      onClick={() => handleCopy(JSON.stringify(apiResponse.body, null, 2))}
                      className="text-[10px] text-slate-400 hover:text-white font-semibold cursor-pointer"
                    >
                      {copyFeedback ? t("已复制!", "Copied!") : t("复制 JSON", "Copy JSON")}
                    </button>
                  )
                )}
              </div>
              
              <div className="editor-body p-4 overflow-x-auto text-[11.5px] bg-[#060810] text-slate-300 min-h-[160px] font-mono">
                {activeSubTab === "code" ? (
                  <pre className="whitespace-pre">{codeLang === "python" ? DEV_API_DATA[activeApiTab].python : DEV_API_DATA[activeApiTab].curl}</pre>
                ) : isApiLoading ? (
                  <div className="flex flex-col justify-center items-center py-8 text-slate-500 gap-2">
                    <span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></span>
                    <span>{t("正在测试连接并请求数据...", "Executing mock API request...")}</span>
                  </div>
                ) : apiResponse ? (
                  <pre className="whitespace-pre text-emerald-400/90 leading-relaxed">{JSON.stringify(apiResponse.body, null, 2)}</pre>
                ) : (
                  <div className="flex flex-col justify-center items-center py-8 text-slate-600 gap-1 italic text-xs">
                    <span>{t("点击右上角 [运行测试] 按钮执行 mock 调用", "Click [Test API] above to execute a simulated endpoint call.")}</span>
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

