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
          {/* Link to the console port. Since console is on port 3000 by default, 
              we can link to "/proposals" relative to this app if it is embedded, 
              or absolute link to http://localhost:3000/proposals */}
          <a href="http://localhost:3000/proposals" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
            进入控制台 Console
          </a>
        </div>
      </div>
    </header>
  );
}
