import React from 'react';
import './Capabilities.css';

const capabilities = [
  { label: '01', name: '提案提取 / 手动提案', desc: 'Qwen-compatible 提取将原始交互转为带来源片段、类型、置信度和理由的 pending proposal；也可手动创建提案。', tech: 'Proposal' },
  { label: '02', name: '人工审核', desc: '审核者显式批准或拒绝。批准才创建 active memory，Agent 默认不能绕过这个步骤。', tech: 'Review' },
  { label: '03', name: '可信检索', desc: 'SQLite FTS5 是本地默认搜索层。默认结果只包含当前有效的已批准记忆。', tech: 'SQLite FTS5' },
  { label: '04', name: '可解释性', desc: '解释接口连接记忆、提案、来源、审核决定、关系和审计事件，说明它为何可用或不可用。', tech: 'Evidence' },
  { label: '05', name: '撤销、到期与替代', desc: '撤销、请求驱动的到期和审核者选择的 supersession 均会退出默认检索，并保留审计历史。', tech: 'Lifecycle' },
  { label: '06', name: '本地 MCP + CLI 分发', desc: '0.8.0 Python 包含 SDK、CLI、stdio MCP、受 bearer token 保护的本地 HTTP MCP、后端和治理控制台。', tech: 'Local tools' },
];

export default function Capabilities() {
  return <section className="caps-section" id="capabilities"><div className="container">
    <h2 className="caps-title animate-fade-in">发布版可做什么</h2>
    <p className="caps-subtitle animate-fade-in">MemoryNode 0.8.0 专注于一个可验证的本地闭环：让记忆先被治理，再被使用。</p>
    <div className="caps-grid">{capabilities.map((cap) => <article key={cap.label} className="glass-card cap-card animate-fade-in"><span className="cap-badge">{cap.tech}</span><div className="cap-icon">{cap.label}</div><h3 className="cap-name">{cap.name}</h3><p className="cap-desc">{cap.desc}</p></article>)}</div>
  </div></section>;
}
