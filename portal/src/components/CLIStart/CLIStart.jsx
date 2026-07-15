import React, { useState } from 'react';
import './CLIStart.css';

export default function CLIStart() {
  const [activeTab, setActiveTab] = useState('install');
  return <section className="cli-section" id="cli"><div className="container">
    <h2 className="cli-title animate-fade-in">五分钟试用本地产品</h2>
    <p className="cli-subtitle animate-fade-in">安装 `memorynode` 0.7.1 后即可启动 API 与静态治理控制台；已安装运行时不需要源码仓库或 Node。</p>
    <div className="terminal-card animate-fade-in"><div className="terminal-header"><div className="terminal-dots"><span className="terminal-dot"></span><span className="terminal-dot"></span><span className="terminal-dot"></span></div><div className="terminal-tabs"><button className={`terminal-tab ${activeTab === 'install' ? 'active' : ''}`} onClick={() => setActiveTab('install')}>安装与启动</button><button className={`terminal-tab ${activeTab === 'mcp' ? 'active' : ''}`} onClick={() => setActiveTab('mcp')}>MCP</button><button className={`terminal-tab ${activeTab === 'dev' ? 'active' : ''}`} onClick={() => setActiveTab('dev')}>源码下载</button></div><div style={{ width: '20px' }} /></div>
      <div className="terminal-body">
        {activeTab === 'install' && <><Line comment="# 安装发布版 Python 包" /><Line command="uv tool install memorynode" /><Line output="Installed memorynode 0.7.1" /><Line comment="# 初始化、启动并检查本地服务" /><Line command="memorynode init" /><Line command="memorynode start" /><Line output="MemoryNode running: API 8000, console 3000" /><Line command="memorynode status" /><Line command="memorynode doctor" /></>}
        {activeTab === 'mcp' && <><Line comment="# stdio MCP：在 MCP 客户端配置 memorynode mcp" /><Line command="memorynode mcp" /><Line comment="# 本地 HTTP MCP：init 时输出的 token 只显示一次" /><Line command="memorynode start" /><Line command="memorynode mcp --transport http --host 127.0.0.1 --port 8765" /><Line output="Connect to http://127.0.0.1:8765/mcp with Authorization: Bearer <token>" /></>}
        {activeTab === 'dev' && <><Line comment="# 下载源码后，用于本地开发；已安装运行时不需要这些步骤" /><Line command="git clone https://github.com/unnoderes/MemoryNode.git" /><Line command="cd MemoryNode/backend && python -m pip install -r requirements.txt" /><Line command="python -m uvicorn app.main:app --reload" /><Line command="cd ../frontend && npm install && npm run dev" /></>}
      </div>
    </div>
  </div></section>;
}

function Line({ comment, command, output }) {
  return <div className="terminal-line">{comment && <span className="line-comment">{comment}</span>}{command && <><span className="line-prompt">$</span><span className="line-cmd">{command}</span></>}{output && <span className="line-output">{output}</span>}</div>;
}
