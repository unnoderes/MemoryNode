import React from 'react';
import './Capabilities.css';

export default function Capabilities() {
  const capabilities = [
    {
      icon: '🧠',
      name: '提案提取 (Proposal Extraction)',
      desc: '借助 Qwen 兼容接口或本地 Mock 逻辑，将原始会话提取为带有置信度、所属项目、所属角色的记忆提案，不破坏数据即时持久性。',
      tech: 'LLM Parsing'
    },
    {
      icon: '👥',
      name: '人类介入审批 (Human Review)',
      desc: '提供直观的 Proposals 审核面板，人类主管能够详细查看 AI 的提取 rationale（理由解释）和 source_quote（原文引用），进行批准或拒绝。',
      tech: 'Human-in-the-loop'
    },
    {
      icon: '🔍',
      name: '可信全文检索 (Trusted Retrieval)',
      desc: '使用轻量级 SQLite FTS5 对活动记忆的内容进行快速的关键字匹配检索，在查询源头隔离未审核、已被撤销以及已过期的记忆。',
      tech: 'SQLite FTS5'
    },
    {
      icon: '🧾',
      name: '追溯解释机制 (Explainability)',
      desc: '所有存活的记忆不仅是一个字符串，它永久保留了原始对话引用、审批时间、审批人和完整的状态变更历史，具备高可解释性。',
      tech: 'Lineage Audit'
    },
    {
      icon: '🚫',
      name: '软删除一键撤销 (Revocation)',
      desc: '一键撤除被废弃或错误的记忆。执行撤销后，该记录将软删除以保留审计链，但它的检索索引会被立即清除，不会再次污染 Agent。',
      tech: 'Soft-Delete'
    },
    {
      icon: '⏳',
      name: '版本更替与过期 (Supersession & Expiry)',
      desc: '提供基于时间戳的记忆自动到期机制，以及审批时对旧冲突记忆的主动版本替代（Supersede），支持复杂的演变和更新流。',
      tech: 'Version Logic'
    }
  ];

  return (
    <section className="caps-section" id="capabilities">
      <div className="container">
        <h2 className="caps-title animate-fade-in">全方位的记忆治理能力</h2>
        <p className="caps-subtitle animate-fade-in">
          从提取到废除，MemoryNode 全周期接管记忆的数据安全和可用状态，保证 AI 获取的信息永远真实、干净。
        </p>

        <div className="caps-grid">
          {capabilities.map((cap, idx) => (
            <div key={idx} className="glass-card cap-card animate-fade-in">
              <span className="cap-badge">{cap.tech}</span>
              <div className="cap-icon">{cap.icon}</div>
              <h3 className="cap-name">{cap.name}</h3>
              <p className="cap-desc">{cap.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
