"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }) {
  const pathname = usePathname();

  const isProposals = pathname.startsWith("/proposals");
  const isMemories = pathname.startsWith("/memories");

  return (
    <html lang="zh-CN">
      <head>
        <title>MemoryNode - 可信记忆治理控制台</title>
        <meta name="description" content="MemoryNode - 记忆提取、审核、检索、解释与撤销控制台" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="app-container">
          <aside className="sidebar">
            <div>
              <div className="logo-container">
                <span className="logo-pulse"></span>
                <span className="logo-text">MemoryNode</span>
              </div>
              <div className="sidebar-subtitle">可信记忆治理控制台</div>
              <nav className="nav-links">
                <Link href="/proposals" className={`nav-item ${isProposals ? "active" : ""}`}>
                  <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>提案审核</span>
                </Link>
                <Link href="/memories" className={`nav-item ${isMemories ? "active" : ""}`}>
                  <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>记忆检索</span>
                </Link>
              </nav>
            </div>
            
            <div className="sidebar-footer">
              <div className="status-indicator">
                <span className="status-dot"></span>
                <span>治理引擎运行中</span>
              </div>
              <div className="version-info">SQLite + Qwen Engine</div>
            </div>
          </aside>

          <div className="main-wrapper">
            {children}
          </div>
        </div>

        <style>{`
          :root {
            --bg-main: #060913;
            --bg-card: #0c1120;
            --bg-sidebar: #090d16;
            --border-color: #1e293b;
            --border-color-hover: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            
            --color-primary: #10b981;
            --color-primary-hover: #34d399;
            --color-primary-glow: rgba(16, 185, 129, 0.15);
            
            --color-danger: #ef4444;
            --color-danger-hover: #f87171;
            
            --color-warning: #f59e0b;
            --color-info: #3b82f6;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            background: var(--bg-main);
            color: var(--text-primary);
            font-family: 'Plus Jakarta Sans', 'Noto Sans SC', system-ui, -apple-system, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            min-height: 100vh;
            overflow-x: hidden;
          }

          a {
            color: var(--color-primary);
            text-decoration: none;
            transition: all 0.2s ease;
          }
          a:hover {
            color: var(--color-primary-hover);
          }

          /* Custom Scrollbar */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #060913;
          }
          ::-webkit-scrollbar-thumb {
            background: #1e293b;
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #334155;
          }

          /* Layout structure */
          .app-container {
            display: flex;
            min-height: 100vh;
          }

          .sidebar {
            width: 260px;
            background-color: var(--bg-sidebar);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 32px 24px;
            position: fixed;
            height: 100vh;
            top: 0;
            left: 0;
            z-index: 100;
          }

          .sidebar-subtitle {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-muted);
            margin-bottom: 24px;
            font-weight: 700;
            padding-left: 4px;
          }

          .main-wrapper {
            flex: 1;
            margin-left: 260px;
            padding: 48px 40px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }

          /* Logo */
          .logo-container {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
            padding-left: 4px;
          }
          .logo-pulse {
            width: 10px;
            height: 10px;
            background-color: var(--color-primary);
            border-radius: 50%;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% {
              transform: scale(0.95);
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            }
            70% {
              transform: scale(1);
              box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
            }
            100% {
              transform: scale(0.95);
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
            }
          }
          .logo-text {
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
            letter-spacing: -0.025em;
          }

          /* Navigation */
          .nav-links {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 8px;
            color: var(--text-secondary);
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s ease;
          }
          .nav-item:hover {
            color: var(--text-primary);
            background-color: rgba(255, 255, 255, 0.03);
            text-decoration: none;
          }
          .nav-item.active {
            color: var(--text-primary);
            background-color: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.15);
          }
          .nav-icon {
            width: 18px;
            height: 18px;
          }

          /* Sidebar Footer */
          .sidebar-footer {
            border-top: 1px solid var(--border-color);
            padding-top: 20px;
            font-size: 12px;
            color: var(--text-muted);
          }
          .status-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
            color: var(--text-secondary);
            font-weight: 500;
          }
          .status-dot {
            width: 6px;
            height: 6px;
            background-color: var(--color-primary);
            border-radius: 50%;
          }
          .version-info {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            padding-left: 14px;
          }

          /* Base interactive elements */
          button, input, textarea, select {
            font-family: inherit;
            font-size: inherit;
            outline: none;
          }

          button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: 0;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            padding: 10px 18px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            background: var(--color-primary);
            color: #04120c;
          }
          button:hover {
            background: var(--color-primary-hover);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
          }
          button:active {
            transform: translateY(0);
          }
          button:disabled {
            cursor: not-allowed;
            opacity: 0.5;
            transform: none !important;
            box-shadow: none !important;
          }

          button.secondary {
            background: transparent;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
          }
          button.secondary:hover {
            background: rgba(255, 255, 255, 0.03);
            border-color: var(--border-color-hover);
            box-shadow: none;
          }

          button.danger {
            background: var(--color-danger);
            color: #ffffff;
          }
          button.danger:hover {
            background: var(--color-danger-hover);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
          }

          /* Forms & inputs */
          label {
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          input, textarea, select {
            background: #090d16;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-primary);
            padding: 12px 14px;
            transition: all 0.2s ease;
            width: 100%;
          }
          input:focus, textarea:focus, select:focus {
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px var(--color-primary-glow);
          }
          input::placeholder, textarea::placeholder {
            color: var(--text-muted);
          }
          
          textarea {
            min-height: 120px;
            resize: vertical;
          }

          form {
            display: grid;
            gap: 20px;
          }

          /* Layout Helpers */
          main {
            max-width: 1200px;
            width: 100%;
            margin: 0 auto;
          }

          h1 {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin-bottom: 8px;
            color: var(--text-primary);
          }

          h2 {
            font-size: 20px;
            font-weight: 600;
            letter-spacing: -0.02em;
            color: var(--text-primary);
            margin-bottom: 16px;
          }

          .grid {
            display: grid;
            gap: 16px;
          }

          .row {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
          }

          .two-col {
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }

          .muted {
            color: var(--text-secondary);
            font-size: 14px;
          }

          .meta {
            color: var(--text-muted);
            font-size: 13px;
          }

          /* Cards & Panels */
          .card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            transition: all 0.2s ease;
          }
          .card:hover {
            border-color: var(--border-color-hover);
          }

          .pre {
            background: #070a13;
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 13px;
            line-height: 1.5;
            padding: 14px;
            overflow: auto;
            white-space: pre-wrap;
            color: #e2e8f0;
          }

          /* Badges */
          .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.02em;
          }
          .badge-pending {
            background: rgba(245, 158, 11, 0.1);
            color: var(--color-warning);
            border: 1px solid rgba(245, 158, 11, 0.2);
          }
          .badge-active {
            background: rgba(16, 185, 129, 0.1);
            color: var(--color-primary);
            border: 1px solid rgba(16, 185, 129, 0.2);
          }
          .badge-revoked {
            background: rgba(239, 68, 68, 0.1);
            color: var(--color-danger);
            border: 1px solid rgba(239, 68, 68, 0.2);
          }
          .badge-expired {
            background: rgba(100, 116, 139, 0.1);
            color: var(--text-muted);
            border: 1px solid rgba(100, 116, 139, 0.2);
          }

          /* Notifications / Banners */
          .notice, .error, .governance-banner {
            border-radius: 10px;
            padding: 16px;
            font-size: 14px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            line-height: 1.4;
          }

          .notice {
            background: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: var(--color-primary-hover);
          }

          .error {
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: var(--color-danger-hover);
          }

          .governance-banner {
            background: rgba(59, 130, 246, 0.08);
            border: 1px solid rgba(59, 130, 246, 0.2);
            color: #93c5fd;
          }

          .empty {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-muted);
            border: 1px dashed var(--border-color);
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
          }
          
          .empty-icon {
            width: 48px;
            height: 48px;
            color: var(--text-muted);
            opacity: 0.5;
          }

          /* Responsive main container adjustments */
          @media (max-width: 768px) {
            .sidebar {
              position: relative;
              width: 100%;
              height: auto;
              border-right: none;
              border-bottom: 1px solid var(--border-color);
              padding: 16px;
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
            }
            .sidebar-subtitle {
              display: none;
            }
            .nav-links {
              flex-direction: row;
              gap: 8px;
            }
            .nav-item {
              padding: 8px 12px;
              font-size: 13px;
            }
            .main-wrapper {
              margin-left: 0;
              padding: 24px 16px;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
