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
  const [proposal, setProposal] = useState(null);
  const [memory, setMemory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState([]);

  const event = (type, title, desc, status) => ({ id: `${type}-${Date.now()}`, title, desc, status, time: new Date().toLocaleTimeString() });

  const extract = () => {
    setIsExtracting(true);
    window.setTimeout(() => {
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
    }, 650);
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
    setActiveStep(0); setProposal(null); setMemory(null); setSearchQuery(''); setEvents([]);
  };

  const canVisit = (index) => index === 0 || (index === 1 && proposal) || (index >= 2 && memory);
  const matchesSearch = memory?.status === 'active' && memory.content.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <section className="simulator-section" id="workflow">
      <div className="container">
        <h2 className="simulator-title animate-fade-in">交互式治理生命周期</h2>
        <p className="simulator-subtitle animate-fade-in">用五步走完“提案 → 审核 → 检索 → 解释 → 撤销/审计”。这是产品规则的可视化模拟，不会写入本地数据。</p>
        <div className="simulator-container glass-card">
          <div className="simulator-steps">
            {steps.map((step, index) => <button key={step.name} className={`step-btn ${activeStep === index ? 'active' : ''}`} disabled={!canVisit(index)} onClick={() => canVisit(index) && setActiveStep(index)}>
              <span className="step-number">{index + 1}</span><span><strong>{step.name}</strong><br /><small>{step.desc}</small></span>
            </button>)}
          </div>
          <div className="simulator-display">
            {activeStep === 0 && <div className="fade-content">
              <span className="badge badge-proposal">第 1 步：提案提取</span>
              <p>Agent 可以从对话中抽取候选内容，但结果首先是待审核提案，而不是可信的持久记忆。</p>
              <div className="textarea-container"><label htmlFor="transcript">对话或原始内容</label><textarea id="transcript" className="simulator-textarea" value={userInput} onChange={(e) => setUserInput(e.target.value)} /><button className="btn btn-primary" onClick={extract} disabled={isExtracting || !userInput.trim()}>{isExtracting ? '正在提取…' : '提取为提案'}</button></div>
            </div>}
            {activeStep === 1 && proposal && <div className="fade-content">
              <span className="badge badge-proposal">第 2 步：人工审核</span>
              <p>审核者检查提案的内容、类型、来源和理由，然后明确批准或拒绝。</p>
              <div className="proposal-card"><div className="card-header"><strong>{proposal.type}</strong><span className="confidence-indicator">置信度 {(proposal.confidence * 100).toFixed(0)}%</span></div><p className="proposal-content">“{proposal.content}”</p><div className="proposal-meta"><strong>来源：</strong>{proposal.sourceQuote}<br /><strong>理由：</strong>{proposal.rationale}</div></div>
              <div className="action-row"><button className="btn btn-primary" onClick={approve}>批准并创建记忆</button><button className="btn btn-secondary" onClick={reject}>拒绝提案</button></div>
            </div>}
            {activeStep === 2 && <div className="fade-content">
              <span className="badge badge-active">第 3 步：可信检索</span>
              <p>默认检索只返回 active memory；pending、rejected、revoked、expired 和 superseded 状态不会作为默认结果返回。</p>
              <div className="search-container"><input className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="输入 Qwen 或 project_constraint" /></div>
              <div className="search-results">{matchesSearch ? <button className="glass-card search-item" onClick={() => setActiveStep(3)}><strong>{memory.type}</strong><p>{memory.content}</p><small>点击查看来源证据与审计事件</small></button> : <div className="empty-state">没有匹配的有效记忆。尝试搜索 “Qwen”。</div>}</div>
            </div>}
            {activeStep === 3 && memory && <div className="fade-content">
              <span className="badge badge-active">第 4 步：证据解释</span>
              <p>解释将记忆内容与来源、提案和每一次生命周期事件连接起来。</p>
              <div className="explain-grid"><div className="proposal-card"><strong>记忆详情</strong><p className="proposal-content">{memory.content}</p><div className="proposal-meta"><strong>来源：</strong>{memory.sourceQuote}<br /><strong>状态：</strong>{memory.status}<br /><strong>理由：</strong>{memory.rationale}</div></div><AuditTimeline events={events} /></div>
              <div className="action-row"><button className="btn btn-primary" onClick={revoke}>撤销此记忆</button><button className="btn btn-secondary" onClick={() => setActiveStep(2)}>返回检索</button></div>
            </div>}
            {activeStep === 4 && <div className="fade-content">
              <span className="badge badge-revoked">第 5 步：撤销与审计</span>
              <div className="revoke-card"><h3 className="revoke-title">记忆已撤销</h3><p>该记忆不再出现在默认 FTS5 检索中，但其来源和审计事件仍可供追溯。</p></div>
              <AuditTimeline events={events} />
              <div className="action-row"><button className="btn btn-primary" onClick={reset}>重新开始模拟</button></div>
            </div>}
            <div className="simulator-footer"><span>MemoryNode Governance Engine 0.8.0</span><span>SQLite FTS5 · local-first</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AuditTimeline({ events }) {
  return <div><strong>审计时间线</strong><div className="timeline">{events.map((item) => <div key={item.id} className={`timeline-event ${item.status === 'success' ? 'success-event' : item.status === 'danger' ? 'danger-event' : 'active-event'}`}><div className="timeline-dot"></div><span className="event-time">{item.time}</span><div className="event-title">{item.title}</div><div className="event-desc">{item.desc}</div></div>)}</div></div>;
}
