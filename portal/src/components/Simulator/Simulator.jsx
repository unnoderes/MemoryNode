import React, { useState } from 'react';
import './Simulator.css';

export default function Simulator() {
  const [activeStep, setActiveStep] = useState(0);
  const [userInput, setUserInput] = useState(
    'This project must use Qwen Cloud instead of OpenAI APIs.\nWe decided to use FastAPI, SQLite, and Next.js for the MVP.'
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [memories, setMemories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);

  // Step names
  const steps = [
    { name: '1. Extract提案提取', desc: 'AI模型扫描会话并生成提案' },
    { name: '2. Review人工审核', desc: '由人类评委或开发者进行审核' },
    { name: '3. Search安全检索', desc: '默认仅检索通过审核的记忆' },
    { name: '4. Explain追溯解释', desc: '追踪记忆的来源与完整审计流' },
    { name: '5. Revoke一键撤销', desc: '随时废除记忆，撤销检索可见性' },
  ];

  // Step 1: Simulate extraction
  const handleExtract = () => {
    setIsExtracting(true);
    setTimeout(() => {
      setProposal({
        id: 'prop_97f4',
        content: 'This project must use Qwen Cloud instead of OpenAI APIs.',
        type: 'project_constraint',
        confidence: 0.94,
        source_quote: 'This project must use Qwen Cloud instead of OpenAI APIs.',
        reason: 'Explicit constraint declared regarding the LLM provider for the MemoryNode project.',
        status: 'pending',
      });
      setIsExtracting(false);
      setActiveStep(1); // Advance to review
      
      const newEvent = {
        id: 'evt_1',
        type: 'extract',
        title: '提案提取成功 (Proposal Extracted)',
        desc: 'Qwen Extractor 从原始对话中解析出 project_constraint 提案。',
        time: new Date().toLocaleTimeString(),
        status: 'info'
      };
      setAuditEvents([newEvent]);
    }, 1200);
  };

  // Step 2: Handle Approval
  const handleApprove = () => {
    const activeMem = {
      id: 'mem_4b8a',
      proposal_id: proposal.id,
      content: proposal.content,
      type: proposal.type,
      source_quote: proposal.source_quote,
      reason: proposal.reason,
      confidence: proposal.confidence,
      status: 'active',
      created_at: new Date().toLocaleTimeString(),
    };
    
    setMemories([activeMem]);
    setProposal({ ...proposal, status: 'approved' });
    
    const approveEvent = {
      id: 'evt_2',
      type: 'approve',
      title: '提案审批通过 (Memory Approved)',
      desc: '人类管理员 (Admin) 审批通过了该提案，记忆正式进入 SQLite 可信索引区。',
      time: new Date().toLocaleTimeString(),
      status: 'success'
    };
    setAuditEvents(prev => [...prev, approveEvent]);
    setSelectedMemory(activeMem);
    setActiveStep(2); // Go to Search
  };

  const handleReject = () => {
    setProposal({ ...proposal, status: 'rejected' });
    const rejectEvent = {
      id: 'evt_2_rej',
      type: 'reject',
      title: '提案已拒绝 (Proposal Rejected)',
      desc: '人类管理员拒绝了该提案，此内容将永远不会被存入可信记忆库。',
      time: new Date().toLocaleTimeString(),
      status: 'danger'
    };
    setAuditEvents(prev => [...prev, rejectEvent]);
    setActiveStep(0); // Back to extract
  };

  // Step 5: Revoke Memory
  const handleRevoke = () => {
    const updatedMems = memories.map(m => 
      m.id === selectedMemory.id ? { ...m, status: 'revoked' } : m
    );
    setMemories(updatedMems);
    setSelectedMemory({ ...selectedMemory, status: 'revoked' });

    const revokeEvent = {
      id: 'evt_3',
      type: 'revoke',
      title: '记忆一键废除 (Memory Revoked)',
      desc: '人类管理员执行了废除指令，该记忆被软删除并立即从 FTS5 检索中剔除。',
      time: new Date().toLocaleTimeString(),
      status: 'danger'
    };
    setAuditEvents(prev => [...prev, revokeEvent]);
    setActiveStep(4);
  };

  const handleReset = () => {
    setActiveStep(0);
    setProposal(null);
    setMemories([]);
    setSearchQuery('');
    setSelectedMemory(null);
    setAuditEvents([]);
  };

  return (
    <section className="simulator-section" id="workflow">
      <div className="container">
        <h2 className="simulator-title animate-fade-in">交互式生命周期模拟器</h2>
        <p className="simulator-subtitle animate-fade-in">
          无需配置本地环境，直接通过下方的五步流模拟 MemoryNode 独创的记忆治理交互。
        </p>

        <div className="simulator-container glass-card">
          {/* Left Navigation Menu */}
          <div className="simulator-steps">
            {steps.map((step, idx) => (
              <button
                key={idx}
                className={`step-btn ${activeStep === idx ? 'active' : ''}`}
                onClick={() => {
                  // Guard steps if they require prior action
                  if (idx === 1 && !proposal) return;
                  if (idx === 2 && memories.length === 0) return;
                  if (idx === 3 && memories.length === 0) return;
                  if (idx === 4 && memories.length === 0) return;
                  setActiveStep(idx);
                }}
                disabled={
                  (idx === 1 && !proposal) ||
                  (idx > 1 && memories.length === 0)
                }
                style={{
                  opacity: (idx === 1 && !proposal) || (idx > 1 && memories.length === 0) ? 0.5 : 1,
                  cursor: (idx === 1 && !proposal) || (idx > 1 && memories.length === 0) ? 'not-allowed' : 'pointer'
                }}
              >
                <span className="step-number">{idx + 1}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{step.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{step.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Right Display Area */}
          <div className="simulator-display">
            {/* Step 1: EXTRACT */}
            {activeStep === 0 && (
              <div className="fade-content">
                <span className="badge badge-proposal">Step 1: Extract 提取提案</span>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  当 Agent 与用户结束一段对话，MemoryNode 的提取引擎（Qwen）会首先对对话原文进行粗加工，提取出“记忆提案”，此时<b>它并没有存入数据库的可信记忆库中</b>。
                </p>
                <div className="textarea-container">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>输入会话原文 (Chat Transcript Input)</label>
                  <textarea
                    className="simulator-textarea"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={handleExtract}
                    disabled={isExtracting || !userInput.trim()}
                    style={{ width: 'fit-content' }}
                  >
                    {isExtracting ? 'Qwen 引擎提取中...' : '提交并提取提案 (Extract)'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: REVIEW */}
            {activeStep === 1 && proposal && (
              <div className="fade-content">
                <span className="badge badge-proposal">Step 2: Review 人类审核</span>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  所有由 AI 提取的内容都会作为待审批的提案（Pending Proposal）陈列在此。人类审批者可以确认其事实可信度，并执行通过或拒绝。
                </p>
                <div className="proposal-card">
                  <div className="card-header">
                    <span style={{ fontWeight: 600, color: '#c084fc' }}>类型: {proposal.type}</span>
                    <span className="confidence-indicator">置信度: {(proposal.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="proposal-body">
                    <p className="proposal-content">“{proposal.content}”</p>
                    <div className="proposal-meta">
                      <strong>提取依据:</strong> “{proposal.source_quote}”
                      <br />
                      <strong>提取理由:</strong> {proposal.reason}
                    </div>
                  </div>
                </div>
                <div className="action-row">
                  <button className="btn btn-primary" onClick={handleApprove}>
                    批准并导入记忆 (Approve)
                  </button>
                  <button className="btn btn-secondary" onClick={handleReject} style={{ color: 'var(--color-danger)' }}>
                    拒绝提案 (Reject)
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: SEARCH */}
            {activeStep === 2 && (
              <div className="fade-content">
                <span className="badge badge-active">Step 3: Search 可信检索</span>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  只有人类批准的记忆（Active Memory）才能进入检索索引。下方模拟了 SQLite FTS5 的模糊搜索匹配：
                </p>
                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="输入关键词搜索可信记忆，如 'Qwen' 或 'FastAPI'..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="search-results">
                  {memories
                    .filter(m => m.status === 'active' && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((m, idx) => (
                      <div 
                        key={idx} 
                        className="glass-card search-item" 
                        onClick={() => {
                          setSelectedMemory(m);
                          setActiveStep(3); // Go to explain
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{m.type}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>● 已审核 (Active)</span>
                        </div>
                        <p style={{ fontSize: '1rem', fontWeight: 500 }}>{m.content}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                          点击此项以解释该记忆的追溯链路 (Explain) →
                        </p>
                      </div>
                    ))}
                  {memories.filter(m => m.status === 'active' && m.content.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      没有找到匹配的 Active 状态记忆。您可以尝试输入 "Qwen" 检索。
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: EXPLAIN */}
            {activeStep === 3 && selectedMemory && (
              <div className="fade-content">
                <span className="badge badge-active">Step 4: Explain 追溯与解释</span>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  可追溯性是治理记忆的核心。点击“解释”，系统将向开发者直观还原以下追溯节点与完整的审计日志（Audit Log）：
                </p>
                <div className="explain-grid">
                  <div className="proposal-card" style={{ margin: 0 }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>记忆节点详情</div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>原文引用:</strong> “{selectedMemory.source_quote}”
                    </div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>审核信心:</strong> {(selectedMemory.confidence * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>
                      <strong>分类标签:</strong> <span style={{ color: 'var(--color-primary)' }}>{selectedMemory.type}</span>
                    </div>
                  </div>
                  
                  {/* Timeline */}
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>审计时间线 (Audit Log)</div>
                    <div className="timeline">
                      {auditEvents.map((evt, idx) => (
                        <div 
                          key={idx} 
                          className={`timeline-event ${
                            evt.status === 'success' ? 'success-event' : evt.status === 'danger' ? 'danger-event' : 'active-event'
                          }`}
                        >
                          <div className="timeline-dot"></div>
                          <span className="event-time">{evt.time}</span>
                          <div className="event-title">{evt.title}</div>
                          <div className="event-desc">{evt.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="action-row">
                  <button className="btn btn-secondary" onClick={handleRevoke} style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                    立即废除此记忆 (Revoke Memory)
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveStep(2)}>
                    返回搜索 (Back to Search)
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: REVOKE */}
            {activeStep === 4 && (
              <div className="fade-content">
                <span className="badge badge-revoked">Step 5: Revoke 一键撤销</span>
                <div className="revoke-card">
                  <h3 className="revoke-title">记忆已废除 (Memory Revoked Successfully)</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    该记忆已被移出 FTS5 检索列表。Agent 再次检索时将无法查询到该信息，但数据本身的审计流依然在 SQLite 中保留以供溯源查账。
                  </p>
                  
                  <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <strong>最新状态验证：</strong>
                    <br />
                    • Memory Status: <span style={{ color: 'var(--color-danger)' }}>revoked</span>
                    <br />
                    • Search Availability: <span style={{ color: 'var(--color-danger)' }}>Excluded</span>
                    <br />
                    • Audit Log Recorded: <span style={{ color: 'var(--color-success)' }}>Yes (100% Traceable)</span>
                  </div>
                </div>
                
                <div className="action-row" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={handleReset}>
                    重新开始模拟 (Restart Simulator)
                  </button>
                </div>
              </div>
            )}

            {/* Small brand footer in display */}
            <div style={{ 
              marginTop: '2rem', 
              paddingTop: '1rem', 
              borderTop: '1px solid var(--border-color)', 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              <span>MemoryNode Governance Engine v0.5.0</span>
              <span>SQLite FTS5 Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
