import React, { useState } from 'react';
import './Simulator.css';

const steps = [
  { name: '提案提取', desc: '从对话创建 pending proposal' },
  { name: '人工审核', desc: '批准或拒绝提案' },
  { name: '可信检索', desc: '只返回 active memory' },
  { name: '证据解释', desc: '查看来源与审计事件' },
  { name: '撤销与审计', desc: '退出检索，保留历史' },
];

export default function Simulator() {
  const [activeStep, setActiveStep] = useState(0);
  const [userInput, setUserInput] = useState('This project must use Qwen Cloud instead of OpenAI APIs.');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractLogs, setExtractLogs] = useState([]);
  const [proposal, setProposal] = useState(null);
  const [proposalView, setProposalView] = useState('card'); // 'card' or 'json'
  const [memory, setMemory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState([]);

  const event = (type, title, desc, status) => ({ 
    id: `${type}-${Date.now()}`, 
    title, 
    desc, 
    status, 
    time: new Date().toLocaleTimeString() 
  });

  const extract = () => {
    setIsExtracting(true);
    setExtractLogs([
      '[INFO] Initialize MemoryNode extraction pipeline...',
      '[INFO] Connecting LLM context adapter...'
    ]);

    setTimeout(() => {
      setExtractLogs(prev => [...prev, '[INFO] Scanning raw transcript text for facts...']);
    }, 250);

    setTimeout(() => {
      setExtractLogs(prev => [
        ...prev, 
        '[SUCCESS] Extracting proposal: project_constraint',
        '[INFO] Calculating extraction confidence... 94%',
        '[INFO] Compiling proposal metadata schema...'
      ]);
    }, 550);

    setTimeout(() => {
      const nextProposal = {
        id: 'proposal_demo_01',
        content: 'This project must use Qwen Cloud instead of OpenAI APIs.',
        type: 'project_constraint',
        confidence: 0.94,
        sourceQuote: userInput.trim(),
        rationale: 'The source contains an explicit project constraint.',
        status: 'pending',
      };
      setProposal(nextProposal);
      setEvents([event('extract', '已创建待审核提案', '提取不会直接写入可信记忆；该提案仍处于 pending 状态。', 'info')]);
      setIsExtracting(false);
      setActiveStep(1);
    }, 900);
  };

  const approve = () => {
    const nextMemory = { id: 'memory_demo_01', ...proposal, status: 'active' };
    setProposal({ ...proposal, status: 'approved' });
    setMemory(nextMemory);
    setEvents((current) => [...current, event('approve', '审核者已批准提案', '批准创建 active memory，它现在可以被默认检索。', 'success')]);
    setActiveStep(2);
  };

  const reject = () => {
    setProposal({ ...proposal, status: 'rejected' });
    setEvents((current) => [...current, event('reject', '审核者已拒绝提案', '被拒绝的提案不会创建可信记忆，也不会进入检索。', 'danger')]);
    setActiveStep(0);
  };

  const revoke = () => {
    setMemory({ ...memory, status: 'revoked' });
    setEvents((current) => [...current, event('revoke', '记忆已撤销', '撤销后，该记忆会退出默认检索；来源和审计历史仍被保留。', 'danger')]);
    setActiveStep(4);
  };

  const reset = () => {
    setActiveStep(0); 
    setProposal(null); 
    setMemory(null); 
    setSearchQuery(''); 
    setEvents([]);
    setExtractLogs([]);
    setProposalView('card');
  };

  const canVisit = (index) => index === 0 || (index === 1 && proposal) || (index >= 2 && memory);
  
  const matchesSearch = memory?.status === 'active' && 
    (searchQuery.trim() === '' || 
     memory.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
     memory.type.toLowerCase().includes(searchQuery.toLowerCase()));

  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? 
            <mark key={i} className="search-highlight">{part}</mark> : part
        )}
      </span>
    );
  };

  return (
    <section className="simulator-section" id="workflow">
      <div className="container">
        <h2 className="simulator-title animate-fade-in">交互式治理生命周期</h2>
        <p className="simulator-subtitle animate-fade-in">用五步走完“提案 → 审核 → 检索 → 解释 → 撤销/审计”。这是产品规则的可视化模拟，不会写入本地数据。</p>
        
        <div className="simulator-container glass-card">
          <div className="simulator-steps">
            {steps.map((step, index) => (
              <button 
                key={step.name} 
                className={`step-btn ${activeStep === index ? 'active' : ''}`} 
                disabled={!canVisit(index)} 
                onClick={() => canVisit(index) && setActiveStep(index)}
              >
                <span className="step-number">{index + 1}</span>
                <span>
                  <strong>{step.name}</strong>
                  <br />
                  <small>{step.desc}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="simulator-display">
            {activeStep === 0 && (
              <div className="fade-content">
                <span className="badge badge-proposal">第 1 步：提案提取</span>
                <p className="step-description">Agent 可以从对话中抽取候选内容，但结果首先是待审核提案，而不是可信的持久记忆。</p>
                
                <div className="textarea-container">
                  <label htmlFor="transcript" className="textarea-label">对话或原始内容 (可编辑)</label>
                  <textarea 
                    id="transcript" 
                    className="simulator-textarea" 
                    value={userInput} 
                    onChange={(e) => setUserInput(e.target.value)} 
                    disabled={isExtracting}
                  />
                  
                  {isExtracting && (
                    <div className="log-console">
                      {extractLogs.map((log, idx) => (
                        <div key={idx} className="log-line">{log}</div>
                      ))}
                      <div className="log-spinner"></div>
                    </div>
                  )}

                  <button 
                    className="btn btn-primary" 
                    onClick={extract} 
                    disabled={isExtracting || !userInput.trim()}
                  >
                    {isExtracting ? '正在运行 LLM 提取...' : '提取为提案 →'}
                  </button>
                </div>
              </div>
            )}

            {activeStep === 1 && proposal && (
              <div className="fade-content">
                <span className="badge badge-proposal">第 2 步：人工审核</span>
                <p className="step-description">审核者检查提案的内容、类型、来源和理由，然后明确批准或拒绝。</p>
                
                <div className="proposal-view-toggle">
                  <button 
                    className={`toggle-btn ${proposalView === 'card' ? 'active' : ''}`} 
                    onClick={() => setProposalView('card')}
                  >
                    卡片视图
                  </button>
                  <button 
                    className={`toggle-btn ${proposalView === 'json' ? 'active' : ''}`} 
                    onClick={() => setProposalView('json')}
                  >
                    JSON 数据
                  </button>
                </div>

                {proposalView === 'card' ? (
                  <div className="proposal-card">
                    <div className="card-header">
                      <span className="proposal-type-badge">{proposal.type}</span>
                      <span className="confidence-indicator">置信度 {(proposal.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p className="proposal-content">“{proposal.content}”</p>
                    <div className="proposal-meta">
                      <strong>来源上下文：</strong>“{proposal.sourceQuote}”<br />
                      <strong>提取理由：</strong>{proposal.rationale}
                    </div>
                  </div>
                ) : (
                  <div className="proposal-json-box">
                    <pre><code>{JSON.stringify(proposal, null, 2)}</code></pre>
                  </div>
                )}

                <div className="action-row">
                  <button className="btn btn-primary" onClick={approve}>批准并创建记忆</button>
                  <button className="btn btn-secondary btn-danger-hover" onClick={reject}>拒绝提案</button>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="fade-content">
                <span className="badge badge-active">第 3 步：可信检索</span>
                <p className="step-description">默认检索只返回 active memory；pending、rejected、revoked、expired 和 superseded 状态不会作为默认结果返回。</p>
                
                <div className="search-container">
                  <input 
                    className="search-input" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    placeholder="输入关键词进行 SQLite FTS5 搜索..." 
                  />
                </div>

                <div className="search-suggestions">
                  <span>点击快捷填充搜索:</span>
                  {['Qwen', 'constraint', 'OpenAI'].map((term) => (
                    <button 
                      key={term} 
                      className="suggestion-tag" 
                      onClick={() => setSearchQuery(term)}
                    >
                      {term}
                    </button>
                  ))}
                </div>

                <div className="search-results">
                  {matchesSearch ? (
                    <button className="glass-card search-item" onClick={() => setActiveStep(3)}>
                      <div className="search-item-header">
                        <span className="proposal-type-badge">{memory.type}</span>
                        <span className="status-indicator-dot success"></span>
                      </div>
                      <p>{highlightText(memory.content, searchQuery)}</p>
                      <small>FTS5 Match · 点击查看来源证据与审计事件 →</small>
                    </button>
                  ) : (
                    <div className="empty-state">
                      没有匹配的有效记忆。尝试清空或搜索 “Qwen”。
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeStep === 3 && memory && (
              <div className="fade-content">
                <span className="badge badge-active">第 4 步：证据解释</span>
                <p className="step-description">证据解释将当前生效的记忆内容、来源提案、原始上下文以及历史生命周期审计事件关联起来，证明该记忆的来源是完全可信和可追溯的。</p>
                
                <div className="explain-grid">
                  <div className="proposal-card">
                    <strong>记忆节点信息 (Active Memory)</strong>
                    <p className="proposal-content">“{memory.content}”</p>
                    <div className="proposal-meta">
                      <strong>原始来源：</strong>“{memory.sourceQuote}”<br />
                      <strong>存储状态：</strong><span className="status-label success">ACTIVE</span><br />
                      <strong>校验理由：</strong>{memory.rationale}
                    </div>
                  </div>
                  <AuditTimeline events={events} />
                </div>

                <div className="flow-diagram-container">
                  <strong>可信溯源链条 (Decisional Traceability Chain)</strong>
                  <div className="flow-diagram">
                    <div className="flow-node">
                      <div className="flow-node-icon">📄</div>
                      <span>原始会话</span>
                      <small>Chat Context</small>
                    </div>
                    <div className="flow-line"></div>
                    <div className="flow-node">
                      <div className="flow-node-icon">⚖️</div>
                      <span>决策提案</span>
                      <small>Proposal</small>
                    </div>
                    <div className="flow-line success-line"></div>
                    <div className="flow-node success-node">
                      <div className="flow-node-icon">🔒</div>
                      <span>可信记忆</span>
                      <small>SQLite FTS5</small>
                    </div>
                  </div>
                </div>

                <div className="action-row" style={{ marginTop: '2rem' }}>
                  <button className="btn btn-primary btn-danger-glow" onClick={revoke}>撤销此记忆</button>
                  <button className="btn btn-secondary" onClick={() => setActiveStep(2)}>返回检索</button>
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className="fade-content">
                <span className="badge badge-revoked">第 5 步：撤销与审计</span>
                <div className="revoke-card">
                  <h3 className="revoke-title">🔒 记忆已安全撤销 (Revoked)</h3>
                  <p>该记忆已正式退出 SQLite FTS5 检索库，Agent 将无法再次查阅。但其提取时的来源上下文、人工审核决策及此次撤销事件将永久保存在不可篡改的变更日志中，提供开箱即用的系统审计追溯。</p>
                </div>

                <div className="audit-ledger-box">
                  <div className="ledger-header">
                    <span className="ledger-dot"></span>
                    <span>memory_ledger_integrity.log</span>
                    <span className="ledger-sha">SHA-256 Verified</span>
                  </div>
                  <div className="ledger-entries">
                    <div className="ledger-line"><code>[OK] block#0 - source context registered (hash: 8f9b...a1b2)</code></div>
                    <div className="ledger-line"><code>[OK] block#1 - proposal proposal_demo_01 created (hash: 4c3d...ef56)</code></div>
                    <div className="ledger-line"><code>[OK] block#2 - human review approved: active memory written (hash: 2a9e...01df)</code></div>
                    <div className="ledger-line"><code>[OK] block#3 - human review revoked: memory status updated (hash: 7c5d...34ea)</code></div>
                    <div className="ledger-line ledger-success-line"><code>[VALID] Cryptographic audit chain verified. Integrity 100% intact.</code></div>
                  </div>
                </div>

                <div className="explain-grid" style={{ marginTop: '1.5rem' }}>
                  <AuditTimeline events={events} />
                </div>

                <div className="action-row" style={{ marginTop: '2rem' }}>
                  <button className="btn btn-primary" onClick={reset}>重新开始模拟</button>
                </div>
              </div>
            )}

            <div className="simulator-footer">
              <span>MemoryNode Governance Engine v0.8.0</span>
              <span>SQLite FTS5 · Cryptographic Ledger</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AuditTimeline({ events }) {
  return (
    <div className="audit-timeline-container">
      <strong>审计变更线 (Audit Timeline)</strong>
      <div className="timeline">
        {events.map((item) => (
          <div 
            key={item.id} 
            className={`timeline-event ${
              item.status === 'success' ? 'success-event' : 
              item.status === 'danger' ? 'danger-event' : 'active-event'
            }`}
          >
            <div className="timeline-dot"></div>
            <span className="event-time">{item.time}</span>
            <div className="event-title">{item.title}</div>
            <div className="event-desc">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
