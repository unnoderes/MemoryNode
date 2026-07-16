import React from 'react';
import './TechStack.css';

export default function TechStack() {
  return <section className="tech-section" id="architecture"><div className="container">
    <h2 className="tech-title animate-fade-in">小而清晰的架构边界</h2>
    <p className="tech-subtitle animate-fade-in">所有客户端都通过 FastAPI <code>/v1</code> 执行业务规则；SDK 和 MCP 是适配器，不会直接访问 SQLite。</p>
    <div className="arch-diagram">
      <article className="glass-card arch-node animate-fade-in"><div className="arch-node-title">Agent / MCP 客户端</div><div className="arch-node-tech">stdio · local HTTP</div><p className="arch-node-desc">Agent 通过 MCP 提交提案、搜索和解释；高风险治理工具默认关闭。</p></article>
      <div className="arch-arrow" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="arrow-pulse">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
      <article className="glass-card arch-node animate-fade-in"><div className="arch-node-title">MCP / Python SDK / CLI</div><div className="arch-node-tech">Python clients</div><p className="arch-node-desc">客户端和本地运维入口统一调用 API，不复制生命周期规则。</p></article>
      <div className="arch-arrow" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="arrow-pulse">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
      <article className="glass-card arch-node animate-fade-in"><div className="arch-node-title">FastAPI /v1</div><div className="arch-node-tech">Lifecycle boundary</div><p className="arch-node-desc">校验请求、执行提取与状态转换，并写入可解释的审计事件。</p></article>
      <div className="arch-arrow" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="arrow-pulse">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
      <div className="arch-database-nodes"><article className="glass-card db-subnode animate-fade-in"><div className="arch-node-title">SQLite</div><div className="db-subnode-tech">source of truth</div><p className="arch-node-desc">保存来源、提案、记忆和事件。</p></article><article className="glass-card db-subnode animate-fade-in"><div className="arch-node-title">SQLite FTS5</div><div className="db-subnode-tech">local search</div><p className="arch-node-desc">为有效记忆提供本地关键词检索。</p></article><article className="glass-card db-subnode animate-fade-in"><div className="arch-node-title">治理控制台</div><div className="db-subnode-tech">local UI</div><p className="arch-node-desc">通过 API 审核、搜索、解释和撤销。</p></article></div>
    </div>
  </div></section>;
}
