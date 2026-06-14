"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Identity = { id: string; role: "guest" | "student" | "teacher"; name: string; email?: string };
type RecordRow = { id: string; studentId: string; studentName: string; className: string; subject: string; semester: string; score: number };
type AuthMode = "login" | "register";

async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: options?.body instanceof FormData ? options.headers : { "Content-Type": "application/json", ...(options?.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Có lỗi xảy ra. Vui lòng thử lại.");
  return data;
}

export default function AccountPanel() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function refreshIdentity() {
    const data = await requestJson("/api/auth/me");
    setIdentity(data.identity);
  }

  async function loadRecords(current: Identity) {
    if (current.role === "guest") { setRecords([]); return; }
    try {
      const data = await requestJson(current.role === "student" ? "/api/academic/me" : "/api/academic/students");
      setRecords(data.records || []);
    } catch { setRecords([]); }
  }

  useEffect(() => { void refreshIdentity().catch(() => setFeedback({ type: "error", text: "Không thể khởi tạo phiên đăng nhập." })); }, []);
  useEffect(() => { if (identity) void loadRecords(identity); }, [identity]);

  const summary = useMemo(() => {
    const students = new Set(records.map((r) => r.studentId)).size;
    const subjects = new Set(records.map((r) => r.subject)).size;
    const average = records.length ? records.reduce((sum, r) => sum + r.score, 0) / records.length : 0;
    return { students, subjects, average };
  }, [records]);

  async function submitAuth() {
    setFeedback(null);
    if (!email.trim() || !password) return setFeedback({ type: "error", text: "Vui lòng nhập email và mật khẩu." });
    if (mode === "register" && !name.trim()) return setFeedback({ type: "error", text: "Vui lòng nhập họ tên." });
    if (mode === "register" && role === "student" && !studentCode.trim()) return setFeedback({ type: "error", text: "Học sinh cần nhập mã học sinh/sinh viên." });
    setBusy(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, name, role, studentCode };
      const data = await requestJson(endpoint, { method: "POST", body: JSON.stringify(body) });
      setIdentity(data.identity);
      setPassword("");
      setFeedback({ type: "success", text: mode === "login" ? "Đăng nhập thành công." : "Tạo tài khoản thành công." });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Không thể xác thực." });
    } finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    try {
      const data = await requestJson("/api/auth/logout", { method: "POST", body: "{}" });
      setIdentity(data.identity); setRecords([]); setFeedback(null);
      localStorage.removeItem("clinic-chat-session-id");
      location.reload();
    } finally { setBusy(false); }
  }

  async function upload(file: File) {
    setFeedback(null);
    if (file.size > 5 * 1024 * 1024) return setFeedback({ type: "error", text: "Tệp vượt quá giới hạn 5 MB." });
    setUploading(true);
    try {
      const form = new FormData(); form.append("file", file);
      const data = await requestJson("/api/academic/import", { method: "POST", body: form });
      setFeedback({ type: "success", text: `Đã nhập ${data.count} dòng hợp lệ.` });
      if (identity) await loadRecords(identity);
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Nhập dữ liệu thất bại." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!identity) return <section className="panel-card account-loading"><span className="spinner" /> Đang khởi tạo phiên an toàn…</section>;

  return (
    <section className="panel-card account-panel" aria-label="Tài khoản và dữ liệu học tập">
      <div className="account-heading">
        <div>
          <div className="panel-title">Tài khoản</div>
          <div className="panel-desc">Quyền riêng tư và dữ liệu học tập của bạn.</div>
        </div>
        <span className={`role-chip role-${identity.role}`}>{identity.role === "guest" ? "Khách" : identity.role === "student" ? "Học sinh" : "Giáo viên"}</span>
      </div>

      {identity.role === "guest" ? (
        <>
          <div className="privacy-card"><span aria-hidden>🔒</span><div><strong>Chat không cần tài khoản</strong><p>Phiên khách vẫn được bảo vệ. Đăng nhập để giữ lịch sử ổn định hơn trên thiết bị này.</p></div></div>
          <div className="auth-tabs" role="tablist" aria-label="Đăng nhập hoặc đăng ký">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setFeedback(null); }}>Đăng nhập</button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setFeedback(null); }}>Tạo tài khoản</button>
          </div>
          <div className="auth-form">
            {mode === "register" && <label><span>Họ và tên</span><input className="text-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} /></label>}
            <label><span>Email</span><input className="text-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
            <label><span>Mật khẩu</span><input className="text-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} /></label>
            {mode === "register" && <><label><span>Vai trò</span><select className="select-input" value={role} onChange={(e) => setRole(e.target.value as "student" | "teacher")}><option value="student">Học sinh / sinh viên</option><option value="teacher">Giáo viên</option></select></label>{role === "student" && <label><span>Mã học sinh / sinh viên</span><input className="text-input" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} maxLength={40} placeholder="Ví dụ: HS001" /></label>}</>}
            <button className="primary-button full-button" type="button" onClick={() => void submitAuth()} disabled={busy}>{busy ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button>
          </div>
        </>
      ) : (
        <>
          <div className="profile-card"><div className="avatar" aria-hidden>{identity.name.trim().slice(0, 1).toUpperCase()}</div><div><strong>{identity.name}</strong><p>{identity.email}</p></div><button className="icon-button" type="button" onClick={() => void logout()} disabled={busy} aria-label="Đăng xuất">↗</button></div>
          <div className="metric-grid">
            <div><strong>{records.length}</strong><span>Bản ghi</span></div>
            <div><strong>{identity.role === "teacher" ? summary.students : summary.subjects}</strong><span>{identity.role === "teacher" ? "Học sinh" : "Môn học"}</span></div>
            <div><strong>{records.length ? summary.average.toFixed(1) : "—"}</strong><span>Điểm TB</span></div>
          </div>
          {identity.role === "teacher" && <div className="upload-zone"><input ref={fileRef} id="academic-file" className="sr-only" type="file" accept=".xlsx,.csv" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} /><label htmlFor="academic-file" className={uploading ? "disabled" : ""}><span aria-hidden>⇧</span><strong>{uploading ? "Đang nhập dữ liệu…" : "Nhập file vnEdu"}</strong><small>XLSX hoặc CSV, tối đa 5 MB</small></label></div>}
          <div className="record-list" aria-label="Dữ liệu học tập">
            {records.length === 0 ? <div className="empty-state"><span aria-hidden>📘</span><strong>Chưa có dữ liệu phù hợp</strong><p>{identity.role === "teacher" ? "Nhập file vnEdu để bắt đầu." : "Dữ liệu sẽ xuất hiện khi giáo viên nhập đúng mã của bạn."}</p></div> : records.slice(0, 30).map((record) => <article className="record-row" key={record.id}><div><strong>{identity.role === "teacher" ? record.studentName : record.subject}</strong><span>{identity.role === "teacher" ? `${record.studentId} · ${record.className}` : `${record.semester} · ${record.className}`}</span></div><div className="score-badge">{record.score.toFixed(1)}</div></article>)}
          </div>
        </>
      )}
      {feedback && <div className={`account-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</div>}
    </section>
  );
}
