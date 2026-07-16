"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "../lib/language";

const memoryNodeVersion = process.env.NEXT_PUBLIC_MEMORYNODE_VERSION || "development";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();

  const isProposals = pathname.startsWith("/proposals");
  const isMemories = pathname.startsWith("/memories");

  return (
    <html lang="zh-CN">
      <head>
        <title>{t("MemoryNode - AI 记忆管理", "MemoryNode - AI Memory Management")}</title>
        <meta name="description" content={t("提取、审核、查找和管理 AI 记忆", "Extract, review, search, and manage AI memories")} />
        <link rel="icon" type="image/png" href="/memorynode-logo-mark.png" />
        <link rel="apple-touch-icon" href="/memorynode-logo-mark.png" />
        <script src="/memorynode-config.js"></script>
      </head>
      <body>
        <div className="app-container">
          <aside className="sidebar">
            <div>
              <div className="logo-container">
                <img className="logo-mark" src="/memorynode-logo-mark.png" alt="" />
                <span className="logo-text">MemoryNode</span>
              </div>
              <div className="sidebar-subtitle">{t("AI 记忆管理", "AI Memory Management")}</div>
              <nav className="nav-links">
                <Link href="/proposals" className={`nav-item ${isProposals ? "active" : ""}`}>
                  <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{t("审核新记忆", "Review Memories")}</span>
                </Link>
                <Link href="/memories" className={`nav-item ${isMemories ? "active" : ""}`}>
                  <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>{t("查找记忆", "Search Memories")}</span>
                </Link>
              </nav>

              <div className="narrative-widget">
                <div className="widget-title">{t("记忆如何保存", "How memories are saved")}</div>
                <div className="widget-step">
                  <span className="step-num">1</span>
                  <div>
                    <strong>{t("AI 提取候选内容", "AI suggests memories")}</strong>
                    <p>{t("模型先整理出可能值得记住的内容，不会直接保存", "The model suggests what may be worth remembering, but saves nothing yet")}</p>
                  </div>
                </div>
                <div className="widget-step">
                  <span className="step-num">2</span>
                  <div>
                    <strong>{t("由你确认是否保存", "You decide what to save")}</strong>
                    <p>{t("你可以批准、拒绝、替换旧记忆或设置到期时间", "Approve, reject, replace an old memory, or set an expiry")}</p>
                  </div>
                </div>
                <div className="widget-step">
                  <span className="step-num">3</span>
                  <div>
                    <strong>{t("每次变化都有记录", "Every change is recorded")}</strong>
                    <p>{t("随时查看记忆的来源、处理人和变更历史", "See where a memory came from, who handled it, and how it changed")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sidebar-footer">
              <button className="language-toggle" type="button" onClick={() => setLanguage(language === "zh" ? "en" : "zh")}>
                {language === "zh" ? "EN" : "CN"}
              </button>
              <div className="status-indicator">
                <span className="status-dot"></span>
                <span>{t("服务运行正常", "Service online")}</span>
              </div>
              <div className="version-info">MemoryNode {memoryNodeVersion} · SQLite + Qwen</div>
            </div>
          </aside>

          <div className="main-wrapper">
            {children}
          </div>
        </div>

        <style>{`
          :root {
            --bg-main: #0a0a0a;
            --bg-card: #161616;
            --bg-sidebar: #0f0f0f;
            --border-color: #262626;
            --border-color-hover: #404040;

            --text-primary: #f5f5f5;
            --text-secondary: #a3a3a3;
            --text-muted: #737373;

            --color-primary: #ffffff; /* Monochrome White */
            --color-primary-hover: #e5e5e5;
            --color-primary-glow: rgba(255, 255, 255, 0.08);

            --color-accent: #ffffff; /* Monochrome Accent */
            --color-accent-hover: #e5e5e5;
            --color-accent-glow: rgba(255, 255, 255, 0.08);

            --color-danger: #d4d4d4; /* Grayscale Danger */
            --color-danger-hover: #ffffff;
            --color-danger-glow: rgba(255, 255, 255, 0.08);

            --color-warning: #a3a3a3; /* Grayscale Warning */
            --color-warning-glow: rgba(255, 255, 255, 0.08);

            --color-info: #737373;

            --card-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.6);
            --card-shadow-hover: 0 12px 30px -4px rgba(0, 0, 0, 0.8), 0 0 15px 0 rgba(255, 255, 255, 0.02);
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            background-color: #0a0a0a;
            background-image:
              repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.035) 0px, rgba(255, 255, 255, 0.035) 1px, transparent 1px, transparent 24px),
              radial-gradient(circle at 80% 20%, #171717 0%, #0a0a0a 60%);
            color: var(--text-primary);
            font-family: 'Plus Jakarta Sans', 'Noto Sans SC', system-ui, -apple-system, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            min-height: 100vh;
            overflow-x: hidden;
          }

          a {
            color: var(--color-accent);
            text-decoration: none;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          a:hover {
            color: var(--color-accent-hover);
          }

          /* Custom Scrollbar */
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: #0a0a0a;
          }
          ::-webkit-scrollbar-thumb {
            background: #262626;
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #404040;
          }

          /* Layout structure */
          .app-container {
            display: flex;
            min-height: 100vh;
          }

          .sidebar {
            width: 280px;
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
            letter-spacing: 0.12em;
            color: var(--text-muted);
            margin-bottom: 24px;
            font-weight: 700;
            padding-left: 4px;
          }

          .main-wrapper {
            flex: 1;
            margin-left: 280px;
            padding: 48px 48px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }

          /* Logo */
          .logo-container {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
            padding-left: 4px;
          }
          .logo-mark {
            width: 30px;
            height: 30px;
            object-fit: contain;
            flex: 0 0 auto;
          }
          .logo-text {
            font-size: 22px;
            font-weight: 800;
            color: var(--text-primary);
            letter-spacing: -0.03em;
            background: linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          /* Narrative widget */
          .narrative-widget {
            background: rgba(255, 255, 255, 0.035);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 10px;
            padding: 14px;
            margin-top: 24px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: all 0.3s ease;
          }
          .narrative-widget:hover {
            border-color: rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.025);
          }
          .widget-title {
            font-size: 11px;
            font-weight: 700;
            color: var(--color-accent);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
          }
          .widget-step {
            display: flex;
            gap: 10px;
            align-items: flex-start;
          }
          .step-num {
            width: 18px;
            height: 18px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: var(--color-accent-hover);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            flex-shrink: 0;
            margin-top: 2px;
          }
          .widget-step strong {
            font-size: 12px;
            color: var(--text-primary);
            display: block;
            font-weight: 600;
          }
          .widget-step p {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.4;
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
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid transparent;
          }
          .nav-item:hover {
            color: var(--text-primary);
            background-color: rgba(255, 255, 255, 0.02);
            border-color: rgba(255, 255, 255, 0.03);
            text-decoration: none;
          }
          .nav-item.active {
            color: var(--text-primary);
            background-color: rgba(6, 182, 212, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.05);
          }
          .nav-icon {
            width: 18px;
            height: 18px;
            transition: transform 0.2s ease;
          }
          .nav-item:hover .nav-icon {
            transform: scale(1.05);
          }
          .nav-item.active .nav-icon {
            color: var(--color-accent);
          }

          /* Sidebar Footer */
          .sidebar-footer {
            border-top: 1px solid var(--border-color);
            padding-top: 20px;
            font-size: 12px;
            color: var(--text-muted);
          }
          .language-toggle {
            width: 100%;
            margin-bottom: 16px;
            padding: 8px 12px;
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
            font-size: 12px;
          }
          .language-toggle:hover {
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.03);
            border-color: var(--border-color-hover);
            box-shadow: none;
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
            box-shadow: 0 0 8px var(--color-primary);
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
            padding: 10px 20px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            background: var(--color-primary);
            color: #000000;
          }
          button:hover {
            background: var(--color-primary-hover);
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(255, 255, 255, 0.15);
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
            transform: translateY(-1px);
          }

          button.danger {
            background: var(--color-danger);
            color: #000000;
          }
          button.danger:hover {
            background: var(--color-danger-hover);
            box-shadow: 0 4px 15px rgba(255, 255, 255, 0.12);
          }

          /* Forms & inputs */
          label {
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 12px;
            font-weight: 700;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          input, textarea, select {
            background: #121212;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-primary);
            padding: 12px 16px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            width: 100%;
          }
          input:focus, textarea:focus, select:focus {
            border-color: var(--color-accent);
            box-shadow: 0 0 0 3px var(--color-accent-glow);
            background: #161616;
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

          .page-header {
            margin-bottom: 24px;
          }

          h1 {
            font-size: 30px;
            font-weight: 800;
            letter-spacing: -0.03em;
            margin-bottom: 8px;
            color: var(--text-primary);
            background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          h2 {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: var(--text-primary);
            margin-bottom: 16px;
          }

          .grid {
            display: grid;
            gap: 20px;
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
            line-height: 1.5;
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
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: var(--card-shadow);
          }
          .card:hover {
            border-color: var(--border-color-hover);
            box-shadow: var(--card-shadow-hover);
          }

          .pre {
            background: #0a0a0a;
            border: 1px solid rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 13px;
            line-height: 1.6;
            padding: 14px;
            overflow: auto;
            white-space: pre-wrap;
            color: #cbd5e1;
          }

          /* Badges */
          .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          .badge-pending {
            background: rgba(255, 255, 255, 0.04);
            color: #a3a3a3;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .badge-active {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .badge-revoked {
            background: rgba(255, 255, 255, 0.02);
            color: #737373;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .badge-expired {
            background: rgba(255, 255, 255, 0.03);
            color: #888888;
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          /* Notifications / Banners */
          .notice, .error, .governance-banner {
            border-radius: 10px;
            padding: 18px;
            font-size: 14px;
            display: flex;
            align-items: flex-start;
            gap: 14px;
            line-height: 1.5;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .notice {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #ffffff;
          }

          .error {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #d4d4d4;
          }

          .governance-banner {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #ffffff;
          }

          .empty {
            text-align: center;
            padding: 48px 24px;
            color: var(--text-muted);
            border: 1px dashed var(--border-color);
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 14px;
            background: rgba(255, 255, 255, 0.005);
          }

          .empty-icon {
            width: 44px;
            height: 44px;
            color: var(--text-muted);
            opacity: 0.4;
          }

          /* Motion Preferences */
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-delay: 0s !important;
              animation-duration: 0s !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0s !important;
              scroll-behavior: auto !important;
            }
          }

          /* Responsive main container adjustments */
          @media (max-width: 1024px) {
            .sidebar {
              width: 240px;
            }
            .main-wrapper {
              margin-left: 240px;
              padding: 36px 28px;
            }
          }

          @media (max-width: 768px) {
            .app-container {
              flex-direction: column;
            }
            .sidebar {
              position: relative;
              width: 100%;
              height: auto;
              border-right: none;
              border-bottom: 1px solid var(--border-color);
              padding: 20px;
              flex-direction: column;
              align-items: flex-start;
              gap: 16px;
            }
            .sidebar-subtitle {
              display: block;
              margin-bottom: 12px;
            }
            .narrative-widget {
              display: none;
            }
            .nav-links {
              width: 100%;
              flex-direction: row;
              gap: 8px;
            }
            .nav-item {
              flex: 1;
              padding: 10px;
              justify-content: center;
              font-size: 13px;
            }
            .sidebar-footer {
              display: none;
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
