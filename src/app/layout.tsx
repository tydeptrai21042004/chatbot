import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Hỗ trợ học sinh ",
  description: "Chatbot hỗ trợ tâm lý cho học sinh  Việt Nam"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <div className="app-root">{children}</div>

        <style>{`
          :root {
            color-scheme: light;
            --bg: #f4f7fb;
            --bg-accent: #eef4ff;
            --surface: rgba(255, 255, 255, 0.88);
            --surface-strong: #ffffff;
            --line: rgba(20, 39, 74, 0.08);
            --line-strong: rgba(20, 39, 74, 0.14);
            --text: #142033;
            --muted: #5f6f88;
            --muted-2: #7e8ca3;
            --primary: #215eea;
            --primary-hover: #154fda;
            --primary-soft: rgba(33, 94, 234, 0.10);
            --shadow-sm: 0 6px 18px rgba(17, 30, 61, 0.06);
            --shadow-md: 0 18px 50px rgba(17, 30, 61, 0.10);
            --radius-xl: 24px;
            --radius-lg: 18px;
            --radius-md: 14px;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            min-height: 100%;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
            background:
              radial-gradient(circle at top left, rgba(118, 160, 255, 0.10), transparent 28%),
              radial-gradient(circle at top right, rgba(174, 120, 255, 0.08), transparent 24%),
              linear-gradient(180deg, #f7faff 0%, #f2f6fb 100%);
            color: var(--text);
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }

          body {
            position: relative;
          }

          body::before {
            content: "";
            position: fixed;
            inset: 0;
            pointer-events: none;
            background:
              linear-gradient(to bottom, rgba(255,255,255,0.25), rgba(255,255,255,0)),
              radial-gradient(circle at 50% 0%, rgba(255,255,255,0.65), transparent 40%);
          }

          .app-root {
            min-height: 100vh;
          }

          a {
            color: inherit;
            text-decoration: none;
          }

          button,
          input,
          select,
          textarea {
            font: inherit;
          }

          button {
            -webkit-tap-highlight-color: transparent;
          }

          *:focus-visible {
            outline: 3px solid rgba(33, 94, 234, 0.18);
            outline-offset: 2px;
          }

          ::selection {
            background: rgba(33, 94, 234, 0.18);
          }
        `}</style>
      </body>
    </html>
  );
}
