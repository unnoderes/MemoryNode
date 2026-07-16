import React from 'react';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero-section" id="top">
      <div className="container">
        <div className="hero-content animate-fade-in">
          <div className="hero-badge-container">
            <span className="hero-tag">🌟 可信记忆治理框架</span>
            <span className="hero-tag">🛡️ 人机协同审核</span>
          </div>
          <h1 className="hero-title">
            为 AI Agent 打造的<br />
            <span className="gradient-text">可信、可追溯、可废除</span>记忆层
          </h1>
          <p className="hero-subtitle">
            将 Agent 与用户的无序会话转变为结构化的“记忆提案”，通过人类的决策审核与 SQLite FTS5 的合规检索，为您的 AI 智能体提供一个安全、透明、易被修改和销毁的外部知识节点。
          </p>
          <div className="hero-ctas">
            <a href="#workflow" className="btn btn-primary">体验在线模拟器 →</a>
            <a href="#cli" className="btn btn-secondary">5秒快速部署</a>
          </div>
          <div className="tech-badges" aria-label="实现技术">
            <div className="glass-card tech-badge tech-badge-fastapi"><span className="tech-badge-dot"></span><span>Python FastAPI</span></div>
            <div className="glass-card tech-badge tech-badge-qwen"><span className="tech-badge-dot"></span><span>Qwen Compatible</span></div>
            <div className="glass-card tech-badge tech-badge-sqlite"><span className="tech-badge-dot"></span><span>SQLite FTS5</span></div>
            <div className="glass-card tech-badge tech-badge-next"><span className="tech-badge-dot"></span><span>React & Next.js</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
