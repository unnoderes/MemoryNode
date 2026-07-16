import React from 'react';
import './Capabilities.css';

const capabilities = [
  { 
    label: '01', 
    name: '提案提取 / 手动提案', 
    desc: 'Qwen-compatible 自动提取，将原始对话片段、提取类别、置信度分数与推导理由合并构造成 pending proposal，也完全支持手动录入。', 
    tech: 'Proposal',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )
  },
  { 
    label: '02', 
    name: '人工审核 (Human-in-the-Loop)', 
    desc: '系统默认通过可信边界阻断直写。提取内容必须由审核者显式批准后创建 active memory，才能进入默认检索。',
    tech: 'Review',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="m9 12 2 2 4-4"></path>
      </svg>
    )
  },
  { 
    label: '03', 
    name: '可信检索 (Trusted Query)', 
    desc: '底层基于本地 SQLite FTS5 全文索引构建默认搜索图层，只允许召回有效态（Active）的可信记忆，防止脏数据干扰模型生成。', 
    tech: 'SQLite FTS5',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    )
  },
  { 
    label: '04', 
    name: '可解释性 (Traceability)', 
    desc: '开箱即用的解释查询接口（Explain），深度绑定记忆的主体、原始提案、发生来源，以及所有决策阶段的关联审计变更。', 
    tech: 'Evidence',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    )
  },
  { 
    label: '05', 
    name: '撤销、过期与替代', 
    desc: '精细化的生命周期操纵，支持安全撤销（Revoke）、请求驱动的动态过期（Expire）以及人机核定的记忆受控替代（Supersede）。', 
    tech: 'Lifecycle',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
      </svg>
    )
  },
  { 
    label: '06', 
    name: '本地 MCP + CLI 分发', 
    desc: '安装运行时提供 stdio MCP、Bearer Token 保护的本地 HTTP MCP、命令行管理终端（CLI）与预置静态治理面板；模型密钥不写入 MCP 配置。',
    tech: 'Local tools',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5"></polyline>
        <line x1="12" y1="19" x2="20" y2="19"></line>
      </svg>
    )
  },
];

export default function Capabilities() {
  return (
    <section className="caps-section" id="capabilities">
      <div className="container">
        <h2 className="caps-title animate-fade-in">发布版核心能力矩阵</h2>
        <p className="caps-subtitle animate-fade-in">MemoryNode 专注于一个可验证、可审计的本地闭环：让 AI 记忆先被治理，再被使用。</p>
        <div className="caps-grid">
          {capabilities.map((cap) => (
            <article key={cap.label} className="glass-card cap-card animate-fade-in">
              <span className="cap-badge">{cap.tech}</span>
              <div className="cap-icon-box">
                {cap.icon}
              </div>
              <h3 className="cap-name">{cap.name}</h3>
              <p className="cap-desc">{cap.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
