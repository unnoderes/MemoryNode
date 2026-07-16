import React from 'react';
import './ProblemContrast.css';

const opaqueRisks = [
  ['默认写入', '模型提取到的内容直接变成长期事实，用户很难知道它为何存在。'],
  ['缺少证据', '没有来源片段、提取理由和状态变化，记忆难以核验。'],
  ['难以纠正', '错误、过期或不再适用的信息可能继续影响后续回答。'],
  ['没有审计', '修改、替代和撤销后的依据无法被清楚追溯。'],
];

const governedBenefits = [
  ['提案先行', '提取只创建带来源证据和理由的 pending proposal，不直接创建可信记忆。'],
  ['人工决定', '审核者显式批准或拒绝提案；批准后才产生 active memory。'],
  ['可信检索', 'SQLite FTS5 默认只检索当前有效的已批准记忆。'],
  ['可撤销可审计', '撤销、到期和受控替代会退出默认检索，同时保留可解释的事件历史。'],
];

export default function ProblemContrast() {
  return (
    <section className="contrast-section" id="why">
      <div className="container">
        <h2 className="contrast-title animate-fade-in">为什么 Agent 记忆需要治理？</h2>
        <p className="contrast-subtitle animate-fade-in">
          MemoryNode 不把记忆当作黑箱副作用，而是将其变成可审查、可解释、可纠正的生命周期决策。
        </p>
        <div className="format-badge-container animate-fade-in">
          <span className="format-tag">Python package</span>
          <span className="format-tag">FastAPI /v1</span>
          <span className="format-tag">SQLite / FTS5</span>
          <span className="format-tag">MCP</span>
          <span className="format-tag">本地治理控制台</span>
        </div>
        <div className="contrast-grid">
          <article className="glass-card contrast-card contrast-card-danger animate-fade-in">
            <div className="contrast-card-header">
              <span className="contrast-header-dot danger-dot"></span>
              <span>黑箱记忆 (Black-box Memory)</span>
            </div>
            
            <div className="mock-terminal danger-terminal">
              <div className="terminal-bar"><span>unmanaged_memory.log</span></div>
              <pre className="terminal-code">
                <code>{`[FATAL_INJECTION] Writing raw text directly
> "Project must use Qwen Cloud..."
Saved key: "project_setting" -> "qwen"
[WARN] Origin source context deleted.
[WARN] 0 audit logs created.`}</code>
              </pre>
            </div>

            <ul className="contrast-list">
              {opaqueRisks.map(([title, desc]) => (
                <li className="contrast-item" key={title}>
                  <span className="item-bullet danger-bullet">—</span>
                  <div>
                    <div className="item-title">{title}</div>
                    <div className="item-desc">{desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="glass-card contrast-card contrast-card-success animate-fade-in">
            <div className="contrast-card-header">
              <span className="contrast-header-dot success-dot"></span>
              <span>治理记忆 (Governed Memory)</span>
            </div>

            <div className="mock-terminal success-terminal">
              <div className="terminal-bar"><span>memory_proposal.json</span></div>
              <pre className="terminal-code">
                <code>{`{
  "id": "proposal_99",
  "status": "pending_approval",
  "source_quote": "This project must use Qwen...",
  "confidence": 0.94,
  "audit_trail": [{ "event": "extracted", "by": "FastAPI/v1" }]
}`}</code>
              </pre>
            </div>

            <ul className="contrast-list">
              {governedBenefits.map(([title, desc]) => (
                <li className="contrast-item" key={title}>
                  <span className="item-bullet success-bullet">+</span>
                  <div>
                    <div className="item-title">{title}</div>
                    <div className="item-desc">{desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
