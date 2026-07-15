import React from 'react';
import './Footer.css';

export default function Footer() {
  return <footer className="footer"><div className="footer-container">
    <div className="footer-brand"><div className="logo-dot"></div><span className="gradient-text">MemoryNode</span></div>
    <div className="footer-text">© {new Date().getFullYear()} MemoryNode Project · MIT License · Governed Memory Infrastructure for AI Agents</div>
    <ul className="footer-links"><li><a href="https://github.com/unnoderes/MemoryNode" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a></li><li><a href="https://pypi.org/project/memorynode/" target="_blank" rel="noopener noreferrer" className="footer-link">PyPI</a></li></ul>
  </div></footer>;
}
