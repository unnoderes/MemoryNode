import React, { useState, useEffect } from 'react';
import './CLIStart.css';

export default function CLIStart() {
  const [activeTab, setActiveTab] = useState('install');
  const [visibleLines, setVisibleLines] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);

  const tabLines = {
    install: [
      { comment: "# 安装发布版 Python 包" },
      { command: "uv tool install memorynode" },
      { output: "Installed memorynode 0.8.0" },
      { comment: "# 初始化、启动并检查本地服务" },
      { command: "memorynode init" },
      { command: "memorynode start" },
      { output: "MemoryNode running: API 8000, console 3000" },
      { command: "memorynode status" },
      { command: "memorynode doctor" }
    ],
    mcp: [
      { comment: "# stdio MCP：在 MCP 客户端配置 memorynode mcp" },
      { command: "memorynode mcp" },
      { comment: "# 本地 HTTP MCP：启用认证，生成 API token" },
      { command: "memorynode start" },
      { command: "memorynode mcp --transport http --host 127.0.0.1 --port 8765" },
      { output: "Connect to http://127.0.0.1:8765/mcp with Authorization: Bearer <token>" }
    ],
    dev: [
      { comment: "# 下载源码，进行本地二次开发" },
      { command: "git clone https://github.com/unnoderes/MemoryNode.git" },
      { command: "cd MemoryNode/backend && python -m pip install -r requirements.txt" },
      { command: "python -m uvicorn app.main:app --reload" },
      { command: "cd ../frontend && npm install && npm run dev" }
    ]
  };

  useEffect(() => {
    let active = true;
    setIsTyping(true);
    setVisibleLines([]);
    
    const lines = tabLines[activeTab];
    let currentIndex = 0;

    const printNextLine = () => {
      if (!active) return;
      if (currentIndex < lines.length) {
        const lineToAdd = lines[currentIndex];
        setVisibleLines(prev => [...prev, lineToAdd]);
        currentIndex++;
        
        let delay = 350;
        const currentLineObj = lines[currentIndex];
        if (currentLineObj && currentLineObj.output) {
          delay = 600; // Pause longer when executing a command to show output
        }
        setTimeout(printNextLine, delay);
      } else {
        setIsTyping(false);
      }
    };

    printNextLine();

    return () => {
      active = false;
    };
  }, [activeTab]);

  const copyToClipboard = () => {
    const textToCopy = tabLines[activeTab]
      .filter(line => line.command)
      .map(line => line.command)
      .join('\n');
      
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="cli-section" id="cli">
      <div className="container">
        <h2 className="cli-title animate-fade-in">五分钟试用本地服务</h2>
        <p className="cli-subtitle animate-fade-in">安装 `memorynode` 包后即可独立启动 API 治理边界与治理控制台；无需克隆整个源码库。</p>
        
        <div className="terminal-card animate-fade-in">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="terminal-dot red"></span>
              <span className="terminal-dot yellow"></span>
              <span className="terminal-dot green"></span>
            </div>
            
            <div className="terminal-tabs">
              <button 
                className={`terminal-tab ${activeTab === 'install' ? 'active' : ''}`} 
                onClick={() => setActiveTab('install')}
              >
                安装与启动
              </button>
              <button 
                className={`terminal-tab ${activeTab === 'mcp' ? 'active' : ''}`} 
                onClick={() => setActiveTab('mcp')}
              >
                MCP 配置
              </button>
              <button 
                className={`terminal-tab ${activeTab === 'dev' ? 'active' : ''}`} 
                onClick={() => setActiveTab('dev')}
              >
                源码开发
              </button>
            </div>

            <button className="terminal-copy-btn" onClick={copyToClipboard} title="复制命令">
              {copied ? '已复制 ✓' : '复制命令'}
            </button>
          </div>

          <div className="terminal-body">
            {visibleLines.map((line, index) => (
              <Line 
                key={index} 
                comment={line.comment} 
                command={line.command} 
                output={line.output} 
              />
            ))}
            {isTyping && <span className="terminal-cursor"></span>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Line({ comment, command, output }) {
  return (
    <div className="terminal-line">
      {comment && <span className="line-comment">{comment}</span>}
      {command && (
        <>
          <span className="line-prompt">$</span>
          <span className="line-cmd">{command}</span>
        </>
      )}
      {output && <span className="line-output">{output}</span>}
    </div>
  );
}
