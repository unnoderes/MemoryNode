import React from 'react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <div className="logo-dot" style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', boxShadow: 'var(--glow-primary)' }}></div>
          <span className="gradient-text">MemoryNode</span>
        </div>
        <div className="footer-text">
          © {new Date().getFullYear()} MemoryNode Project. Apache 2.0 Licensed. - unnode
        </div>
        <ul className="footer-links">
          <li><a href="https://github.com/unnoderes/MemoryNode" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub Repository</a></li>
          <li><a href="#why" className="footer-link">About</a></li>
        </ul>
      </div>
    </footer>
  );
}
