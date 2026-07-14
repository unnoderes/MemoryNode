import React from 'react';
import './ProblemContrast.css';

export default function ProblemContrast() {
  return (
    <section className="contrast-section" id="why">
      <div className="container">
        <h2 className="contrast-title animate-fade-in">为什么选择 MemoryNode?</h2>
        <p className="contrast-subtitle animate-fade-in">
          目前大多数 AI Agent 的记忆机制犹如“黑盒”，缺乏干预手段。MemoryNode 将记忆沉淀设计为显性的治理决策。
        </p>
        <div className="format-badge-container animate-fade-in">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', marginRight: '0.25rem' }}>[实现形态]</span>
          <span className="format-tag">🔌 MCP Server/Herness Agent Plugins</span>
          <span className="format-tag">📦 SDK</span>
          <span className="format-tag">🖥️ WebUI && FastAPI</span>
        </div>

        <div className="contrast-grid">
          {/* Opaque Memory Card */}
          <div className="glass-card contrast-card contrast-card-danger animate-fade-in">
            <div className="contrast-card-header">
              <span className="card-icon" style={{ color: 'var(--color-danger)' }}>⚠️</span>
              <span style={{ color: 'var(--color-danger)' }}>传统的 Agent 记忆黑盒</span>
            </div>
            
            <ul className="contrast-list">
              <li className="contrast-item">
                <span className="item-bullet danger-bullet">✕</span>
                <div>
                  <div className="item-title">黑盒提取 & 默认信任</div>
                  <div className="item-desc">Agent 自行提取对话并永久信任。用户和开发者无法获知其为何记住这档事，存在安全隐患。</div>
                </div>
              </li>
              <li className="contrast-item">
                <span className="item-bullet danger-bullet">✕</span>
                <div>
                  <div className="item-title">临时闲聊污染长期事实</div>
                  <div className="item-desc">随口说的一句玩笑或特定情境的假设被当成客观事实存入数据库，破坏未来的交互逻辑。</div>
                </div>
              </li>
              <li className="contrast-item">
                <span className="item-bullet danger-bullet">✕</span>
                <div>
                  <div className="item-title">历史记忆难以撤销</div>
                  <div className="item-desc">一旦需要修改或吊销过期的偏好或业务约束，由于缺乏引用，无法做到数据干净的清理和追溯。</div>
                </div>
              </li>
              <li className="contrast-item">
                <span className="item-bullet danger-bullet">✕</span>
                <div>
                  <div className="item-title">无法审计的改动</div>
                  <div className="item-desc">什么时候记忆被覆盖了？被哪个版本替换了？完全没有数据审计日志可以进行事后溯源排查。</div>
                </div>
              </li>
            </ul>
          </div>

          {/* Governed Memory Card */}
          <div className="glass-card contrast-card contrast-card-success animate-fade-in">
            <div className="contrast-card-header">
              <span className="card-icon" style={{ color: 'var(--color-primary)' }}>🛡️</span>
              <span style={{ color: 'var(--color-primary)' }}>MemoryNode 显性记忆治理</span>
            </div>

            <ul className="contrast-list">
              <li className="contrast-item">
                <span className="item-bullet success-bullet">✓</span>
                <div>
                  <div className="item-title">依据在先，提案待审</div>
                  <div className="item-desc">提取仅创建“Pending 提案”而不是可信记忆。所有提案都带有原文的 Quote 证据，透明可见。</div>
                </div>
              </li>
              <li className="contrast-item">
                <span className="item-bullet success-bullet">✓</span>
                <div>
                  <div className="item-title">人类审批，双重确认</div>
                  <div className="item-desc">通过人类审批（Human-in-the-loop）将不安全、垃圾、冲突的提案予以拒绝，让可信数据进入检索区。</div>
                </div>
              </li>
              <li className="contrast-item">
                <span className="item-bullet success-bullet">✓</span>
                <div>
                  <div className="item-title">一键废除，软删除安全</div>
                  <div className="item-desc">提供一键撤销（Revoke）与自动失效（Expiry）。被撤除的记忆瞬间脱离检索范围，但原始引用保留。</div>
                </div>
              </li>
              <li className="contrast-item">
                <span className="item-bullet success-bullet">✓</span>
                <div>
                  <div className="item-title">完整的审计流与版本交替</div>
                  <div className="item-desc">记忆支持显性版本替代（Supersession）。每一次变化都会往数据库的 Events 表写入事件，有据可查。</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
