import React, { useState } from 'react';
import './CLIStart.css';

export default function CLIStart() {
  const [activeTab, setActiveTab] = useState('cli');

  return (
    <section className="cli-section" id="cli">
      <div className="container">
        <h2 className="cli-title animate-fade-in">五秒快速部署与启动</h2>
        <p className="cli-subtitle animate-fade-in">
          MemoryNode 已打包为开箱即用的 Python 工具，通过简单的 CLI 指令，即可在本地开启完整的记忆治理服务。
        </p>

        <div className="terminal-card animate-fade-in">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="terminal-dot" style={{ backgroundColor: '#ef4444' }}></span>
              <span className="terminal-dot" style={{ backgroundColor: '#f59e0b' }}></span>
              <span className="terminal-dot" style={{ backgroundColor: '#10b981' }}></span>
            </div>
            
            {/* Terminal Tab Switchers */}
            <div className="terminal-tabs">
              <button 
                className={`terminal-tab ${activeTab === 'cli' ? 'active' : ''}`}
                onClick={() => setActiveTab('cli')}
              >
                1. CLI (uv tool)
              </button>
              <button 
                className={`terminal-tab ${activeTab === 'dev' ? 'active' : ''}`}
                onClick={() => setActiveTab('dev')}
              >
                2. Dev Setup (Github)
              </button>
            </div>
            
            <div style={{ width: '50px' }}></div>
          </div>

          <div className="terminal-body">
            {activeTab === 'cli' && (
              <div>
                <div className="terminal-line">
                  <span className="line-comment"># 使用 Python uv 跨平台一键安装 CLI 工具</span>
                </div>
                <div className="terminal-line">
                  <span className="line-prompt">$</span>
                  <span className="line-cmd">uv tool install memorynode</span>
                </div>
                <div className="terminal-line">
                  <span className="line-output">Resolving dependencies... Installed memorynode v0.5.0</span>
                </div>
                
                <div className="terminal-line" style={{ marginTop: '1rem' }}>
                  <span className="line-comment"># 初始化本地 SQLite 数据源与默认配置</span>
                </div>
                <div className="terminal-line">
                  <span className="line-prompt">$</span>
                  <span className="line-cmd">memorynode init</span>
                </div>
                <div className="terminal-line">
                  <span className="line-output">Initialized configuration in ./config.toml. Database seeded.</span>
                </div>
                
                <div className="terminal-line" style={{ marginTop: '1rem' }}>
                  <span className="line-comment"># 启动 FastAPI 后端 (8000端口) 与 Next.js 看板 (3000端口)</span>
                </div>
                <div className="terminal-line">
                  <span className="line-prompt">$</span>
                  <span className="line-cmd">memorynode start</span>
                </div>
                <div className="terminal-line">
                  <span className="line-output">Starting API server on 127.0.0.1:8000... Done.</span>
                </div>
                <div className="terminal-line">
                  <span className="line-output">Starting Dashboard console on 127.0.0.1:3000... Done.</span>
                </div>
                <div className="terminal-line">
                  <span className="line-prompt">$</span>
                  <span className="line-cmd">memorynode status<span className="cursor"></span></span>
                </div>
              </div>
            )}

            {activeTab === 'dev' && (
              <div>
                <div className="terminal-line">
                  <span className="line-comment"># 克隆 GitHub 仓库并配置环境</span>
                </div>
                <div className="terminal-line">
                  <span className="line-prompt">$</span>
                  <span className="line-cmd">git clone https://github.com/unnoderes/MemoryNode.git</span>
                </div>
                <div className="terminal-line">
                  <span className="line-prompt">$</span>
                  <span className="line-cmd">cd MemoryNode && cp .env.example .env</span>
                </div>
                
                <div className="terminal-line" style={{ marginTop: '1.2rem' }}>
                  <span className="line-comment"># 启动 API 服务端 (FastAPI)</span>
                </div>
                <div className="terminal-line">
                  <span className="line-prompt">$</span>
                  <span className="line-cmd">cd backend && pip install -r requirements.txt</span>
                </div>
                <div className="terminal-line">
                  <span className="line-prompt">$</span>
                  <span className="line-cmd">python -m uvicorn app.main:app --reload</span>
                </div>
                
                <div className="terminal-line" style={{ marginTop: '1.2rem' }}>
                  <span className="line-comment"># 启动看板客户端 (Next.js)</span>
                </div>
                <div className="terminal-line">
                  <span className="line-prompt">$</span>
                  <span className="line-cmd">cd ../frontend && npm install && npm run dev<span className="cursor"></span></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
