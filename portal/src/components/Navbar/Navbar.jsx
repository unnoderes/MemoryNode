import React from 'react';
import './Navbar.css';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <a href="#top" className="navbar-logo" aria-label="MemoryNode 首页">
          <div className="logo-dot"></div>
          <span className="gradient-text">MemoryNode</span>
        </a>
        <nav aria-label="页面导航">
          <ul className="navbar-links">
            <li><a href="#why" className="nav-link">为什么治理</a></li>
            <li><a href="#workflow" className="nav-link">生命周期</a></li>
            <li><a href="#capabilities" className="nav-link">能力</a></li>
            <li><a href="#architecture" className="nav-link">架构</a></li>
            <li><a href="#cli" className="nav-link">快速开始</a></li>
          </ul>
        </nav>
        <div className="navbar-cta">
          <a href="https://github.com/unnoderes/MemoryNode" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
