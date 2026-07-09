import Link from "next/link";

export const metadata = {
  title: "MemoryNode",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <nav className="top-nav">
          <Link href="/proposals">记忆提案</Link>
          <Link href="/memories">记忆库</Link>
        </nav>
        {children}
        <style>{`
          body {
            margin: 0;
            background: #f8fafc;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
          }
          a { color: #0f766e; text-decoration: none; }
          a:hover { text-decoration: underline; }
          button, input, textarea {
            font: inherit;
          }
          button {
            border: 0;
            border-radius: 6px;
            background: #0f766e;
            color: white;
            cursor: pointer;
            padding: 8px 12px;
          }
          button.secondary { background: #4b5563; }
          button.danger { background: #b91c1c; }
          button:disabled {
            cursor: not-allowed;
            opacity: 0.55;
          }
          input, textarea {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            box-sizing: border-box;
            padding: 9px 10px;
            width: 100%;
          }
          textarea { min-height: 150px; resize: vertical; }
          main {
            margin: 0 auto;
            max-width: 960px;
            padding: 32px 20px;
          }
          h1 { margin: 0 0 20px; }
          h2 { margin: 0 0 12px; font-size: 20px; }
          label {
            display: grid;
            gap: 6px;
            font-weight: 700;
          }
          form, .card, .empty, .notice, .error {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: white;
            padding: 16px;
          }
          form {
            display: grid;
            gap: 12px;
            margin-bottom: 24px;
          }
          .top-nav {
            align-items: center;
            background: white;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            gap: 18px;
            padding: 14px 20px;
          }
          .grid {
            display: grid;
            gap: 12px;
          }
          .row {
            align-items: center;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .two-col {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          }
          .muted { color: #6b7280; }
          .meta {
            color: #4b5563;
            font-size: 14px;
          }
          .pre {
            background: #f1f5f9;
            border-radius: 6px;
            overflow: auto;
            padding: 10px;
            white-space: pre-wrap;
          }
          .error {
            border-color: #fecaca;
            color: #991b1b;
          }
          .notice {
            border-color: #99f6e4;
            color: #115e59;
          }
        `}</style>
      </body>
    </html>
  );
}
