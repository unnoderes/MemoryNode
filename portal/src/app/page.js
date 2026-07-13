"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const PRESETS = [
  {
    id: "preset-1",
    title_zh: "开发编码偏好 (Coding Preference)",
    title_en: "Coding Preference",
    transcript_zh: "你好，我是开发者 Mike。我正在开发一个 React 应用。在编写 CSS 时，我更喜欢直接写原生的 CSS，而不是使用 Tailwind，因为这能让我有百分百的掌控感。另外，请在 JavaScript 代码中使用 ESM imports 导入模块。",
    transcript_en: "Hello, I am developer Mike. I am working on a React app. When writing CSS, I prefer writing raw CSS instead of Tailwind because it gives me 100% control. Also, please use ESM imports for JavaScript modules.",
    mockProposals: [
      {
        id: "prop-1",
        content: "Mike prefers raw CSS over Tailwind CSS in React development.",
        content_zh: "Mike 在 React 开发中偏好使用原生 CSS，而非 Tailwind CSS。",
        type: "user_preference",
        confidence: 0.94,
        source_quote: "I prefer writing raw CSS instead of Tailwind because it gives me 100% control",
        source_quote_zh: "我更喜欢直接写原生的 CSS，而不是使用 Tailwind，因为这能让我有百分百的掌控感",
        reason: "User explicitly stated coding preferences.",
        reason_zh: "用户明确表达了对编码样式的偏好。"
      },
      {
        id: "prop-2",
        content: "Mike prefers ESM imports for JavaScript modules.",
        content_zh: "Mike 偏好在 JavaScript 模块中使用 ESM 导入 (ESM imports)。",
        type: "user_preference",
        confidence: 0.92,
        source_quote: "please use ESM imports for JavaScript modules",
        source_quote_zh: "请在 JavaScript 代码中使用 ESM imports 导入模块",
        reason: "User explicitly requested ESM import style.",
        reason_zh: "用户明确要求使用 ESM 导入风格。"
      }
    ]
  },
  {
    id: "preset-2",
    title_zh: "项目架构决策 (Arch Decision)",
    title_en: "Project Arch Decision",
    transcript_zh: "在今天的架构评审会议上，我们决定项目数据库使用 SQLite 以保持本地简单性。为了实现文本的快速检索，我们将使用 SQLite 内置的 FTS5 引擎作为检索索引。Mike 将作为本项决策的负责人。",
    transcript_en: "During the architecture review meeting, we decided to use SQLite for database storage to keep it simple locally. To achieve fast text search, we will use the built-in FTS5 engine as the search index. Mike is the lead for this decision.",
    mockProposals: [
      {
        id: "prop-3",
        content: "Project database must be SQLite to ensure local simplicity.",
        content_zh: "项目数据库需使用 SQLite 以确保本地的简洁性。",
        type: "project_decision",
        confidence: 0.91,
        source_quote: "decided to use SQLite for database storage to keep it simple locally",
        source_quote_zh: "决定项目数据库使用 SQLite 以保持本地简单性",
        reason: "Team finalized database technology constraints.",
        reason_zh: "团队确定了数据库选型约束。"
      },
      {
        id: "prop-4",
        content: "SQLite FTS5 will be used as the text search index.",
        content_zh: "使用 SQLite FTS5 作为文本检索索引。",
        type: "project_decision",
        confidence: 0.89,
        source_quote: "use the built-in FTS5 engine as the search index",
        source_quote_zh: "使用 SQLite 内置的 FTS5 引擎作为检索索引",
        reason: "Engine decided for text retrieval capability.",
        reason_zh: "确立了文本检索的引擎规格。"
      }
    ]
  },
  {
    id: "preset-3",
    title_zh: "安全规约 (Security Policy)",
    title_en: "Security Policy",
    transcript_zh: "警告：切勿将包含真实 API 密钥（例如 OpenAI API Key）的 .env 配置文件或 sqlite 数据源文件提交到 GitHub 开源仓库中。这是一个非常严重的安全隐患，所有凭据必须保存在本地环境变量中。",
    transcript_en: "Warning: Never commit .env files containing real API keys (e.g., OpenAI API Key) or SQLite data files to GitHub. This is a severe security risk; all credentials must be kept in local environment variables.",
    mockProposals: [
      {
        id: "prop-5",
        content: "Never commit configuration (.env) files or databases containing API keys to repository.",
        content_zh: "严禁向代码仓库提交包含 API 密钥的配置文件 (.env) 或数据库文件。",
        type: "known_pitfall",
        confidence: 0.98,
        source_quote: "Never commit .env files containing real API keys... or SQLite data files to GitHub",
        source_quote_zh: "切勿将包含真实 API 密钥的 .env 配置文件或 sqlite 数据源文件提交到 GitHub",
        reason: "Critical security risk identified regarding credentials exposure.",
        reason_zh: "识别到关于凭据泄露的严重安全风险。"
      }
    ]
  }
];

const ARCH_STEPS = {
  raw: {
    title_zh: "1. 原始交互流 (Raw Transcript)",
    title_en: "1. Raw Transcript",
    desc_zh: "大模型智能体与用户之间的所有交互文本日志。由于输入内容不受信，不能直接写入数据库，否则容易遭遇注入攻击或被冗余噪音污染。",
    desc_en: "All interaction logs between agents and users. Because inputs are untrusted, saving them directly risks poisoning or noise pollution.",
    tech: "FastAPI Input / SDK Stream"
  },
  extractor: {
    title_zh: "2. LLM 规则提取 (Qwen Extractor)",
    title_en: "2. Qwen Extractor",
    desc_zh: "基于微调小模型或特定 Prompt，从对话流中解析结构化事实，识别归类为“偏好”、“约束”或“决策”，并输出置信度评分和原句引用。",
    desc_en: "LLM analyzes dialogue stream to extract structured facts, cataloging them into preferences, constraints, or decisions with source quotes.",
    tech: "Qwen Fine-Tuned / Responses API"
  },
  proposals: {
    title_zh: "3. 待核提案缓冲 (Proposals DB)",
    title_en: "3. Proposals DB",
    desc_zh: "提取的事实首先存储为 `pending` 提案。此阶段数据被物理隔离，不可召回。相当于数据库中的暂存草稿，等待人类进行审查。",
    desc_en: "Extracted facts are stored as `pending` proposals in SQLite. They are sandboxed and hidden from retrieval, acting as raw drafts.",
    tech: "SQLite Isolation"
  },
  reviewer: {
    title_zh: "4. 人自治校验阀 (Human Reviewer)",
    title_en: "4. Human Reviewer",
    desc_zh: "提供简洁直观的看板或 CLI 指令。允许人类管理员修改提议事实、设定未来失效时间、或挑选被覆盖替换的旧冲突记忆（冲突仲裁）。",
    desc_en: "Provides Next.js layout or terminal workflows. Humans review drafts, override conflicts, or assign TTLs before finalizing memories.",
    tech: "Next.js Admin Console / CLI"
  },
  active: {
    title_zh: "5. 受信活性匹配 (Active Memory)",
    title_en: "5. Active Memory",
    desc_zh: "核准的事实转化为 `active` 受信知识，自动装载进 SQLite FTS5 全文索引。当智能体再次启动任务时，提供亚毫秒级的活性事实检索召回。",
    desc_en: "Approved facts turn into `active` memories, instantly indexed by SQLite FTS5 for sub-millisecond retrieval during agent interactions.",
    tech: "SQLite FTS5 Full-Text Index"
  }
};

const DEV_API_DATA = {
  extract: {
    method: "POST",
    url: "/v1/proposals/extract",
    desc_zh: "输入原始消息流，使用 Qwen 提取结构化记忆建议",
    desc_en: "Extract memory proposals from raw transcripts using Qwen compatible LLM.",
    python: `import requests

url = "https://api.memorynode.io/v1/proposals/extract"
headers = {"Authorization": "Bearer $API_KEY"}
payload = {
    "actor_id": "mike-dev",
    "project_id": "react-web-app",
    "messages": [
        {"role": "user", "content": "I prefer using raw CSS instead of Tailwind."}
    ]
}

response = requests.post(url, json=payload, headers=headers)
print(response.json()["proposals"])`,
    curl: `curl -X POST https://api.memorynode.io/v1/proposals/extract \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "actor_id": "mike-dev",
    "project_id": "react-web-app",
    "messages": [{"role": "user", "content": "I prefer using raw CSS instead of Tailwind."}]
  }'`
  },
  approve: {
    method: "POST",
    url: "/v1/proposals/{id}/approve",
    desc_zh: "批准指定的提案升级为活性检索记忆，可选择替代指定 ID 的冲突记忆",
    desc_en: "Approve a proposal to activate it, optionally overriding an existing memory ID.",
    python: `import requests

# Approve and override a conflicting old memory
url = "https://api.memorynode.io/v1/proposals/prop_908f2/approve"
payload = {
    "actor_id": "admin-reviewer",
    "supersede_memory_id": "mem_01c23f",  # Old memory to replace
    "expires_at": "2026-12-31T23:59:59Z"  # Optional TTL expiry
}

response = requests.post(url, json=payload)
print(response.json())`,
    curl: `curl -X POST https://api.memorynode.io/v1/proposals/prop_908f2/approve \\
  -H "Content-Type: application/json" \\
  -d '{
    "actor_id": "admin-reviewer",
    "supersede_memory_id": "mem_01c23f",
    "expires_at": "2026-12-31T23:59:59Z"
  }'`
  },
  search: {
    method: "GET",
    url: "/v1/memories/search?q={query}",
    desc_zh: "使用 FTS5 引擎在当前活跃记忆列表中进行全文匹配",
    desc_en: "Perform a keyword full-text query over active memories in SQLite.",
    python: `import requests

url = "https://api.memorynode.io/v1/memories/search"
params = {"q": "React CSS", "project_id": "react-web-app"}

response = requests.get(url, params=params)
memories = response.json()["memories"]
for m in memories:
    print(f"[{m['type']}] -> {m['content']}")`,
    curl: `curl -X GET "https://api.memorynode.io/v1/memories/search?q=React+CSS&project_id=react-web-app"`
  },
  revoke: {
    method: "POST",
    url: "/v1/memories/{id}/revoke",
    desc_zh: "撤销某项记忆的活跃状态，立即从检索索引中清除，但保留事件溯源轨迹",
    desc_en: "Revoke a memory's active status, deleting it from indices while preserving history.",
    python: `import requests

url = "https://api.memorynode.io/v1/memories/mem_04d82c/revoke"
payload = {
    "actor_id": "admin-reviewer",
    "note": "User changed coding stack"
}

response = requests.post(url, json=payload)
print(response.json()["status"])  # Outputs: 'revoked'`,
    curl: `curl -X POST https://api.memorynode.io/v1/memories/mem_04d82c/revoke \\
  -H "Content-Type: application/json" \\
  -d '{"actor_id": "admin-reviewer", "note": "User changed coding stack"}'`
  }
};

export default function PortalPage() {
  const [language, setLanguage] = useState("zh");
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
  
  // Interactive nodes & documentation states
  const [activeNode, setActiveNode] = useState("extractor");
  const [activeApiTab, setActiveApiTab] = useState("extract");
  const [codeLang, setCodeLang] = useState("python");
  const [copyFeedback, setCopyFeedback] = useState(false);

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
    
    // Build audit path
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

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const t = (zh, en) => (language === "zh" ? zh : en);

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
    <div className="relative min-h-screen bg-[#030303]">
      {/* Background Grids */}
      <div className="grid-overlay"></div>
      <div className="radial-glow-1" style={{ top: "-150px", left: "-100px" }}></div>
      <div className="radial-glow-2" style={{ top: "500px", right: "-100px" }}></div>

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-[#111]">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 bg-sky-400 rounded-full shadow-[0_0_12px_#38bdf8] animate-pulse"></span>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            MemoryNode
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <a href="#playground" className="hover:text-white transition-colors">{t("交互沙盒", "Playground")}</a>
          <a href="#architecture" className="hover:text-white transition-colors">{t("核心架构", "Architecture")}</a>
          <a href="#api" className="hover:text-white transition-colors">{t("API 接口", "API Docs")}</a>
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            className="text-[11px] font-bold px-3 py-1.5 rounded border border-[#1e293b] bg-[#090d14] hover:bg-[#111827] text-slate-300 hover:text-white transition-all"
          >
            {language === "zh" ? "English" : "中文"}
          </button>
          
          <a 
            href="https://github.com/unnoderes/MemoryNode" 
            target="_blank"
            className="pill-btn pill-btn-white text-[11px] py-2 px-4 font-bold"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-[#1e293b] text-[10.5px] font-semibold text-slate-400 mb-8">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_6px_#34d399] animate-pulse"></span>
          <span>{t("自治记忆治理层：开源 v0.4.2", "Governed Memory Layer: Open Source v0.4.2")}</span>
        </div>

        <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.05] mb-8 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          {t("自治记忆，归于人治。", "Autonomous Memory, Governed by Humans.")}
        </h1>
        
        <p className="text-slate-400 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed mb-12">
          {t(
            "智能体不应盲目吸纳上下文。MemoryNode 提供基于证据的事实提取、人类在环的待审缓冲、基于关联的冲突覆盖与审计追踪。为高安全性的编码智能体与工作流而生。",
            "Stop blindly committing raw contexts. MemoryNode parses evidence-backed proposals, isolates untrusted memories in a drafts buffer, resolves semantic overrides, and maintains absolute audit history."
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a href="#playground" className="pill-btn pill-btn-white text-sm py-3 px-8">
            {t("体验交互沙盒", "Explore Simulator")}
          </a>
          <a href="#api" className="pill-btn pill-btn-dark text-sm py-3 px-8">
            {t("查看集成文档", "Developer Setup")}
          </a>
        </div>

        {/* Installation and CLI Command bar */}
        <div className="max-w-2xl mx-auto mb-24">
          <div className="editor-frame bg-[#060910]">
            <div className="editor-header">
              <div className="editor-dots">
                <span className="editor-dot r"></span>
                <span className="editor-dot y"></span>
                <span className="editor-dot g"></span>
              </div>
              <span className="editor-title">GET STARTED</span>
              <button 
                onClick={() => handleCopy("pip install memorynode-sdk")} 
                className="text-[10px] text-slate-400 hover:text-white"
              >
                {copyFeedback ? t("已复制", "Copied") : t("复制", "Copy")}
              </button>
            </div>
            <div className="editor-body text-left font-mono p-4 flex justify-between items-center text-xs">
              <span className="text-sky-300">pip install memorynode-sdk</span>
              <span className="text-slate-600 font-sans text-[11px]">{t("支持 Python / MCP 服务端", "Python & MCP Server ready")}</span>
            </div>
          </div>
          
          <div className="flex justify-center gap-6 mt-4 text-[11px] text-slate-500 font-semibold">
            <span>{t("支持集成：", "Integrations:")} Cursor / Claude Code / Windsurf / FastHTML</span>
            <span>•</span>
            <a href="https://github.com/unnoderes/MemoryNode/releases" className="hover:text-white transition-colors">{t("下载 CLI 二进制包", "Download CLI Binaries")}</a>
          </div>
        </div>

        {/* Core Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto text-left">
          <div className="feature-box">
            <h3 className="text-white font-bold text-sm mb-2">{t("1. 证据出处（Provenance）", "1. Strict Provenance")}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("所有提取记忆都必须保存 Source Quote（原句引用），提供大模型上下文以判定事实出处，防止捏造事实或产生幻觉。", "Every fact retains a direct source quote citation from conversational logs, preventing fabrications and hallucinated updates.")}
            </p>
          </div>
          <div className="feature-box">
            <h3 className="text-white font-bold text-sm mb-2">{t("2. 待审隔离（Draft Isolation）", "2. Isolation Buffer")}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("新提案生成后默认处于 pending 隔离态，无法被智能体检索，必须通过人类管理员通过控制台或 CLI 执行批准后才激活。", "New suggestions are buffered in a pending state, physically isolated from active recall until checked by an admin.")}
            </p>
          </div>
          <div className="feature-box">
            <h3 className="text-white font-bold text-sm mb-2">{t("3. 冲突覆写（Supersession）", "3. Conflict Resolution")}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("允许关联已存在的旧事实 ID 执行覆盖（Approve & Supersede），废弃旧数据并重建检索关联，保证事实时效性。", "Allows reviewers to link new approvals to older memory IDs, executing a clean override that revokes stale context.")}
            </p>
          </div>
        </div>
      </main>

      {/* Simulator Sandbox */}
      <section id="playground" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-[#111]">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            {t("记忆生命周期交互演练沙盒", "Interactive Memory Sandbox")}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            {t("在下方体验记忆被提取、缓存、人工审核、亚毫秒级检索及一键废除的完整过程。此演示 100% 运行于浏览器本地。", "Walk through the full process of memory suggesting, buffering, human approval, and FTS5 revocation in this local simulator.")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            
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
                  className="pill-btn pill-btn-white text-xs font-bold py-2 px-5"
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
                          className="text-[11px] px-3.5 py-1.5 rounded-lg border border-red-950 bg-red-950/20 text-red-400 font-bold hover:bg-red-950/40 transition-colors"
                        >
                          {t("拒绝", "Reject")}
                        </button>
                        <button
                          onClick={() => handleApprove(prop)}
                          className="text-[11px] px-3.5 py-1.5 rounded-lg border border-emerald-950 bg-emerald-950/20 text-emerald-400 font-bold hover:bg-emerald-950/40 transition-colors"
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
          <div className="space-y-6">
            
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
                            className="text-[9px] text-slate-500 hover:text-red-500 font-semibold"
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

      {/* Paradigm shift comparison */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-[#111]">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            {t("设计理念革命：自治记忆 vs 传统向量记忆", "Paradigm Shift: Governed Memory vs Vector DB")}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            {t("为什么传统智能体将记忆直接写入向量库是危险且低效的？", "Why traditional direct database commits are dangerous for production agents.")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Traditional Vector DB */}
          <div className="p-8 rounded-2xl border border-red-500/10 bg-[#0a0505] text-left">
            <h3 className="text-base font-bold text-red-500 mb-4">{t("✕ 传统盲目记忆 (Vector DB Auto-commit)", "Traditional Vector DB Auto-commit")}</h3>
            <ul className="space-y-4 text-xs sm:text-sm text-slate-400 leading-relaxed">
              <li className="flex gap-2.5">
                <span className="text-red-500 font-bold">✕</span>
                <span>{t("静默写入副作用：智能体在后台自动生成并保存事实，用户不知情、不可见。", "Silent side-effects: Agent writes embeddings automatically without any admin visibility.")}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-red-500 font-bold">✕</span>
                <span>{t("注入污染隐患：通过对话中带有偏见的叙述或恶意 Prompt，可污染智能体知识库。", "Injection poisoning: Untrusted user dialogues can inject and poison agent instructions.")}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-red-500 font-bold">✕</span>
                <span>{t("黑盒无法追踪：大模型检索出了某些历史设定，却无法指出来源于哪次会话。", "Zero traceability: Recall statements lack source context, failing structural compliance.")}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-red-500 font-bold">✕</span>
                <span>{t("规则冲突交织：当偏好或准则改变时，新旧条目在向量库中共存，逻辑打架。", "Outdated entanglements: Old facts remain active next to new rules, causing logic loops.")}</span>
              </li>
            </ul>
          </div>

          {/* Governed Memory */}
          <div className="p-8 rounded-2xl border border-white/5 bg-[#090d14]/40 text-left">
            <h3 className="text-base font-bold text-emerald-400 mb-4">{t("✓ MemoryNode 受管记忆 (Governed Memory)", "MemoryNode Governed Memory")}</h3>
            <ul className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <li className="flex gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{t("提案缓冲机制：新信息提取生成待审提议，未经人工批准绝对不能进入智能体检索。", "Isolated Drafts: Candidate facts are isolated in draft pools, keeping search index clean.")}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{t("严格事实出处：每条生效的记忆都强绑定原文引用（Source Quote）和提取 Rationales。", "Fact-to-Evidence Link: All active facts are structurally linked to source quote citations.")}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{t("显式冲突覆盖：批准新事实时，支持指定 supersede_memory_id 显式撤销并覆盖旧数据。", "Conflict Resolving: Explicitly link older memory IDs to declare state overrides.")}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{t("透明废弃归档：撤销（Revoke）或过期事实将即刻移出检索索引，但保留溯源审计日志。", "Audit-safe Revocation: Instantly block retrieval of revoked facts while archiving history.")}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-[#111]">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            {t("数据流动与阶段组件剖析", "Dynamic Dataflow Architecture")}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
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
            <span className="font-mono text-xs text-sky-400">{ARCH_STEPS[activeNode].tech}</span>
          </div>
        </div>
      </section>

      {/* Developer API Docs */}
      <section id="api" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-[#111]">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            {t("极简的集成协议 (API Reference)", "Minimal API reference")}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            {t("开箱即用的 RESTful 风格的 HTTP 接口，可轻松与您的任何 AI Agents 智能体框架无缝整合。", "Integrate MemoryNode into your custom LangChain, AutoGen, or custom agent flow with REST contracts.")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Menu */}
          <div className="glass-card p-4 space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase px-3 mb-3">{t("核心生命周期接口", "Core API routes")}</div>
            {Object.keys(DEV_API_DATA).map((key) => (
              <button
                key={key}
                onClick={() => setActiveApiTab(key)}
                className={`w-full flex items-center justify-between text-left p-3.5 rounded-xl text-xs font-bold transition-all ${
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
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card">
              <div className="flex justify-between items-center border-b border-[#1e293b] pb-4 mb-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white mb-1 font-mono">
                    {DEV_API_DATA[activeApiTab].method} {DEV_API_DATA[activeApiTab].url}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === "zh" ? DEV_API_DATA[activeApiTab].desc_zh : DEV_API_DATA[activeApiTab].desc_en}
                  </p>
                </div>
                
                <div className="flex gap-2 bg-[#070a0f] p-1 rounded-lg border border-[#1e293b]">
                  <button 
                    onClick={() => setCodeLang("python")}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${
                      codeLang === 'python' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Python
                  </button>
                  <button 
                    onClick={() => setCodeLang("curl")}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${
                      codeLang === 'curl' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    cURL
                  </button>
                </div>
              </div>

              {/* Code viewer */}
              <div className="editor-frame bg-[#060810] border-[#1e293b]">
                <div className="editor-header bg-[#0e131f] py-2 px-4 border-b border-[#1e293b] flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {codeLang === 'python' ? 'main.py' : 'terminal'}
                  </span>
                  <button
                    onClick={() => handleCopy(codeLang === 'python' ? DEV_API_DATA[activeApiTab].python : DEV_API_DATA[activeApiTab].curl)}
                    className="text-[10px] text-slate-400 hover:text-white font-semibold"
                  >
                    {copyFeedback ? t("已复制!", "Copied!") : t("复制代码", "Copy")}
                  </button>
                </div>
                <div className="editor-body p-4 overflow-x-auto text-[11.5px] bg-[#060810] text-slate-300">
                  <pre className="whitespace-pre">{codeLang === "python" ? DEV_API_DATA[activeApiTab].python : DEV_API_DATA[activeApiTab].curl}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
    </div>
  );
}
