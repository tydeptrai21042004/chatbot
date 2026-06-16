"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatResponse, PublicRole, RoleId } from "../lib/api";
import { deleteMessage as deleteOneMessage, deleteSession, exportMyData, fetchRoles, fetchSessionMessages, fetchSessions, initializeAuth, renameSession, sendChat, type ConversationListItem } from "../lib/api";
import AccountPanel from "./AccountPanel";

type UiMessage = { id: string; serverId?: string; role: "user" | "assistant"; content: string };

const STARTERS = [
  "Em đang thấy quá tải.",
  "Em muốn sắp xếp lại suy nghĩ.",
  "Em đang áp lực vì việc học."
];
const SESSION_STORAGE_KEY = "clinic-chat-session-id";
const INITIAL_MESSAGE = "Chào bạn. Hôm nay điều gì đang làm bạn thấy nặng lòng nhất?";

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function createSessionId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function ChatShell() {
  const [roles, setRoles] = useState<PublicRole[]>([]);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversationQuery, setConversationQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleId>("co-van-hoc-duong");
  const [sessionId, setSessionId] = useState(() => typeof window === "undefined" ? createSessionId() : localStorage.getItem(SESSION_STORAGE_KEY) || createSessionId());
  const [messages, setMessages] = useState<UiMessage[]>([{ id: uid(), role: "assistant", content: INITIAL_MESSAGE }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [customPersonaEnabled, setCustomPersonaEnabled] = useState(false);
  const [customPersonaName, setCustomPersonaName] = useState("");
  const [customPersonaPrompt, setCustomPersonaPrompt] = useState("");
  const [lastMeta, setLastMeta] = useState<(Pick<ChatResponse, "mode" | "riskLevel"> & { sensitiveWarning?: string }) | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    void fetchRoles().then((data) => { setRoles(data.roles); setSelectedRole(data.defaultRoleId); }).catch(() => undefined);
  }, []);
  useEffect(() => { localStorage.setItem(SESSION_STORAGE_KEY, sessionId); }, [sessionId]);
  useEffect(() => {
    let cancelled = false;
    async function bootstrapPrivateSession() {
      try {
        const identity = await initializeAuth();
        if (cancelled) return;
        setMustChangePassword(Boolean(identity.mustChangePassword));
        if (identity.mustChangePassword) { setSettingsOpen(true); setError("Bạn cần đổi mật khẩu lần đầu trước khi trò chuyện."); }
        setAuthReady(!identity.mustChangePassword);
        try {
          const data = await fetchSessionMessages(sessionId);
          if (!cancelled && data.messages.length) {
            setMessages(data.messages.map((m) => ({ role:m.role, content:m.content, serverId:m.id, id:m.id||uid() })));
          }
        } catch {
          // A new or expired guest session has no history yet.
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Không thể khởi tạo phiên riêng tư.");
        }
      }
    }
    void bootstrapPrivateSession();
    return () => { cancelled = true; };
  }, [sessionId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);
  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        if (!deletingConversation) setDeleteDialogOpen(false);
      }
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [deletingConversation]);

  const selectedRoleInfo = useMemo(() => roles.find((role) => role.id === selectedRole), [roles, selectedRole]);
  const canSend = authReady && input.trim().length > 0 && input.length <= 4000 && !sending && (!customPersonaEnabled || customPersonaPrompt.trim().length >= 10);

  async function refreshConversations(query=conversationQuery) {
    try { setConversations(await fetchSessions(query)); } catch { /* unavailable for local demo storage */ }
  }

  async function switchConversation(nextId:string) {
    setSessionId(nextId); setSettingsOpen(false); setMessages([{id:uid(),role:"assistant",content:INITIAL_MESSAGE}]);
  }

  async function renameConversation(item:ConversationListItem) {
    const title=window.prompt("Tên mới cho cuộc trò chuyện",item.title)?.trim(); if(!title)return; await renameSession(item.sessionId,title); await refreshConversations();
  }

  async function removeSingleMessage(message:UiMessage) {
    if(!message.serverId||!window.confirm("Xóa riêng tin nhắn này? Bộ nhớ phiên sẽ được tính lại."))return;
    await deleteOneMessage(sessionId,message.serverId); setMessages(current=>current.filter(x=>x.id!==message.id));
  }

  async function clearConversation() {
    if (deletingConversation) return;
    setDeletingConversation(true);
    setError("");
    try {
      await deleteSession(sessionId);
      const next = createSessionId();
      setSessionId(next);
      setMessages([{ id: uid(), role: "assistant", content: "Đoạn chat đã được xoá. Mình có thể bắt đầu lại từ đây." }]);
      setInput("");
      setLastMeta(null);
      setDeleteDialogOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xoá đoạn chat lúc này.");
    } finally {
      setDeletingConversation(false);
      textareaRef.current?.focus();
    }
  }

  async function handleSend(prefill?: string) {
    const text = (prefill ?? input).trim();
    if (!text || sending || !authReady) {
      if (!authReady) setError("Phiên riêng tư đang được khởi tạo. Vui lòng thử lại trong giây lát.");
      return;
    }
    if (text.length > 4000) { setError("Tin nhắn tối đa 4.000 ký tự."); return; }
    if (customPersonaEnabled && customPersonaPrompt.trim().length < 10) { setError("Mô tả phong cách cần ít nhất 10 ký tự."); return; }
    setSending(true); setError(""); setInput("");
    setMessages((current) => [...current, { id: uid(), role: "user", content: text }]);
    try {
      const data = await sendChat({
        sessionId, message: text, roleId: selectedRole, customPersonaEnabled,
        customPersonaName: customPersonaName.trim(), customPersonaPrompt: customPersonaPrompt.trim()
      });
      setMessages((current) => [...current, { id: uid(), role: "assistant", content: data.reply }]);
      setLastMeta({ mode: data.mode, riskLevel: data.riskLevel, sensitiveWarning: data.sensitiveContent?.warning });
      if (data.sessionId && data.sessionId !== sessionId) setSessionId(data.sessionId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể gửi tin nhắn lúc này.");
      setMessages((current) => [...current, { id: uid(), role: "assistant", content: "Mình đang gặp gián đoạn nhỏ. Bạn thử gửi lại sau một chút nhé." }]);
    } finally { setSending(false); textareaRef.current?.focus(); }
  }

  return (
    <main className="chat-page">
      <header className="chat-nav">
        <Link className="chat-brand" href="/"><span>●</span><strong>Bạn đồng hành học đường</strong></Link>
        <div className="chat-nav-actions">
          <span className="privacy-status"><i /> Phiên riêng tư</span>
          <button className="nav-icon" type="button" onClick={() => { setSettingsOpen(true); void refreshConversations(); }} aria-label="Mở tài khoản và cài đặt">☰</button>
        </div>
      </header>

      <section className="chat-workspace">
        <div className="conversation-heading">
          <div><h1>Không gian trò chuyện</h1><p>{customPersonaEnabled ? customPersonaName || "Phong cách riêng" : selectedRoleInfo?.name || "Cố vấn học đường"}</p></div>
          <button type="button" className="quiet-action delete-chat-button" onClick={() => setDeleteDialogOpen(true)} disabled={sending || deletingConversation} aria-haspopup="dialog"><span aria-hidden="true">⌫</span> Xóa đoạn chat</button>
        </div>

        {error && <div className="inline-alert" role="alert">{error}</div>}
        {lastMeta?.sensitiveWarning && <div className="sensitive-banner" role="status"><strong>Nhắc nhở về ngôn từ</strong><span>{lastMeta.sensitiveWarning}</span></div>}
        {lastMeta?.mode === "help_now" && <div className="urgent-banner" role="alert"><strong>Ưu tiên an toàn ngay lúc này.</strong><span>Nếu bạn có nguy cơ bị tổn thương, hãy rời khỏi nơi nguy hiểm và liên hệ một người đáng tin hoặc dịch vụ khẩn cấp tại nơi bạn sống.</span></div>}

        <div className="message-stream" aria-live="polite">
          {messages.map((message, index) => (
            <article className={`chat-message ${message.role}`} key={message.id} style={{ animationDelay: `${Math.min(index, 4) * 35}ms` }}>
              {message.role === "assistant" && <div className="assistant-mark">A</div>}
              <div className="message-content">{message.content}{message.serverId&&<button className="message-delete" type="button" onClick={()=>void removeSingleMessage(message)} aria-label="Xóa tin nhắn này">×</button>}</div>
            </article>
          ))}
          {messages.length === 1 && !sending && authReady && <div className="starter-row">{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => void handleSend(starter)}>{starter}</button>)}</div>}
          {sending && <article className="chat-message assistant"><div className="assistant-mark">A</div><div className="typing-indicator" aria-label="Đang phản hồi"><span/><span/><span/></div></article>}
          <div ref={bottomRef} />
        </div>

        <div className="composer-wrap">
          <div className="composer-box">
            <textarea ref={textareaRef} value={input} maxLength={4000} rows={3} placeholder={authReady ? "Chia sẻ điều bạn đang nghĩ..." : "Đang khởi tạo phiên riêng tư..."} onChange={(e) => setInput(e.target.value)} disabled={!authReady} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }} />
            <div className="composer-bottom"><span>{input.length ? `${input.length}/4000` : "Enter để gửi · Shift + Enter để xuống dòng"}</span><button type="button" onClick={() => void handleSend()} disabled={!canSend} aria-label="Gửi tin nhắn">↑</button></div>
          </div>
          <p className="safety-note">Bạn đồng hành học đường không thay thế chuyên gia sức khỏe tâm thần hoặc dịch vụ cấp cứu.</p>
        </div>
      </section>


      {deleteDialogOpen && <div className="confirm-layer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !deletingConversation) setDeleteDialogOpen(false); }}>
        <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-chat-title" aria-describedby="delete-chat-description">
          <div className="confirm-icon" aria-hidden="true">⌫</div>
          <h2 id="delete-chat-title">Xóa toàn bộ đoạn chat?</h2>
          <p id="delete-chat-description">Toàn bộ tin nhắn và dữ liệu ghi nhớ của phiên hiện tại sẽ bị xóa. Thao tác này không thể hoàn tác.</p>
          <div className="confirm-actions">
            <button type="button" className="cancel-button" onClick={() => setDeleteDialogOpen(false)} disabled={deletingConversation}>Hủy</button>
            <button type="button" className="danger-button" onClick={() => void clearConversation()} disabled={deletingConversation}>{deletingConversation ? "Đang xóa..." : "Xóa đoạn chat"}</button>
          </div>
        </section>
      </div>}

      {settingsOpen && <div className="drawer-layer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
        <aside className="settings-drawer" role="dialog" aria-modal="true" aria-label="Tài khoản và cài đặt">
          <div className="drawer-head"><div><strong>Tài khoản & cài đặt</strong><span>Quản lý vai trò và trải nghiệm trò chuyện</span></div><button type="button" onClick={() => setSettingsOpen(false)} aria-label="Đóng">×</button></div>
          <div className="drawer-scroll">
            <section className="settings-card"><div className="settings-title">Lịch sử trò chuyện</div><label>Tìm kiếm<input value={conversationQuery} onChange={e=>{setConversationQuery(e.target.value);void refreshConversations(e.target.value)}} placeholder="Nhập tên cuộc trò chuyện" /></label><button className="data-action" type="button" onClick={()=>void exportMyData()}>Xuất dữ liệu cá nhân</button><div className="conversation-list">{conversations.map(item=><div key={item.sessionId}><button type="button" onClick={()=>void switchConversation(item.sessionId)}><strong>{item.title}</strong><small>{new Date(item.updatedAt).toLocaleString("vi-VN")}</small></button><button type="button" aria-label={`Đổi tên ${item.title}`} onClick={()=>void renameConversation(item)}>✎</button></div>)}{!conversations.length&&<small>Chưa có cuộc trò chuyện đã lưu.</small>}</div></section>
            <AccountPanel />
            <section className="settings-card">
              <div className="settings-title">Phong cách hỗ trợ</div>
              <label>Phong cách có sẵn<select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as RoleId)} disabled={customPersonaEnabled}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
              {!customPersonaEnabled && selectedRoleInfo && <div className="persona-description"><strong>{selectedRoleInfo.name}</strong><p>{selectedRoleInfo.description}</p></div>}
              <label className="switch-row"><span><strong>Phong cách riêng</strong><small>Tùy chỉnh cách phản hồi cho phiên hiện tại</small></span><input type="checkbox" checked={customPersonaEnabled} onChange={(e) => setCustomPersonaEnabled(e.target.checked)} /></label>
              {customPersonaEnabled && <div className="custom-fields"><label>Tên phong cách<input value={customPersonaName} maxLength={50} onChange={(e) => setCustomPersonaName(e.target.value)} placeholder="Ví dụ: Ngắn gọn, nhẹ nhàng" /></label><label>Mô tả<textarea value={customPersonaPrompt} maxLength={800} onChange={(e) => setCustomPersonaPrompt(e.target.value)} placeholder="Mô tả cách bạn muốn trợ lý phản hồi..." /></label></div>}
            </section>
          </div>
        </aside>
      </div>}

      <style>{`
        .chat-page{min-height:100vh;background:#f7f9fc;color:#17243a}.chat-nav{height:70px;padding:0 28px;border-bottom:1px solid #e8ecf2;background:rgba(255,255,255,.9);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:20}.chat-brand{display:flex;align-items:center;gap:9px;font-size:17px;letter-spacing:-.03em}.chat-brand>span{width:26px;height:26px;border-radius:9px;display:grid;place-items:center;font-size:9px;color:#fff;background:linear-gradient(145deg,#235ee7,#7657df)}.chat-nav-actions{display:flex;align-items:center;gap:15px}.privacy-status{display:flex;align-items:center;gap:7px;color:#68778c;font-size:12px;font-weight:750}.privacy-status i{width:7px;height:7px;border-radius:50%;background:#31a86e;box-shadow:0 0 0 4px #e8f7ef}.nav-icon{width:38px;height:38px;border-radius:12px;border:1px solid #dfe5ee;background:#fff;color:#273a57;font-size:17px;cursor:pointer}.chat-workspace{width:min(900px,calc(100% - 36px));min-height:calc(100vh - 70px);margin:auto;display:grid;grid-template-rows:auto auto auto 1fr auto;padding:38px 0 26px}.conversation-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:0 8px 25px}.conversation-heading h1{font-size:28px;letter-spacing:-.04em;margin:0 0 5px}.conversation-heading p{margin:0;color:#7b8798;font-size:13px}.quiet-action{border:0;background:transparent;color:#718097;font-size:12px;font-weight:700;cursor:pointer;padding:8px}.quiet-action:hover{color:#b03c3c}.quiet-action:disabled{opacity:.45;cursor:not-allowed}.delete-chat-button{display:inline-flex;align-items:center;gap:6px;border:1px solid #eadede;background:#fffafa;border-radius:11px;padding:9px 12px;color:#9a3838}.delete-chat-button:hover:not(:disabled){background:#fff1f1;border-color:#e9caca;color:#842828}.inline-alert,.urgent-banner,.sensitive-banner{margin:0 8px 16px;border-radius:14px;padding:13px 15px;font-size:13px}.inline-alert{color:#912f2f;background:#fff1f1;border:1px solid #f8d6d6}.urgent-banner,.sensitive-banner{display:grid;gap:4px;color:#743613;background:#fff6e8;border:1px solid #f4d4b5}.sensitive-banner{color:#624b12;background:#fffbed;border:1px solid #f0dfa4}.persona-description{padding:12px 13px;border-radius:12px;background:#f4f7fc;border:1px solid #e1e8f3}.persona-description strong{font-size:12px;color:#243b63}.persona-description p{margin:5px 0 0;color:#6f7f96;font-size:11px;line-height:1.55}.message-stream{min-height:480px;padding:10px 8px 30px;display:flex;flex-direction:column;gap:18px}.chat-message{display:flex;align-items:flex-end;gap:10px;max-width:78%;animation:message-in .35s both}.chat-message.user{margin-left:auto}.assistant-mark{width:30px;height:30px;flex:0 0 auto;border-radius:10px;background:#e9efff;color:#235ee7;display:grid;place-items:center;font-size:12px;font-weight:900}.message-content{position:relative;padding:13px 15px;border-radius:18px;font-size:14px;line-height:1.68;white-space:pre-wrap;box-shadow:0 6px 18px rgba(20,37,68,.045)}.message-delete{position:absolute;top:-10px;right:-10px;width:28px;height:28px;border-radius:50%;border:1px solid #dce3ec;background:#fff;color:#8a5660;cursor:pointer;opacity:0}.chat-message:hover .message-delete,.message-delete:focus{opacity:1}.assistant .message-content{background:#fff;border:1px solid #e5eaf1;border-bottom-left-radius:6px}.user .message-content{background:#235ee7;color:#fff;border-bottom-right-radius:6px}.starter-row{display:flex;flex-wrap:wrap;gap:8px;padding-left:40px;margin-top:2px}.starter-row button{border:1px solid #dde4ee;background:#fff;color:#53637a;border-radius:999px;padding:9px 12px;font-size:12px;cursor:pointer;transition:.2s ease}.starter-row button:hover{border-color:#b9c9ea;color:#235ee7;transform:translateY(-1px)}.typing-indicator{padding:14px 16px;background:#fff;border:1px solid #e5eaf1;border-radius:18px;display:flex;gap:5px}.typing-indicator span{width:6px;height:6px;border-radius:50%;background:#95a4b8;animation:dot 1.1s infinite}.typing-indicator span:nth-child(2){animation-delay:.15s}.typing-indicator span:nth-child(3){animation-delay:.3s}.composer-wrap{position:sticky;bottom:0;padding:12px 8px 0;background:linear-gradient(180deg,rgba(247,249,252,0),#f7f9fc 24%)}.composer-box{background:#fff;border:1px solid #dfe5ee;border-radius:19px;padding:13px 13px 10px;box-shadow:0 18px 45px rgba(20,37,68,.1);transition:border-color .2s,box-shadow .2s}.composer-box:focus-within{border-color:#9cb8f3;box-shadow:0 20px 50px rgba(35,94,231,.13)}.composer-box textarea{width:100%;resize:none;border:0;outline:0;background:transparent;color:#17243a;line-height:1.6;padding:0 3px;min-height:66px}.composer-box textarea::placeholder{color:#9aa5b3}.composer-bottom{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:7px}.composer-bottom>span{color:#9aa5b3;font-size:10px}.composer-bottom button{width:36px;height:36px;border:0;border-radius:12px;background:#235ee7;color:#fff;font-size:20px;cursor:pointer;transition:.2s}.composer-bottom button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 18px rgba(35,94,231,.25)}.composer-bottom button:disabled{opacity:.35;cursor:not-allowed}.safety-note{text-align:center;color:#98a3b1;font-size:10px;margin:10px 0 0}.confirm-layer{position:fixed;inset:0;z-index:70;background:rgba(16,27,46,.42);backdrop-filter:blur(5px);display:grid;place-items:center;padding:20px;animation:fade-in .2s both}.confirm-dialog{width:min(430px,100%);background:#fff;border:1px solid #e5e9ef;border-radius:22px;padding:26px;box-shadow:0 28px 80px rgba(18,34,61,.22);text-align:center}.confirm-icon{width:48px;height:48px;margin:0 auto 14px;border-radius:15px;display:grid;place-items:center;background:#fff0f0;color:#a83333;font-size:24px;font-weight:900}.confirm-dialog h2{margin:0;font-size:21px;letter-spacing:-.025em}.confirm-dialog p{margin:10px 0 22px;color:#6f7d90;font-size:13px;line-height:1.6}.confirm-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.confirm-actions button{border-radius:12px;padding:11px 14px;font-weight:800;cursor:pointer}.confirm-actions button:disabled{opacity:.55;cursor:not-allowed}.cancel-button{border:1px solid #dfe5ed;background:#fff;color:#536177}.danger-button{border:1px solid #a83232;background:#a83232;color:#fff}.danger-button:hover:not(:disabled){background:#8d2929}.drawer-layer{position:fixed;inset:0;background:rgba(16,27,46,.3);backdrop-filter:blur(4px);z-index:50;display:flex;justify-content:flex-end;animation:fade-in .2s both}.settings-drawer{width:min(440px,100%);height:100%;background:#f7f9fc;border-left:1px solid #e2e7ee;box-shadow:-25px 0 70px rgba(18,34,61,.16);animation:drawer-in .3s cubic-bezier(.2,.8,.2,1) both}.drawer-head{height:76px;padding:0 20px 0 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e4e9f0;background:#fff}.drawer-head>div{display:grid;gap:3px}.drawer-head strong{font-size:16px}.drawer-head span{color:#7a8799;font-size:11px}.drawer-head button{width:36px;height:36px;border:0;border-radius:11px;background:#f0f3f7;color:#55647a;font-size:23px;cursor:pointer}.drawer-scroll{height:calc(100% - 76px);overflow:auto;padding:16px;display:grid;gap:14px;align-content:start}.settings-card{background:#fff;border:1px solid #e3e8ef;border-radius:18px;padding:16px;display:grid;gap:13px}.settings-title{font-size:14px;font-weight:850}.settings-card label{display:grid;gap:6px;color:#536177;font-size:11px;font-weight:750}.settings-card input,.settings-card select,.settings-card textarea{width:100%;border:1px solid #dce3ec;border-radius:11px;padding:10px;background:#fff;color:#17243a}.settings-card textarea{min-height:100px;resize:vertical}.switch-row{grid-template-columns:1fr auto!important;align-items:center;padding:11px 0;border-top:1px solid #edf0f4;border-bottom:1px solid #edf0f4}.switch-row>span{display:grid;gap:3px}.switch-row small{font-weight:500;color:#8a95a4}.switch-row input{width:18px;height:18px}.custom-fields{display:grid;gap:12px}.data-action{min-height:44px;border:1px solid #cdd9ef;background:#f7faff;color:#2858bd;border-radius:11px;font-weight:800;cursor:pointer}.conversation-list{display:grid;gap:8px}.conversation-list>div{display:grid;grid-template-columns:1fr 44px;gap:6px}.conversation-list button{min-height:44px;border:1px solid #e1e7ef;background:#fff;border-radius:10px;text-align:left;padding:8px;cursor:pointer}.conversation-list button:first-child{display:grid}.conversation-list small{color:#8491a3}.conversation-list button:last-child{text-align:center;font-size:16px}@keyframes message-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes dot{0%,80%,100%{opacity:.35;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes drawer-in{from{transform:translateX(100%)}to{transform:none}}@media(max-width:650px){.chat-nav{padding:0 16px}.privacy-status{display:none}.chat-workspace{width:100%;padding:24px 12px 16px}.conversation-heading{align-items:flex-start}.conversation-heading h1{font-size:24px}.quiet-action{font-size:12px}.delete-chat-button span{display:none}.confirm-actions{grid-template-columns:1fr}.sensitive-banner{color:#624b12;background:#fffbed;border:1px solid #f0dfa4}.persona-description{padding:12px 13px;border-radius:12px;background:#f4f7fc;border:1px solid #e1e8f3}.persona-description strong{font-size:12px;color:#243b63}.persona-description p{margin:5px 0 0;color:#6f7f96;font-size:11px;line-height:1.55}.message-stream{min-height:430px}.chat-message{max-width:90%}.starter-row{padding-left:0}.composer-wrap{padding-left:0;padding-right:0}.settings-drawer{width:100%}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
      `}</style>
    </main>
  );
}
