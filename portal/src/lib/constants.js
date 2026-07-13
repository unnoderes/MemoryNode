export const PRESETS = [
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

export const ARCH_STEPS = {
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

export const DEV_API_DATA = {
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
