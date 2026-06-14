import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: { default: "An Tâm — Cố vấn tinh thần học đường", template: "%s · An Tâm" },
  description: "Không gian hỗ trợ tinh thần ban đầu, riêng tư và không phán xét dành cho học sinh, sinh viên Việt Nam"
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

          .panel-card { background:rgba(255,255,255,.88); border:1px solid var(--line); box-shadow:var(--shadow-sm); border-radius:18px; padding:16px; }
          .panel-title { font-size:14px; font-weight:850; color:var(--text); }
          .panel-desc { color:var(--muted); font-size:12px; line-height:1.5; margin-top:4px; }
          .account-panel { display: grid; gap: 14px; }
          .account-heading, .profile-card, .record-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
          .role-chip { padding:6px 10px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:.04em; }
          .role-guest { background:#eef2f7; color:#536176; } .role-student { background:#e9f7ef; color:#147a43; } .role-teacher { background:#eef3ff; color:#2858bd; }
          .privacy-card { display:flex; gap:10px; padding:12px; border:1px solid rgba(33,94,234,.12); background:rgba(33,94,234,.05); border-radius:14px; }
          .privacy-card p,.profile-card p,.empty-state p { margin:3px 0 0; color:var(--muted); font-size:12px; line-height:1.45; }
          .auth-tabs { display:grid; grid-template-columns:1fr 1fr; background:#f0f3f8; border-radius:12px; padding:4px; }
          .auth-tabs button { border:0; background:transparent; padding:9px; border-radius:9px; color:var(--muted); font-weight:700; cursor:pointer; }
          .auth-tabs button.active { background:#fff; color:var(--primary); box-shadow:0 3px 10px rgba(17,30,61,.08); }
          .auth-form { display:grid; gap:10px; } .auth-form label { display:grid; gap:5px; font-size:12px; font-weight:700; color:#44536a; }
          .text-input,.select-input { width:100%; min-height:42px; border:1px solid var(--line-strong); border-radius:11px; padding:9px 11px; background:#fff; color:var(--text); }
          .primary-button,.secondary-button,.icon-button { border:0; border-radius:11px; min-height:40px; padding:0 14px; cursor:pointer; font-weight:750; }
          .primary-button { color:#fff; background:var(--primary); } .primary-button:hover { background:var(--primary-hover); } .full-button { width:100%; }
          button:disabled,.disabled { opacity:.55; cursor:not-allowed; }
          .profile-card { padding:11px; border:1px solid var(--line); border-radius:14px; background:#fafcff; }
          .avatar { width:38px; height:38px; flex:0 0 auto; display:grid; place-items:center; border-radius:12px; color:#fff; background:linear-gradient(145deg,#215eea,#744ad8); font-weight:900; }
          .profile-card > div:nth-child(2) { min-width:0; flex:1; } .profile-card p { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
          .icon-button { min-width:38px; padding:0; background:#eef2f8; color:#516078; }
          .metric-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
          .metric-grid div { text-align:center; padding:10px 5px; border:1px solid var(--line); border-radius:12px; background:#fff; }
          .metric-grid strong { display:block; font-size:17px; } .metric-grid span { display:block; color:var(--muted); font-size:10px; margin-top:2px; }
          .upload-zone label { display:grid; place-items:center; gap:3px; padding:15px; border:1.5px dashed rgba(33,94,234,.35); border-radius:14px; background:rgba(33,94,234,.035); cursor:pointer; text-align:center; }
          .upload-zone label > span { font-size:20px; color:var(--primary); } .upload-zone small { color:var(--muted); }
          .record-list { max-height:260px; overflow:auto; padding-right:3px; }
          .record-row { padding:10px 2px; border-bottom:1px solid var(--line); } .record-row > div:first-child { min-width:0; display:grid; gap:3px; }
          .record-row span { color:var(--muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
          .score-badge { min-width:42px; text-align:center; padding:7px; border-radius:10px; background:#eaf7ef; color:#147a43; font-weight:900; }
          .empty-state { text-align:center; padding:18px 8px; color:var(--muted); } .empty-state > span { display:block; font-size:25px; margin-bottom:6px; }
          .account-feedback { padding:10px 12px; border-radius:11px; font-size:12px; line-height:1.45; } .account-feedback.error { color:#9a2a2a; background:#fff0f0; } .account-feedback.success { color:#176b40; background:#edf9f2; }
          .account-loading { display:flex; align-items:center; gap:9px; color:var(--muted); } .spinner { width:16px; height:16px; border:2px solid #d9e0eb; border-top-color:var(--primary); border-radius:50%; animation:spin .8s linear infinite; }
          .sr-only { position:absolute!important; width:1px!important; height:1px!important; padding:0!important; margin:-1px!important; overflow:hidden!important; clip:rect(0,0,0,0)!important; white-space:nowrap!important; border:0!important; }
          @keyframes spin { to { transform:rotate(360deg); } }

        `}</style>
      </body>
    </html>
  );
}
