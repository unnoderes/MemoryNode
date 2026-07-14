import React from 'react';
import './TechStack.css';

export default function TechStack() {
  return (
    <section className="tech-section" id="architecture">
      <div className="container">
        <h2 className="tech-title animate-fade-in">极简低耦的系统架构</h2>
        <p className="tech-subtitle animate-fade-in">
          MemoryNode 秉持高内聚低耦合的设计原则，前端、API服务与存储引擎各司其职，保证了产品的高效开发与无缝迁移。
        </p>

        <div className="arch-diagram">
          {/* Node 1: Front-end client */}
          <div className="glass-card arch-node animate-fade-in">
            <div className="arch-node-title">Next.js 控制台</div>
            <div className="arch-node-tech">React / Tailwind</div>
            <p className="arch-node-desc">提供人类审核的 Proposal 面板，支持查看相似记忆比较、设定过期时间、记忆全文匹配搜索、查看审计流以及一键废除。</p>
          </div>

          <div className="arch-arrow">➔</div>

          {/* Node 2: Backend REST Service */}
          <div className="glass-card arch-node animate-fade-in">
            <div className="arch-node-title">FastAPI HTTP 服务</div>
            <div className="arch-node-tech">Python / Pydantic</div>
            <p className="arch-node-desc">承载全部业务边界。提供提取、审批、搜索、回溯与失效等 REST API，管理全部状态转换的合法性约束与逻辑。</p>
          </div>

          <div className="arch-arrow">➔</div>

          {/* Node 3: Database & Search & Extraction */}
          <div className="arch-database-nodes">
            {/* Subnode 3.1: SQLite Database */}
            <div className="glass-card db-subnode animate-fade-in">
              <div className="arch-node-title" style={{ fontSize: '0.95rem' }}>SQLite 关系型存储</div>
              <div className="db-subnode-tech">SQLAlchemy</div>
              <p className="arch-node-desc" style={{ fontSize: '0.75rem' }}>持久化对话 sources、提案 proposals、记忆 memories 以及详细的操作审计 events，是系统的事实之源。</p>
            </div>
            
            {/* Subnode 3.2: FTS5 Search */}
            <div className="glass-card db-subnode animate-fade-in">
              <div className="arch-node-title" style={{ fontSize: '0.95rem' }}>SQLite FTS5 检索</div>
              <div className="db-subnode-tech">Full-Text Search</div>
              <p className="arch-node-desc" style={{ fontSize: '0.75rem' }}>对活动记忆进行全文检索索引。提供秒级的关键字匹配检索，省去多余向量库运维成本。</p>
            </div>

            {/* Subnode 3.3: LLM Parsing */}
            <div className="glass-card db-subnode animate-fade-in">
              <div className="arch-node-title" style={{ fontSize: '0.95rem' }}>Qwen 提取引擎</div>
              <div className="db-subnode-tech">LLM Completion API</div>
              <p className="arch-node-desc" style={{ fontSize: '0.75rem' }}>分析原始会话流，提供高准确性的关键短句提案抽取、标签类型分类、以及置信度计算服务。</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
