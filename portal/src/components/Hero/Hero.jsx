import React from 'react';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero-section" id="top">
      <div className="container">
        <div className="hero-content animate-fade-in">
          <div className="hero-badge-container">
            <span className="hero-tag">MemoryNode 0.7.0</span>
            <span className="hero-tag">本地优先 · 人工审核</span>
          </div>
          <h1 className="hero-title">
            面向 AI Agent 的<br />
            <span className="gradient-text">可治理记忆基础设施</span>
          </h1>
          <p className="hero-subtitle">
            Agent 提交待审核的记忆提案；人决定哪些内容成为可信记忆。随后可检索、可解释、可撤销，并保留完整审计线索。
          </p>
          <div className="hero-ctas">
            <a href="#workflow" className="btn btn-primary">体验生命周期模拟器</a>
            <a href="#cli" className="btn btn-secondary">查看本地安装</a>
          </div>
          <div className="tech-badges" aria-label="实现技术">
            <div className="glass-card tech-badge"><span className="tech-badge-dot"></span><span>Python package</span></div>
            <div className="glass-card tech-badge"><span className="tech-badge-dot"></span><span>FastAPI /v1</span></div>
            <div className="glass-card tech-badge"><span className="tech-badge-dot"></span><span>SQLite + FTS5</span></div>
            <div className="glass-card tech-badge"><span className="tech-badge-dot"></span><span>MCP + CLI</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
