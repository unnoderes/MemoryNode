import React from 'react';
import './Navbar.css';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <a href="#" className="navbar-logo">
          <div className="logo-dot"></div>
          <span className="gradient-text">MemoryNode</span>
        </a>
        <nav>
          <ul className="navbar-links">
            <li><a href="#why" className="nav-link">设计初衷</a></li>
            <li><a href="#workflow" className="nav-link">工作流模拟</a></li>
            <li><a href="#capabilities" className="nav-link">治理能力</a></li>
            <li><a href="#architecture" className="nav-link">架构设计</a></li>
            <li><a href="#cli" className="nav-link">快速开始</a></li>
          </ul>
        </nav>
        <div className="navbar-cta">
          <a href="https://github.com/unnoderes/MemoryNode" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
