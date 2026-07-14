import "./globals.css";

export const metadata = {
  title: "MemoryNode - Governed Memory for AI Agents",
  description: "Turn raw interactions into human-reviewed, searchable, explainable, and revocable memories—backed by source evidence and a complete audit trail.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[#060606] text-[#f5f5f5]">{children}</body>
    </html>
  );
}
