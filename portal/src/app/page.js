"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const BACKEND_URL = "http://localhost:8000";

const PRESETS = [
  {
    id: "preset-1",
    title_zh: "开发偏好 (Developer Preference)",
    title_en: "Developer Preference",
    transcript_zh: "你好，我是开发者 Mike。我正在开发一个 React 应用。在编写 CSS 时，我更喜欢直接写原生的 CSS，而不是使用 Tailwind，因为这能让我有百分百的掌控感。另外，请在 JavaScript 代码中使用 ESM imports 导入模块。",
    transcript_en: "Hello, I am developer Mike. I am working on a React app. When writing CSS, I prefer writing raw CSS instead of Tailwind because it gives me 100% control. Also, please use ESM imports for JavaScript modules.",
    mockProposals: [
      {
        id: "mock-prop-1",
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
        id: "mock-prop-2",
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
        id: "mock-prop-3",
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
        id: "mock-prop-4",
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
    title_zh: "安全准则 (Security Guideline)",
    title_en: "Security Guideline",
    transcript_zh: "警告：切勿将包含真实 API 密钥（例如 OpenAI API Key）的 .env 配置文件或 sqlite 数据源文件提交到 GitHub 开源仓库中。这是一个非常严重的安全隐患，所有凭据必须保存在本地环境变量中。",
    transcript_en: "Warning: Never commit .env files containing real API keys (e.g., OpenAI API Key) or SQLite data files to GitHub. This is a severe security risk; all credentials must be kept in local environment variables.",
    mockProposals: [
      {
        id: "mock-prop-5",
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

const ARCH_NODES = {
  raw: {
    title_zh: "1. 原始交互流 (Raw Interaction)",
    title_en: "1. Raw Interaction",
    desc_zh: "智能体与用户的每一次对话输入（Chat Logs）或动作日志。这些数据包含大量冗余，不能直接作为记忆存入数据库，以防提示词注入 (Prompt Injection) 或无用信息污染。",
    desc_en: "Raw conversation logs or action events between agent and user. They contain noise and cannot be saved directly to prevent prompt injection or cluttering.",
    tech: "FastAPI / SDK / Stream"
  },
  qwen: {
    title_zh: "2. Qwen 提取层 (Qwen Extractor)",
    title_en: "2. Qwen Extractor",
    desc_zh: "利用兼容的 Qwen 大模型，通过专门设计的 System Prompt 对交互文本进行结构化实体与规律提取。识别其是否包含“用户偏好”、“项目决策”或“已知坑点”，并输出置信度与事实陈述。",
    desc_en: "Utilizes the Qwen-compatible API with structured prompts to extract structured facts, types, and rationale, outputting candidate proposal payloads.",
    tech: "Qwen API / Responses API"
  },
  proposal: {
    title_zh: "3. 待审核提议库 (Proposals DB)",
    title_en: "3. Proposals DB",
    desc_zh: "提取出的记忆首先以 `pending` 状态的“建议 (Proposal)”持久化在 SQLite 中。它们是只读的证据状态，包含来源片段引用 (Source Quote) 和提取理由，在未经人类许可前，**不会**进入智能体检索召回范围。",
    desc_en: "Extracted proposals are stored in SQLite with a `pending` status. They remain in a buffer with source quotes and rationales, isolated from the agent's memory retrieval.",
    tech: "SQLite / SQLAlchemy"
  },
  review: {
    title_zh: "4. 人工自治校验阀 (Human Reviewer)",
    title_en: "4. Human Reviewer",
    desc_zh: "人类管理员（或通过审计流）对提案进行核对。在此阶段，可手动修正内容、设置到期时间，或挑选被替代的旧记忆（Supersession 冲突仲裁）。一旦审核通过，才升级为受信记忆。",
    desc_en: "Administrators or review workflows review proposals. Reviewers can approve, reject, configure expiration, or link conflict overrides. Only approved items become trusted memory.",
    tech: "Next.js Console / Admin CLI"
  },
  memory: {
    title_zh: "5. 受信活性记忆 (Active Memory)",
    title_en: "5. Active Memory",
    desc_zh: "审核通过的记忆记录，包含完整的溯源链条。活性状态的记忆会自动在 SQLite FTS5 引擎中创建全文检索索引，提供给智能体在会话中以极高效率召回，同时保留随时撤销 (Revoke) 的能力。",
    desc_en: "Approved records, linked to sources and audit events. Only active memories are exposed to the agent. They are indexed in FTS5 and can be revoked or expired dynamically.",
    tech: "SQLite FTS5 / Index"
  }
};

const API_TABS = {
  extract: {
    method: "POST",
    url: "/v1/proposals/extract",
    desc_zh: "输入原始会话，使用大模型提取记忆建议提案",
    desc_en: "Extract memory proposals from raw transcripts using LLM.",
    payload: {
      actor_id: "demo-user",
      project_id: "memorynode-demo",
      messages: [
        { role: "user", content: "I prefer coding in python." }
      ]
    },
    response: {
      source_id: "src_9a2b8e",
      proposals: [
        {
          id: "prop_4c8d",
          content: "User prefers coding in Python.",
          type: "user_preference",
          confidence: 0.95,
          source_quote: "I prefer coding in python.",
          reason: "User explicitly stated coding language preference."
        }
      ]
    },
    curl: `curl -X POST http://localhost:8000/v1/proposals/extract \\
  -H "Content-Type: application/json" \\
  -d '{
    "actor_id": "demo-user",
    "project_id": "memorynode-demo",
    "messages": [{"role": "user", "content": "I prefer coding in python."}]
  }'`,
    python: `import requests

url = "http://localhost:8000/v1/proposals/extract"
payload = {
    "actor_id": "demo-user",
    "project_id": "memorynode-demo",
    "messages": [{"role": "user", "content": "I prefer coding in python."}]
}
response = requests.post(url, json=payload)
print(response.json())`
  },
  approve: {
    method: "POST",
    url: "/v1/proposals/{id}/approve",
    desc_zh: "批准特定的记忆提案，使其升级为活性检索记忆，可关联冲突覆盖和生命周期",
    desc_en: "Approve a proposal to make it an active memory, optionally overriding conflicts.",
    payload: {
      actor_id: "reviewer",
      note: "Approved by administrator",
      supersede_memory_id: "mem_2b8c9e",
      expires_at: "2026-12-31T23:59:59Z"
    },
    response: {
      id: "mem_4c8d",
      content: "User prefers coding in Python.",
      type: "user_preference",
      status: "active",
      expires_at: "2026-12-31T23:59:59Z"
    },
    curl: `curl -X POST http://localhost:8000/v1/proposals/prop_4c8d/approve \\
  -H "Content-Type: application/json" \\
  -d '{
    "actor_id": "reviewer",
    "note": "Approved by administrator",
    "supersede_memory_id": null
  }'`,
    python: `import requests

url = "http://localhost:8000/v1/proposals/prop_4c8d/approve"
payload = {
    "actor_id": "reviewer",
    "note": "Approved by administrator",
    "supersede_memory_id": None
}
response = requests.post(url, json=payload)
print(response.json())`
  },
  search: {
    method: "GET",
    url: "/v1/memories/search?q={query}",
    desc_zh: "使用 FTS5 全文索引匹配已激活的活跃记忆体",
    desc_en: "Search active memories using SQLite FTS5 full-text index.",
    payload: null,
    response: {
      memories: [
        {
          id: "mem_4c8d",
          content: "User prefers coding in Python.",
          type: "user_preference",
          status: "active",
          score: 1.25
        }
      ]
    },
    curl: `curl -X GET "http://localhost:8000/v1/memories/search?q=Python"`,
    python: `import requests

url = "http://localhost:8000/v1/memories/search"
params = {"q": "Python"}
response = requests.get(url, params=params)
print(response.json())`
  },
  explain: {
    method: "GET",
    url: "/v1/memories/{id}/explain",
    desc_zh: "获取单条记忆的全部生命周期审计轨迹、引用出处与修改理由",
    desc_en: "Retrieve full audit logs, source quote reference, and rationale of a memory.",
    payload: null,
    response: {
      memory: {
        id: "mem_4c8d",
        content: "User prefers coding in Python.",
        status: "active"
      },
      source: {
        id: "src_9a2b8e",
        raw_text: "I prefer coding in python."
      },
      proposal: {
        id: "prop_4c8d",
        reason: "User explicitly stated coding language preference."
      },
      events: [
        {
          id: "evt_1a",
          event_type: "proposal_extracted",
          timestamp: "2026-07-13T17:21:00Z"
        },
        {
          id: "evt_2b",
          event_type: "approved",
          actor_id: "reviewer",
          timestamp: "2026-07-13T17:21:10Z"
        }
      ]
    },
    curl: `curl -X GET http://localhost:8000/v1/memories/mem_4c8d/explain`,
    python: `import requests

url = "http://localhost:8000/v1/memories/mem_4c8d/explain"
response = requests.get(url)
print(response.json())`
  }
};

export default function PortalPage() {
  const [language, setLanguage] = useState("zh");
  const [apiOnline, setApiOnline] = useState(false);
  const [checkingApi, setCheckingApi] = useState(true);
  
  // Playground State
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [transcriptInput, setTranscriptInput] = useState(PRESETS[0].transcript_zh);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [extracting, setExtracting] = useState(false);
  
  // Simulated or Active database
  const [proposals, setProposals] = useState([]);
  const [activeMemories, setActiveMemories] = useState([]);
  const [rejectedProposals, setRejectedProposals] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [auditMemory, setAuditMemory] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  
  // Navigation & Interactive views
  const [activeArchNode, setActiveArchNode] = useState("raw");
  const [activeApiTab, setActiveApiTab] = useState("extract");
  const [codeType, setCodeType] = useState("python"); // 'python' or 'curl'
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Sync preset transcript when language changes
  useEffect(() => {
    setTranscriptInput(
      language === "zh"
        ? PRESETS[selectedPresetIdx].transcript_zh
        : PRESETS[selectedPresetIdx].transcript_en
    );
  }, [language, selectedPresetIdx]);

  // Check API health on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        if (data.ok && data.service === "memorynode") {
          setApiOnline(true);
          addLog("SYSTEM", "Connected to local FastAPI backend service at " + BACKEND_URL);
          // Load active memories from backend
          fetchMemories();
        } else {
          setApiOnline(false);
          addLog("SYSTEM", "FastAPI Service responded but handshake mismatched. Operating in Local Simulation Mode.");
        }
      } catch (e) {
        setApiOnline(false);
        addLog("SYSTEM", "FastAPI backend offline. Running in Client-side Sandbox Simulation Mode.");
      } finally {
        setCheckingApi(false);
      }
    }
    checkHealth();
  }, []);

  async function fetchMemories() {
    try {
      const res = await fetch(`${BACKEND_URL}/v1/memories?status=active`);
      const data = await res.json();
      if (data.memories) {
        // Map backend memories
        setActiveMemories(data.memories);
      }
    } catch (err) {
      console.error("Error fetching memories:", err);
    }
  }

  const addLog = (sender, message) => {
    const time = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [...prev, `[${time}] [${sender}] ${message}`]);
  };

  const handleSelectPreset = (idx) => {
    setSelectedPresetIdx(idx);
    setTranscriptInput(language === "zh" ? PRESETS[idx].transcript_zh : PRESETS[idx].transcript_en);
    addLog("USER", `Selected Preset ${idx + 1}: ${language === 'zh' ? PRESETS[idx].title_zh : PRESETS[idx].title_en}`);
  };

  const handleExtract = async () => {
    if (!transcriptInput.trim()) return;
    setExtracting(true);
    setProposals([]);
    addLog("SYS", "Initializing memory proposal extraction flow...");
    
    if (apiOnline) {
      // Direct integration with FastAPI
      try {
        addLog("QWEN", "Streaming transcript to FastAPI Qwen extractor...");
        const res = await fetch(`${BACKEND_URL}/v1/proposals/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor_id: "portal-demo",
            project_id: "portal-demo",
            messages: [{ role: "user", content: transcriptInput }]
          })
        });
        
        if (!res.ok) {
          throw new Error("HTTP error " + res.status);
        }
        
        const data = await res.json();
        if (data.proposals && data.proposals.length > 0) {
          addLog("SYS", `Successfully extracted ${data.proposals.length} memory proposals from live backend!`);
          setProposals(data.proposals);
        } else {
          addLog("SYS", "Qwen finished analysis. No viable long-term memory candidates identified in this input.");
        }
      } catch (err) {
        addLog("ERROR", `Live extraction failed: ${err.message}. Falling back to Simulated local extraction.`);
        runMockExtraction();
      } finally {
        setExtracting(false);
      }
    } else {
      // Local simulation
      runMockExtraction();
    }
  };

  const runMockExtraction = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      if (progress === 25) {
        addLog("LLM", "Analyzing transcript context and stripping interaction noise...");
      } else if (progress === 50) {
        addLog("LLM", "Mapping sentences to memory dimensions (user_preference, fact, decisions)...");
      } else if (progress === 75) {
        addLog("LLM", "Generating source quotation quotes and factuality confidence metrics...");
      } else if (progress === 100) {
        clearInterval(interval);
        const presetProposals = PRESETS[selectedPresetIdx].mockProposals.map(p => ({
          ...p,
          id: "sim-prop-" + Math.floor(Math.random() * 100000),
          status: "pending"
        }));
        setProposals(presetProposals);
        addLog("SYS", `Simulated Extraction complete. Generated ${presetProposals.length} pending memory proposals.`);
        setExtracting(false);
      }
    }, 400);
  };

  const handleApprove = async (prop) => {
    addLog("REVIEW", `Approving proposal ID: ${prop.id}...`);
    
    if (apiOnline && prop.id.indexOf("sim-") !== 0) {
      try {
        const res = await fetch(`${BACKEND_URL}/v1/proposals/${encodeURIComponent(prop.id)}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor_id: "portal-reviewer",
            note: "Approved from Portal Landing Page"
          })
        });
        if (res.ok) {
          addLog("SYS", `Proposal successfully approved and committed to backend SQLite.`);
          fetchMemories();
          // Remove from pending proposals UI
          setProposals(prev => prev.filter(p => p.id !== prop.id));
        } else {
          throw new Error("HTTP error " + res.status);
        }
      } catch (err) {
        addLog("ERROR", `Approval API call failed: ${err.message}. Simulating local approval.`);
        simulateApproval(prop);
      }
    } else {
      simulateApproval(prop);
    }
  };

  const simulateApproval = (prop) => {
    // Check if duplicate in active list
    if (activeMemories.some(m => m.content === prop.content)) {
      addLog("WARNING", `Identical memory content already exists. Supersession override triggered.`);
    }
    
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
    addLog("SYS", `Memory state upgraded to ACTIVE. FTS5 index rebuilt.`);
  };

  const handleReject = async (prop) => {
    addLog("REVIEW", `Rejecting proposal ID: ${prop.id}...`);
    
    if (apiOnline && prop.id.indexOf("sim-") !== 0) {
      try {
        const res = await fetch(`${BACKEND_URL}/v1/proposals/${encodeURIComponent(prop.id)}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor_id: "portal-reviewer",
            note: "Rejected from Portal Landing Page"
          })
        });
        if (res.ok) {
          addLog("SYS", `Proposal successfully rejected in SQLite.`);
          setProposals(prev => prev.filter(p => p.id !== prop.id));
        } else {
          throw new Error("HTTP error " + res.status);
        }
      } catch (err) {
        addLog("ERROR", `Reject API call failed: ${err.message}. Simulating local rejection.`);
        simulateRejection(prop);
      }
    } else {
      simulateRejection(prop);
    }
  };

  const simulateRejection = (prop) => {
    setRejectedProposals(prev => [prop, ...prev]);
    setProposals(prev => prev.filter(p => p.id !== prop.id));
    addLog("SYS", `Proposal marked as REJECTED. Archived in audit timeline.`);
  };

  const handleRevoke = async (memory) => {
    addLog("REVIEW", `Revoking active memory ID: ${memory.id}...`);
    
    if (apiOnline && memory.id.indexOf("mem-") !== 0) {
      try {
        const res = await fetch(`${BACKEND_URL}/v1/memories/${encodeURIComponent(memory.id)}/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor_id: "portal-reviewer",
            note: "Revoked from Portal Landing Page"
          })
        });
        if (res.ok) {
          addLog("SYS", `Memory successfully revoked. Removed from FTS5 recall library.`);
          fetchMemories();
          if (auditMemory && auditMemory.id === memory.id) {
            triggerExplain(memory);
          }
        } else {
          throw new Error("HTTP error " + res.status);
        }
      } catch (err) {
        addLog("ERROR", `Revocation API call failed: ${err.message}. Simulating local revocation.`);
        simulateRevocation(memory);
      }
    } else {
      simulateRevocation(memory);
    }
  };

  const simulateRevocation = (memory) => {
    setActiveMemories(prev => prev.map(m => m.id === memory.id ? { ...m, status: "revoked" } : m));
    addLog("SYS", `Memory ID ${memory.id} revoked. Removed from recall. Stored permanently in audit log.`);
    if (auditMemory && auditMemory.id === memory.id) {
      setAuditMemory(prev => ({ ...prev, status: "revoked" }));
      setAuditEvents(prev => [
        ...prev,
        {
          id: "evt-revoke-" + Math.floor(Math.random() * 1000),
          event_type: "revoked",
          actor_id: "portal-reviewer",
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

  const triggerExplain = async (memory) => {
    setAuditMemory(memory);
    addLog("SYS", `Loading audit logs & source details for memory: ${memory.id}`);
    
    if (apiOnline && memory.id.indexOf("mem-") !== 0) {
      try {
        const res = await fetch(`${BACKEND_URL}/v1/memories/${encodeURIComponent(memory.id)}/explain`);
        const data = await res.json();
        if (data.events) {
          setAuditEvents(data.events);
          return;
        }
      } catch (err) {
        console.error("Fetch explain failed:", err);
      }
    }
    
    // Fallback/Simulate explain events
    const timeline = [
      {
        id: "evt-1",
        event_type: "proposal_extracted",
        actor_id: "qwen-llm",
        timestamp: memory.created_at || new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "evt-2",
        event_type: "approved",
        actor_id: "portal-reviewer",
        timestamp: memory.created_at || new Date(Date.now() - 3500000).toISOString()
      }
    ];
    if (memory.status === "revoked") {
      timeline.push({
        id: "evt-3",
        event_type: "revoked",
        actor_id: "portal-reviewer",
        timestamp: new Date().toISOString()
      });
    }
    setAuditEvents(timeline);
  };

  // Filter memories based on search query
  const filteredMemories = activeMemories.filter(m => {
    const zhMatch = m.content_zh && m.content_zh.toLowerCase().includes(searchQuery.toLowerCase());
    const enMatch = m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase());
    return zhMatch || enMatch;
  });

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Helper translation dictionary
  const t = (zh, en) => (language === "zh" ? zh : en);

  const getMemoryTypeLabel = (type) => {
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
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Grids */}
      <div className="grid-overlay"></div>
      <div className="radial-glow" style={{ top: "-100px", left: "-100px" }}></div>
      <div className="radial-glow-cyan" style={{ top: "400px", right: "-100px" }}></div>

      {/* Header Navbar */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-[#1b1b1b]">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse"></span>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-[#888] bg-clip-text text-transparent">
            MemoryNode
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#a3a3a3]">
          <a href="#playground" className="hover:text-white transition-colors">{t("交互沙盒", "Playground")}</a>
          <a href="#architecture" className="hover:text-white transition-colors">{t("核心架构", "Architecture")}</a>
          <a href="#api" className="hover:text-white transition-colors">{t("API 接口", "API Explorer")}</a>
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            className="text-xs px-3 py-1.5 rounded border border-[#262626] bg-[#111] hover:bg-[#1a1a1a] transition-all text-[#a3a3a3] hover:text-white"
          >
            {language === "zh" ? "EN  English" : "中  中文"}
          </button>
          
          <Link 
            href="http://localhost:3000/proposals" 
            target="_blank"
            className="btn btn-primary text-xs py-2 px-4"
          >
            {t("进入控制台", "Launch Dashboard")}
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        {/* API Connection Indicator */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#111] border border-[#222] text-xs font-semibold mb-6">
          <span className={`pulse-dot ${apiOnline ? 'online' : 'offline'}`}></span>
          <span className="text-[#a3a3a3]">
            {checkingApi 
              ? t("检查后端连接...", "Checking backend status...") 
              : (apiOnline 
                  ? t("FastAPI 服务：已连接 (本地数据库)", "FastAPI backend: Connected (Local DB)") 
                  : t("FastAPI 服务：离线 (模拟运行中)", "FastAPI backend: Offline (Simulation Mode)"))
            }
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1] mb-6">
          {t("让 AI 智能体拥有受管制的自治记忆", "Governed Memory Layer for AI Agents")}
        </h1>
        <p className="text-[#a3a3a3] text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          {t(
            "拒绝盲目写入与黑盒记忆。MemoryNode 将原始对话日志转化为经过人类审核、出处可循、可随时撤销与覆盖的透明记忆审计流。",
            "Turn raw agent interactions into human-reviewed, searchable, explainable, and revocable memories—backed by source evidence and a complete audit trail."
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <a href="#playground" className="btn btn-primary w-full sm:w-auto text-base py-3 px-8">
            {t("开启互动演练", "Try Live Simulator")}
          </a>
          <Link href="http://localhost:3000/memories" target="_blank" className="btn btn-secondary w-full sm:w-auto text-base py-3 px-8">
            {t("查看现有记忆库", "Browse Current Library")}
          </Link>
        </div>

        {/* Hero Features Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto text-left">
          <div className="p-5 rounded-xl border border-[#222] bg-[#0c0c0c]/80 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">{t("证据前置", "Evidence First")}</h3>
            <p className="text-xs text-[#a3a3a3] leading-relaxed">{t("原始日志仅生成待审提议，未经人工批准绝不进入记忆召回。", "Extractions create isolated proposals, never trusted knowledge before review.")}</p>
          </div>
          <div className="p-5 rounded-xl border border-[#222] bg-[#0c0c0c]/80 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">{t("溯源审计", "Audit Trail")}</h3>
            <p className="text-xs text-[#a3a3a3] leading-relaxed">{t("记忆始终绑定原文引用与提取 rationale，全生命周期记录审计日志。", "Every memory remains linked to source quotes, decisions, and lifecycles.")}</p>
          </div>
          <div className="p-5 rounded-xl border border-[#222] bg-[#0c0c0c]/80 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">{t("冲突覆盖", "Supersession")}</h3>
            <p className="text-xs text-[#a3a3a3] leading-relaxed">{t("支持手动指定替代旧记忆，自动关联旧版本审计状态，消除冲突。", "Reviewer explicitly selects older active memories to replace, avoiding automatic arbitration.")}</p>
          </div>
          <div className="p-5 rounded-xl border border-[#222] bg-[#0c0c0c]/80 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">{t("检索速度", "FTS5 Indexed")}</h3>
            <p className="text-xs text-[#a3a3a3] leading-relaxed">{t("基于 SQLite FTS5 本地全文索引匹配，亚毫秒级响应，开箱即用。", "Powered by SQLite FTS5 for local keyword search, sub-millisecond query responses.")}</p>
          </div>
        </div>
      </main>

      {/* Simulator Section */}
      <section id="playground" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-[#1b1b1b]">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-4">{t("记忆生命周期交互演练沙盒", "Interactive Memory Lifecycle Sandbox")}</h2>
          <p className="text-[#a3a3a3] text-sm sm:text-base max-w-2xl mx-auto">
            {t("在下方输入一段对话记录（或选择预设模板），体验从提取、审核、激活检索到一键撤销的完整记忆治理流。", "Input a conversation transcript below (or choose a preset) to experience the full governed memory lifecycle.")}
          </p>
        </div>

        {/* Step 1: Input & Presets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="glow-card">
              <div className="flex items-center gap-3 mb-4">
                <span className="step-badge">1</span>
                <h3 className="text-base font-bold text-white">{t("第一步：原始交互输入", "Step 1: Raw Interaction Input")}</h3>
              </div>

              <textarea 
                value={transcriptInput}
                onChange={(e) => setTranscriptInput(e.target.value)}
                className="playground-input"
                placeholder={t("请输入原始交互日志...", "Enter raw chat transcript...")}
              />

              <div className="mt-4">
                <span className="text-xs text-[#a3a3a3] font-semibold">{t("推荐预设模版：", "Or try a template preset:")}</span>
                <div className="preset-grid">
                  {PRESETS.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPreset(i)}
                      className={`preset-card text-left ${selectedPresetIdx === i ? 'active' : ''}`}
                    >
                      <div className="font-semibold text-white mb-1 truncate">
                        {language === "zh" ? p.title_zh : p.title_en}
                      </div>
                      <div className="line-clamp-2 opacity-75">
                        {language === "zh" ? p.transcript_zh : p.transcript_en}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <div className="text-xs text-[#666]">
                  {apiOnline 
                    ? t("通过大模型连接提取 (Qwen)", "Real extraction via LLM (Qwen)") 
                    : t("使用前端沙盒仿真机制", "Using client-side sandbox simulation")}
                </div>
                <button
                  onClick={handleExtract}
                  disabled={extracting || !transcriptInput.trim()}
                  className="btn btn-primary"
                >
                  {extracting ? t("提取分析中...", "Extracting...") : t("运行记忆提取 (Extract)", "Run Extraction")}
                </button>
              </div>
            </div>

            {/* Step 2: Extracted Proposals */}
            <div className="glow-card">
              <div className="flex items-center gap-3 mb-4">
                <span className="step-badge">2</span>
                <h3 className="text-base font-bold text-white">
                  {t("第二步：待审核记忆提议", "Step 2: Extracted Memory Proposals")}
                </h3>
                {proposals.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                    {proposals.length}
                  </span>
                )}
              </div>

              {proposals.length === 0 ? (
                <div className="py-12 text-center text-[#666] text-sm border border-dashed border-[#222] rounded-lg">
                  {extracting 
                    ? t("AI 正在提取提议，请查看右侧终端日志...", "LLM is analyzing the text, check the terminal on the right...") 
                    : t("等待提取操作。提取结果将在此处缓冲...", "Waiting for extraction. Suggested proposals will buffer here...")}
                </div>
              ) : (
                <div className="space-y-4">
                  {proposals.map((prop) => (
                    <div key={prop.id} className="p-4 rounded-lg bg-[#0a0a0a] border border-[#222] flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`badge badge-${prop.type}`}>
                            {getMemoryTypeLabel(prop.type)}
                          </span>
                          <span className="text-xs text-[#a3a3a3]">
                            {t("置信度", "Confidence")}: {(prop.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white leading-relaxed">
                          {language === "zh" ? prop.content_zh || prop.content : prop.content}
                        </p>
                        <div className="text-xs text-[#a3a3a3] border-l-2 border-white/20 pl-3 py-0.5">
                          <span className="font-semibold text-white">{t("原文引用", "Source Quote")}:</span> "
                          {language === "zh" ? prop.source_quote_zh || prop.source_quote : prop.source_quote}
                          "
                        </div>
                        <div className="text-xs text-[#666]">
                          <span className="font-semibold">{t("提取理由", "Rationale")}:</span>{" "}
                          {language === "zh" ? prop.reason_zh || prop.reason : prop.reason}
                        </div>
                      </div>
                      
                      <div className="flex md:flex-col justify-end gap-2.5 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => handleReject(prop)}
                          className="btn btn-secondary text-xs px-3 py-1.5"
                        >
                          {t("拒绝 (Reject)", "Reject")}
                        </button>
                        <button
                          onClick={() => handleApprove(prop)}
                          className="btn btn-primary text-xs px-3 py-1.5"
                        >
                          {t("批准 (Approve)", "Approve")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar: Terminal & Audit */}
          <div className="space-y-6">
            {/* Simulation Terminal */}
            <div className="terminal-frame">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span className="terminal-dot red"></span>
                  <span className="terminal-dot yellow"></span>
                  <span className="terminal-dot green"></span>
                </div>
                <div className="terminal-title">{t("治理流运行终端", "Governance Console")}</div>
                <div></div>
              </div>
              <div className="terminal-body font-mono text-xs max-h-60 overflow-y-auto space-y-1">
                {terminalLogs.length === 0 ? (
                  <div className="text-[#555]">{t("等待操作输入以生成跟踪日志...", "Console logs will stream here...")}</div>
                ) : (
                  terminalLogs.map((log, index) => (
                    <div key={index} className="break-all whitespace-pre-wrap">{log}</div>
                  ))
                )}
              </div>
            </div>

            {/* Active memories list */}
            <div className="glow-card">
              <div className="flex items-center gap-3 mb-4">
                <span className="step-badge">3</span>
                <h3 className="text-base font-bold text-white">
                  {t("第三步：检索活跃记忆", "Step 3: Search Active Memories")}
                </h3>
              </div>

              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("输入关键词全文检索 (FTS5)...", "Search memories (SQLite FTS5)...")}
                className="w-full text-sm bg-[#090909] border border-[#222] rounded-lg p-2.5 text-white mb-4 placeholder-[#555] focus:outline-none focus:border-white"
              />

              {filteredMemories.length === 0 ? (
                <div className="py-8 text-center text-[#666] text-xs border border-dashed border-[#222] rounded-lg">
                  {activeMemories.length === 0 
                    ? t("暂无激活的记忆体，请在左侧批准一些提取提议。", "No active memories. Approve proposals to index them.")
                    : t("未匹配到相关的搜索记录。", "No matching memories found.")}
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {filteredMemories.map((m) => (
                    <div 
                      key={m.id} 
                      onClick={() => triggerExplain(m)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        auditMemory && auditMemory.id === m.id 
                          ? 'bg-[#181818] border-[#888]' 
                          : 'bg-[#0a0a0a] border-[#222] hover:border-[#444]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`badge badge-${m.type} text-[9px] px-1.5 py-0.5`}>
                          {getMemoryTypeLabel(m.type)}
                        </span>
                        {m.status === "revoked" ? (
                          <span className="text-[10px] text-red-500 font-bold uppercase">{t("已废弃", "REVOKED")}</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevoke(m);
                            }}
                            className="text-[10px] text-[#888] hover:text-red-500 font-semibold"
                          >
                            {t("撤销 (Revoke)", "Revoke")}
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-white leading-normal line-clamp-2">
                        {language === "zh" ? m.content_zh || m.content : m.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit log tracer */}
            {auditMemory && (
              <div className="glow-card border-white/20 bg-[#0f0f0f]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  {t("记忆全生命周期审计 (Explain)", "Memory Lifecycle Explanation")}
                </h4>
                
                <div className="space-y-2 mb-4">
                  <div className="text-[11px] text-[#a3a3a3]">
                    <span className="font-bold text-white">ID:</span> {auditMemory.id}
                  </div>
                  <div className="text-[11px] text-[#a3a3a3]">
                    <span className="font-bold text-white">{t("存储实体", "Fact Statement")}:</span>{" "}
                    {language === "zh" ? auditMemory.content_zh || auditMemory.content : auditMemory.content}
                  </div>
                  <div className="text-[11px] text-[#a3a3a3]">
                    <span className="font-bold text-white">{t("出处原文", "Evidence Quote")}:</span> "
                    {language === "zh" ? auditMemory.source_quote_zh || auditMemory.source_quote : auditMemory.source_quote}
                    "
                  </div>
                </div>

                <div className="border-t border-[#222] pt-3">
                  <h5 className="text-[10px] font-bold text-[#666] uppercase mb-2">{t("溯源审计时间线", "Audit Event Timeline")}</h5>
                  <div className="space-y-2">
                    {auditEvents.map((evt) => (
                      <div key={evt.id} className="timeline-item">
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-bold text-white text-[11px]">
                            {evt.event_type === "proposal_extracted" ? t("系统大模型提取", "Proposal Extracted") : ""}
                            {evt.event_type === "approved" ? t("人工确认保存", "Approved by human") : ""}
                            {evt.event_type === "revoked" ? t("人工指令废除", "Revoked by human") : ""}
                          </span>
                          <span className="text-[9px] text-[#666]">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#a3a3a3]">
                          {t("处理主体", "Actor")}: {evt.actor_id || "system"}
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
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-[#1b1b1b]">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-4">{t("传统记忆与受信自治记忆对比", "Unchecked Memory vs Governed Memory")}</h2>
          <p className="text-[#a3a3a3] text-sm sm:text-base max-w-2xl mx-auto">
            {t("为什么智能体长短期记忆需要经过显式治理？", "Why agent long-term memory must be treated as an explicit governance decision.")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Unchecked */}
          <div className="p-8 rounded-xl border border-red-500/10 bg-[#0f0a0a]/50 text-left">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-6">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-4">{t("传统智能体记忆 (Unchecked)", "Traditional Agent Memory")}</h3>
            <ul className="space-y-3.5 text-sm text-[#a3a3a3]">
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-bold mt-0.5">✕</span>
                <span>{t("静默写入副作用：大模型在后台默默提取，用户不感知存了什么。", "Silent side-effects: agent writes memory in the background without user visibility.")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-bold mt-0.5">✕</span>
                <span>{t("容易受注入毒化：不可靠的信息或恶意注入，会永久留在数据库中影响后续交互。", "Vulnerable to poisoning: malicious prompt injection is saved permanently.")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-bold mt-0.5">✕</span>
                <span>{t("黑盒无法溯源：检索出的上下文不知道从哪来的，无法解释，无法审计。", "Black-box recall: retrieved facts lack provenance context, making audits impossible.")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-bold mt-0.5">✕</span>
                <span>{t("历史纠缠不清：当存在更新的规则或偏好时，旧规则依然在起效，引发冲突。", "State entanglements: outdated rules or preferences persist, causing semantic bugs.")}</span>
              </li>
            </ul>
          </div>

          {/* Governed */}
          <div className="p-8 rounded-xl border border-white/10 bg-[#0c0c0c] text-left">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-4">{t("MemoryNode 受管记忆 (Governed)", "MemoryNode Governed Memory")}</h3>
            <ul className="space-y-3.5 text-sm text-[#a3a3a3]">
              <li className="flex items-start gap-2.5">
                <span className="text-white font-bold mt-0.5">✓</span>
                <span>{t("缓冲审核放行：提取生成未决提议（Proposal），必须经人类核准才生效。", "Explicit buffer logic: suggestions remain pending until human approval.")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-white font-bold mt-0.5">✓</span>
                <span>{t("严格事实溯源：记忆关联 Source Quote，明晰记录谁提取的，谁批准的。", "Strict fact linkage: memories are tied to original text source quotes and rationales.")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-white font-bold mt-0.5">✓</span>
                <span>{t("手动冲突覆写：关联 supersede_memory_id 即可撤销旧记忆，自动变更事件链。", "Conflict overrides: linking supersede_memory_id automatically revokes previous state.")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-white font-bold mt-0.5">✓</span>
                <span>{t("可追溯的撤销：Revoke 记忆不丢失历史数据，但即刻移出 FTS5 活跃检索库。", "Auditable revocation: revoked status deletes recall indexing while preserving audit trails.")}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Interactive Architecture visualizer */}
      <section id="architecture" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-[#1b1b1b]">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-4">{t("系统架构数据流看板", "MemoryNode Dynamic Architecture Flow")}</h2>
          <p className="text-[#a3a3a3] text-sm sm:text-base max-w-2xl mx-auto">
            {t("鼠标悬停或点击下方任意节点，了解该阶段的技术实现细节与设计意义。", "Hover or click on any node to view structural parameters and safety design values.")}
          </p>
        </div>

        <div className="arch-container">
          <div className="arch-visualizer">
            {/* Row 1 */}
            <div className="arch-row">
              <div 
                className={`arch-node ${activeArchNode === 'raw' ? 'active' : ''}`}
                onMouseEnter={() => setActiveArchNode('raw')}
              >
                <div className="arch-node-title">{t("原始对话交互", "Raw Interaction")}</div>
                <div className="arch-node-tech">Chat Logs / Events</div>
              </div>
            </div>

            <div className={`arch-arrow-down ${activeArchNode === 'qwen' ? 'active' : ''}`}></div>

            {/* Row 2 */}
            <div className="arch-row">
              <div 
                className={`arch-node ${activeArchNode === 'qwen' ? 'active' : ''}`}
                onMouseEnter={() => setActiveArchNode('qwen')}
              >
                <div className="arch-node-title">{t("Qwen 提取分析", "Qwen Extractor")}</div>
                <div className="arch-node-tech">LLM JSON Extract</div>
              </div>
            </div>

            <div className={`arch-arrow-down ${activeArchNode === 'proposal' ? 'active' : ''}`}></div>

            {/* Row 3 */}
            <div className="arch-row">
              <div 
                className={`arch-node ${activeArchNode === 'proposal' ? 'active' : ''}`}
                onMouseEnter={() => setActiveArchNode('proposal')}
              >
                <div className="arch-node-title">{t("待审核提议库", "Proposals DB")}</div>
                <div className="arch-node-tech">SQLite Pending</div>
              </div>
            </div>

            <div className={`arch-arrow-down ${activeArchNode === 'review' ? 'active' : ''}`}></div>

            {/* Row 4 */}
            <div className="arch-row">
              <div 
                className={`arch-node ${activeArchNode === 'review' ? 'active' : ''}`}
                onMouseEnter={() => setActiveArchNode('review')}
              >
                <div className="arch-node-title">{t("人工控制阀", "Human Review")}</div>
                <div className="arch-node-tech">Approval Control</div>
              </div>
            </div>

            <div className={`arch-arrow-down ${activeArchNode === 'memory' ? 'active' : ''}`}></div>

            {/* Row 5 */}
            <div className="arch-row">
              <div 
                className={`arch-node ${activeArchNode === 'memory' ? 'active' : ''}`}
                onMouseEnter={() => setActiveArchNode('memory')}
              >
                <div className="arch-node-title">{t("受信活性记忆体", "Active Memory")}</div>
                <div className="arch-node-tech">SQLite FTS5 Match</div>
              </div>
            </div>
          </div>

          {/* Details Pane */}
          <div className="glow-card flex flex-col justify-between arch-detail-card min-h-[400px]">
            <div>
              <div className="text-[10px] font-bold text-white uppercase tracking-wider mb-4">
                {t("系统节点分析", "Node Diagnostic Information")}
              </div>
              <h3 className="text-lg font-bold text-white mb-3">
                {language === "zh" ? ARCH_NODES[activeArchNode].title_zh : ARCH_NODES[activeArchNode].title_en}
              </h3>
              <p className="text-sm text-[#a3a3a3] leading-relaxed mb-6">
                {language === "zh" ? ARCH_NODES[activeArchNode].desc_zh : ARCH_NODES[activeArchNode].desc_en}
              </p>
            </div>
            
            <div className="border-t border-[#222] pt-4">
              <div className="text-[10px] font-bold text-[#666] uppercase mb-1">{t("关联技术栈/依赖", "Underlying dependency")}</div>
              <div className="font-mono text-xs text-white">{ARCH_NODES[activeArchNode].tech}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer API Explorer */}
      <section id="api" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-[#1b1b1b]">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-4">{t("开发者 API 资源浏览器", "Developer API Explorer")}</h2>
          <p className="text-[#a3a3a3] text-sm sm:text-base max-w-2xl mx-auto">
            {t("MemoryNode 拥有精简优雅的后端接口规范，支持 SDK、cURL 或命令行。以下是核心生命周期接口概览。", "Explore HTTP contracts, SDK, and curl endpoints. MemoryNode keeps the lifecycle API clean.")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left menu */}
          <div className="glow-card p-4 space-y-1">
            <div className="text-[10px] font-bold text-[#666] uppercase px-3 mb-2">{t("后端服务路径", "HTTP Endpoints")}</div>
            {Object.keys(API_TABS).map((key) => (
              <button
                key={key}
                onClick={() => setActiveApiTab(key)}
                className={`w-full flex items-center justify-between text-left p-3 rounded-lg text-sm font-semibold transition-all ${
                  activeApiTab === key 
                    ? 'bg-[#181818] text-white border-l-2 border-white pl-4' 
                    : 'text-[#a3a3a3] hover:bg-[#0c0c0c] hover:text-white pl-3'
                }`}
              >
                <div>
                  <span className={`text-[10px] font-bold mr-2 ${
                    API_TABS[key].method === 'POST' ? 'text-emerald-400' : 'text-blue-400'
                  }`}>
                    {API_TABS[key].method}
                  </span>
                  <span>{API_TABS[key].url}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Right payload viewer */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glow-card">
              <div className="flex justify-between items-center border-b border-[#222] pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    {API_TABS[activeApiTab].method} {API_TABS[activeApiTab].url}
                  </h3>
                  <p className="text-xs text-[#a3a3a3]">
                    {language === "zh" ? API_TABS[activeApiTab].desc_zh : API_TABS[activeApiTab].desc_en}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCodeType("python")} 
                    className={`text-xs px-2.5 py-1 rounded ${
                      codeType === 'python' ? 'bg-white/10 text-white font-bold' : 'text-[#666]'
                    }`}
                  >
                    Python
                  </button>
                  <button 
                    onClick={() => setCodeType("curl")} 
                    className={`text-xs px-2.5 py-1 rounded ${
                      codeType === 'curl' ? 'bg-white/10 text-white font-bold' : 'text-[#666]'
                    }`}
                  >
                    cURL
                  </button>
                </div>
              </div>

              {/* Code Snippet */}
              <div className="terminal-frame mb-6">
                <div className="terminal-header py-2 px-4 border-b border-[#222] bg-[#0c0c0c] flex justify-between items-center">
                  <span className="text-[10px] text-[#666] font-mono">
                    {codeType === 'python' ? 'main.py' : 'terminal'}
                  </span>
                  <button 
                    onClick={() => handleCopyCode(codeType === 'python' ? API_TABS[activeApiTab].python : API_TABS[activeApiTab].curl)}
                    className="text-[10px] text-[#a3a3a3] hover:text-white transition-colors"
                  >
                    {copyFeedback ? t("已复制!", "Copied!") : t("复制代码", "Copy")}
                  </button>
                </div>
                <div className="terminal-body p-4 overflow-x-auto font-mono text-[12px] bg-[#070707] text-[#c9c9c9] min-h-0">
                  <pre className="whitespace-pre">{codeType === 'python' ? API_TABS[activeApiTab].python : API_TABS[activeApiTab].curl}</pre>
                </div>
              </div>

              {/* Payload details */}
              {API_TABS[activeApiTab].payload && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{t("请求参数 (JSON Body)", "Request Payload")}</h4>
                  <div className="terminal-frame bg-[#070707] border-[#222]">
                    <div className="terminal-body p-4 text-[12px] min-h-0">
                      <pre className="text-sky-400">{JSON.stringify(API_TABS[activeApiTab].payload, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{t("响应载荷 (Response Preview)", "Response Preview")}</h4>
                <div className="terminal-frame bg-[#070707] border-[#222]">
                  <div className="terminal-body p-4 text-[12px] min-h-0">
                    <pre className="text-emerald-400">{JSON.stringify(API_TABS[activeApiTab].response, null, 2)}</pre>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1b1b1b] bg-[#090909]/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6 text-[#666] text-xs">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[#444] rounded-full"></span>
            <span>MemoryNode: Governed memory layer for AI agents</span>
          </div>
          
          <div className="flex items-center gap-8">
            <a href="https://github.com/unnoderes/MemoryNode" target="_blank" className="hover:text-white transition-colors">GitHub</a>
            <span>Apache 2.0 / MIT License</span>
          </div>

          <div>
            <span>© 2026 MemoryNode Project. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
