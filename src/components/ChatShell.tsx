"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatResponse, PublicRole, RoleId } from "../lib/api";
import { fetchRoles, fetchSessionMessages, sendChat } from "../lib/api";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const QUICK_ACTIONS = [
  "Em đang rất hoảng.",
  "Em đang thấy không an toàn.",
  "Em cần một người lắng nghe.",
  "Em bị áp lực từ gia đình.",
  "Em không biết phải làm gì tiếp."
];

const INITIAL_MESSAGE =
  "Chào em. Ở đây em có thể chia sẻ bằng tiếng Việt theo cách tự nhiên nhất. Hệ thống sẽ cố gắng phản hồi ngắn gọn, rõ ràng và ưu tiên an toàn cho em.";

const SESSION_STORAGE_KEY = "clinic-chat-session-id";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function formatMessageText(text: string) {
  const lines = text.split("\n");

  return lines.map((line, index) => (
    <span key={`line-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

export default function ChatShell() {
  const [roles, setRoles] = useState<PublicRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleId>("co-van-hoc-duong");
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window === "undefined") return createSessionId();
    return window.localStorage.getItem(SESSION_STORAGE_KEY) || createSessionId();
  });

  const [input, setInput] = useState("");
  const [customPersonaEnabled, setCustomPersonaEnabled] = useState(false);
  const [customPersonaName, setCustomPersonaName] = useState("");
  const [customPersonaPrompt, setCustomPersonaPrompt] = useState("");

  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: uid(),
      role: "assistant",
      content: INITIAL_MESSAGE
    }
  ]);

  const [loadingRoles, setLoadingRoles] = useState(true);
  const [sending, setSending] = useState(false);
  const [topError, setTopError] = useState("");
  const [memoryNotice, setMemoryNotice] = useState("");

  const [lastMeta, setLastMeta] = useState<{
    mode: ChatResponse["mode"];
    riskLevel: ChatResponse["riskLevel"];
    usedFallback?: boolean;
    summaryUpdated?: boolean;
    hasSummary?: boolean;
    stableFactsCount?: number;
    customPersonaActive?: boolean;
    customPersonaName?: string;
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await fetchRoles();
        setRoles(data.roles);
        setSelectedRole(data.defaultRoleId);
      } catch {
        setTopError(
          "Không tải được danh sách phong cách hỗ trợ. Ứng dụng đang dùng cấu hình mặc định."
        );
      } finally {
        setLoadingRoles(false);
      }
    };

    void loadRoles();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const data = await fetchSessionMessages(sessionId);

        if (cancelled) return;

        if (data.messages.length > 0) {
          setMessages(
            data.messages.map((message) => ({
              id: uid(),
              role: message.role,
              content: message.content
            }))
          );
        }
      } catch {
        // Không làm gì nếu chưa có session trong DB hoặc tải thất bại
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [messages, sending, lastMeta, memoryNotice]);

  const selectedRoleInfo = useMemo(
    () => roles.find((role) => role.id === selectedRole),
    [roles, selectedRole]
  );

  const resolvedSupportStyleName = customPersonaEnabled
    ? customPersonaName.trim() || "Phong cách tự tạo"
    : loadingRoles
      ? "Đang tải..."
      : selectedRoleInfo?.name || "Cố vấn học đường";

  const resolvedSupportStyleDescription = customPersonaEnabled
    ? "Phong cách này chỉ áp dụng cho phiên chat hiện tại và vẫn luôn bị ràng buộc bởi quy tắc an toàn."
    : selectedRoleInfo?.description || "Hỗ trợ thực tế, phù hợp với bối cảnh học sinh.";

  const trimmedInput = input.trim();
  const trimmedCustomPersonaPrompt = customPersonaPrompt.trim();

  const canSend =
    trimmedInput.length > 0 &&
    !sending &&
    (!customPersonaEnabled || trimmedCustomPersonaPrompt.length >= 10);

  function resetConversationState() {
    const nextSessionId = createSessionId();
    setSessionId(nextSessionId);

    setMessages([
      {
        id: uid(),
        role: "assistant",
        content: "Mình đã xoá đoạn chat hiện tại. Em có thể bắt đầu lại bất cứ lúc nào."
      }
    ]);
    setInput("");
    setTopError("");
    setMemoryNotice("");
    setLastMeta(null);
  }

  function clearConversation() {
    resetConversationState();
    textareaRef.current?.focus();
  }

  async function handleSend(prefilledText?: string) {
    const finalText = (prefilledText ?? input).trim();
    if (!finalText || sending) return;

    if (customPersonaEnabled && trimmedCustomPersonaPrompt.length < 10) {
      setTopError(
        "Khi bật phong cách tự tạo, em cần nhập mô tả phong cách ít nhất 10 ký tự."
      );
      return;
    }

    setTopError("");
    setMemoryNotice("");
    setSending(true);

    const userMessage: UiMessage = {
      id: uid(),
      role: "user",
      content: finalText
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const data = await sendChat({
        sessionId,
        message: finalText,
        roleId: selectedRole,
        customPersonaEnabled,
        customPersonaName: customPersonaName.trim(),
        customPersonaPrompt: trimmedCustomPersonaPrompt
      });

      const assistantMessage: UiMessage = {
        id: uid(),
        role: "assistant",
        content: data.reply
      };

      setMessages((prev) => [...prev, assistantMessage]);

      setLastMeta({
        mode: data.mode,
        riskLevel: data.riskLevel,
        usedFallback: data.usedFallback,
        summaryUpdated: data.memory?.summaryUpdated,
        hasSummary: data.memory?.hasSummary,
        stableFactsCount: data.memory?.stableFactsCount,
        customPersonaActive: data.customPersona?.active,
        customPersonaName: data.customPersona?.name
      });

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
      }

      if (data.memory?.summaryUpdated) {
        setMemoryNotice(
          data.memory.usedFallbackSummary
            ? "Hệ thống vừa nén bớt lịch sử hội thoại bằng chế độ dự phòng để giữ ngữ cảnh gọn hơn."
            : "Hệ thống vừa nén bớt lịch sử hội thoại để giữ ngữ cảnh dài hạn ổn định hơn."
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Có lỗi xảy ra khi gửi tin nhắn.";

      setTopError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content:
            "Xin lỗi, hiện tại hệ thống đang gặp trục trặc nhỏ. Em có thể thử gửi lại sau vài giây."
        }
      ]);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleTextareaKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <main className="page-shell">
      <section className="top-note" aria-label="Thông báo hệ thống">
        <div className="top-note-badge">Lưu ý</div>
        <p>
          Đây là công cụ hỗ trợ ban đầu, không thay thế bác sĩ, nhà trị liệu hoặc dịch vụ
          cấp cứu. Khi em thấy bản thân không an toàn, hãy ưu tiên tìm người hỗ trợ thực
          tế ngay lập tức.
        </p>
      </section>

      <section className="hero-card">
        <div className="hero-left">
          <div className="brand-pill">Hỗ trợ học sinh </div>
          <h1>Không cần phải ổn ngay lúc này.</h1>
          <p>
            Em có thể chia sẻ ngắn hoặc dài, theo cách tự nhiên nhất. Hệ thống sẽ cố gắng
            phản hồi rõ ràng, nhẹ nhàng và ưu tiên những bước có thể làm được ngay.
          </p>
        </div>

        <div className="hero-right" aria-label="Tình trạng phiên chat">
          <div className="mini-card">
            <div className="mini-label">Phong cách đang dùng</div>
            <div className="mini-value">{resolvedSupportStyleName}</div>
          </div>
        </div>
      </section>

      <section className="chat-layout">
        <aside className="side-panel">
          <div className="panel-card">
            <div className="panel-title">Phong cách hỗ trợ</div>
            <div className="panel-desc">
              Em có thể dùng phong cách có sẵn hoặc tự điều chỉnh cách chatbot phản hồi
              trong phiên hiện tại.
            </div>

            <label className="field-label" htmlFor="support-role">
              Chọn phong cách có sẵn
            </label>
            <select
              id="support-role"
              className="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as RoleId)}
              disabled={loadingRoles || sending || customPersonaEnabled}
              aria-label="Chọn phong cách hỗ trợ"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={customPersonaEnabled}
                onChange={(e) => setCustomPersonaEnabled(e.target.checked)}
                disabled={sending}
              />
              <span>Tự chỉnh phong cách phản hồi</span>
            </label>

            <div className="role-info">
              <div className="role-name">{resolvedSupportStyleName}</div>
              <div className="role-description">{resolvedSupportStyleDescription}</div>
            </div>

            {customPersonaEnabled ? (
              <div className="custom-persona-box">
                <label className="field-label" htmlFor="custom-style-name">
                  Tên phong cách
                </label>
                <input
                  id="custom-style-name"
                  className="custom-input"
                  type="text"
                  placeholder="Ví dụ: Người chị ấm áp"
                  value={customPersonaName}
                  onChange={(e) => setCustomPersonaName(e.target.value)}
                  disabled={sending}
                  maxLength={60}
                  autoComplete="off"
                />

                <label className="field-label" htmlFor="custom-style-prompt">
                  Mô tả phong cách phản hồi
                </label>
                <textarea
                  id="custom-style-prompt"
                  className="custom-textarea"
                  rows={5}
                  placeholder="Ví dụ: nói nhẹ nhàng, ngắn gọn, ưu tiên trấn an trước rồi mới gợi ý từng bước..."
                  value={customPersonaPrompt}
                  onChange={(e) => setCustomPersonaPrompt(e.target.value)}
                  disabled={sending}
                  maxLength={600}
                />

                <div className="helper-inline">
                  Ít nhất 10 ký tự. Nên mô tả ngắn gọn và rõ ràng.
                </div>
              </div>
            ) : null}
          </div>

          <div className="panel-card">
            <div className="panel-title">Gợi ý nhanh</div>
            <div className="quick-actions">
              {QUICK_ACTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="quick-action"
                  onClick={() => {
                    setInput(item);
                    textareaRef.current?.focus();
                  }}
                  disabled={sending}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-title">Lưu ý khi sử dụng</div>
            <ul className="note-list">
              <li>Đây là hỗ trợ ban đầu, không thay thế chuyên gia điều trị.</li>
              <li>Khi em thấy không an toàn, hãy ưu tiên tìm người hỗ trợ thực tế.</li>
              <li>Không cần viết dài. Một câu ngắn cũng đủ để bắt đầu.</li>
            </ul>
          </div>
        </aside>

        <section className="chat-card" aria-busy={sending}>
          <div className="chat-header">
            <div>
              <div className="chat-title">Phòng chat hỗ trợ</div>
              <div className="chat-subtitle">
                Em có thể nhắn theo cách tự nhiên. Hệ thống ưu tiên phản hồi ngắn,
                dễ hiểu và có thể làm theo từng bước.
              </div>
            </div>

            <button type="button" className="ghost-button" onClick={clearConversation}>
              Xoá chat
            </button>
          </div>

          {topError || memoryNotice || lastMeta?.customPersonaActive || lastMeta?.mode === "help_now" ? (
            <div className="status-stack">
              {topError ? (
                <div className="top-error" role="alert">
                  {topError}
                </div>
              ) : null}

              {memoryNotice ? (
                <div className="memory-banner" role="status">
                  {memoryNotice}
                </div>
              ) : null}

              {lastMeta?.customPersonaActive ? (
                <div className="memory-banner" role="status">
                  Đang dùng phong cách tự tạo:{" "}
                  <strong>{lastMeta.customPersonaName || "Phong cách tự tạo"}</strong>
                </div>
              ) : null}

              {lastMeta?.mode === "help_now" ? (
                <div className="help-banner" role="alert">
                  <div className="help-banner-title">Ưu tiên an toàn</div>
                  <div className="help-banner-text">
                    Hệ thống vừa chuyển sang chế độ hỗ trợ khẩn hơn vì tin nhắn có dấu
                    hiệu nguy cơ cao.
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            className="messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-row ${message.role === "user" ? "user" : "assistant"}`}
              >
                <div className={`bubble ${message.role === "user" ? "user" : "assistant"}`}>
                  <div className="bubble-label">
                    {message.role === "user" ? "Bạn" : "Hỗ trợ"}
                  </div>
                  <div className="bubble-text">{formatMessageText(message.content)}</div>
                </div>
              </div>
            ))}

            {sending ? (
              <div className="message-row assistant">
                <div className="bubble assistant">
                  <div className="bubble-label">Hỗ trợ</div>
                  <div className="typing" aria-label="Đang soạn phản hồi">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div className="composer">
            <label className="field-label" htmlFor="chat-input">
              Nội dung chia sẻ
            </label>

            <textarea
              id="chat-input"
              ref={textareaRef}
              className="composer-input"
              rows={4}
              placeholder="Ví dụ: Em đang rất mệt và không biết phải nói với ai..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              disabled={sending}
              aria-label="Nhập nội dung tin nhắn"
            />

            <div className="composer-footer">
              <div className="helper-text">
                Enter để gửi · Shift + Enter để xuống dòng
              </div>

              <button
                type="button"
                className="send-button"
                onClick={() => void handleSend()}
                disabled={!canSend}
              >
                {sending ? "Đang gửi..." : "Gửi tin nhắn"}
              </button>
            </div>
          </div>
        </section>
      </section>

      <style jsx>{`
        .page-shell {
          min-height: 100vh;
          padding: 24px 20px 32px;
        }

        .top-note {
          max-width: 1280px;
          margin: 0 auto 16px;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255, 248, 235, 0.9);
          border: 1px solid rgba(227, 188, 106, 0.35);
          color: #6d4c13;
          display: grid;
          gap: 8px;
          box-shadow: 0 10px 24px rgba(39, 49, 74, 0.05);
        }

        .top-note p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }

        .top-note-badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.65);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .hero-card {
          max-width: 1280px;
          margin: 0 auto 18px;
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(280px, 360px);
          gap: 18px;
          align-items: stretch;
        }

        .hero-left,
        .hero-right,
        .panel-card,
        .chat-card {
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(20, 39, 74, 0.08);
          box-shadow: 0 16px 40px rgba(17, 30, 61, 0.08);
          border-radius: 24px;
        }

        .hero-left {
          padding: 28px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 220px;
        }

        .hero-left h1 {
          margin: 14px 0 12px;
          font-size: clamp(30px, 4vw, 44px);
          line-height: 1.04;
          letter-spacing: -0.03em;
          color: #101a2b;
          max-width: 11ch;
        }

        .hero-left p {
          margin: 0;
          font-size: 15px;
          line-height: 1.72;
          color: #5e6d85;
          max-width: 720px;
        }

        .brand-pill {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          min-height: 36px;
          border-radius: 999px;
          padding: 0 14px;
          background: rgba(33, 94, 234, 0.08);
          color: #23427d;
          border: 1px solid rgba(33, 94, 234, 0.12);
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.01em;
        }

        .hero-right {
          padding: 16px;
          display: grid;
          gap: 12px;
        }

        .mini-card {
          border-radius: 18px;
          padding: 16px;
          background: rgba(248, 251, 255, 0.92);
          border: 1px solid rgba(20, 39, 74, 0.07);
        }

        .mini-label {
          font-size: 12px;
          color: #73829a;
          margin-bottom: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .mini-value {
          font-size: 18px;
          line-height: 1.35;
          color: #13284c;
          font-weight: 800;
        }

        .chat-layout {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .side-panel {
          display: grid;
          gap: 16px;
          align-self: start;
          position: sticky;
          top: 20px;
        }

        .panel-card {
          padding: 18px;
        }

        .panel-title {
          font-size: 17px;
          font-weight: 800;
          color: #12284e;
          margin-bottom: 8px;
          letter-spacing: -0.01em;
        }

        .panel-desc {
          font-size: 14px;
          line-height: 1.6;
          color: #62738f;
          margin-bottom: 14px;
        }

        .field-label {
          display: inline-block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #36507d;
        }

        .role-select,
        .custom-input,
        .custom-textarea,
        .composer-input {
          width: 100%;
          border: 1px solid #d7e1f2;
          background: rgba(255, 255, 255, 0.96);
          border-radius: 16px;
          padding: 12px 14px;
          color: #132a50;
          outline: none;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background-color 0.18s ease;
        }

        .role-select:hover,
        .custom-input:hover,
        .custom-textarea:hover,
        .composer-input:hover {
          border-color: #bfd0ee;
        }

        .role-select:focus,
        .custom-input:focus,
        .custom-textarea:focus,
        .composer-input:focus {
          border-color: #78a5ff;
          box-shadow: 0 0 0 4px rgba(120, 165, 255, 0.14);
          background: #ffffff;
        }

        .toggle-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
          color: #29406b;
          font-size: 14px;
          font-weight: 700;
        }

        .toggle-row input {
          width: 16px;
          height: 16px;
        }

        .role-info {
          margin-top: 14px;
          border-radius: 16px;
          background: #f7faff;
          border: 1px solid #e0e9f8;
          padding: 14px;
        }

        .role-name {
          font-weight: 800;
          color: #17305b;
          margin-bottom: 6px;
        }

        .role-description {
          font-size: 14px;
          line-height: 1.6;
          color: #5b6e8e;
        }

        .custom-persona-box {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }

        .custom-textarea {
          resize: vertical;
          min-height: 120px;
        }

        .helper-inline {
          font-size: 12px;
          line-height: 1.5;
          color: #72829a;
        }

        .quick-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .quick-action {
          border: 1px solid rgba(33, 94, 234, 0.10);
          border-radius: 999px;
          padding: 10px 12px;
          background: #f7faff;
          color: #27406e;
          cursor: pointer;
          font-size: 14px;
          line-height: 1.3;
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            border-color 0.15s ease,
            background-color 0.15s ease;
        }

        .quick-action:hover {
          transform: translateY(-1px);
          background: #ffffff;
          border-color: rgba(33, 94, 234, 0.18);
          box-shadow: 0 10px 24px rgba(17, 30, 61, 0.08);
        }

        .quick-action:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .note-list {
          margin: 0;
          padding-left: 18px;
          color: #596b87;
          line-height: 1.72;
          font-size: 14px;
        }

        .chat-card {
          min-height: 760px;
          display: grid;
          grid-template-rows: auto auto 1fr auto;
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          padding: 20px 20px 16px;
          border-bottom: 1px solid rgba(20, 39, 74, 0.08);
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(10px);
        }

        .chat-title {
          font-size: 22px;
          font-weight: 800;
          color: #12284e;
          margin-bottom: 6px;
          letter-spacing: -0.02em;
        }

        .chat-subtitle {
          font-size: 14px;
          line-height: 1.6;
          color: #62738f;
          max-width: 680px;
        }

        .ghost-button {
          border: 1px solid #d7e1f2;
          background: #ffffff;
          color: #284069;
          border-radius: 14px;
          padding: 10px 14px;
          cursor: pointer;
          font-weight: 700;
          transition:
            background-color 0.15s ease,
            border-color 0.15s ease,
            transform 0.15s ease;
        }

        .ghost-button:hover {
          background: #f8fbff;
          border-color: #bfd0ee;
          transform: translateY(-1px);
        }

        .status-stack {
          display: grid;
          gap: 10px;
          padding: 14px 20px 0;
        }

        .top-error,
        .memory-banner,
        .help-banner {
          margin: 0;
        }

        .top-error {
          padding: 14px 16px;
          border-radius: 16px;
          background: #fff5f3;
          border: 1px solid #ffd8d2;
          color: #8a3324;
          font-size: 14px;
          line-height: 1.55;
        }

        .memory-banner {
          padding: 14px 16px;
          border-radius: 16px;
          background: #eff6ff;
          border: 1px solid #d6e7ff;
          color: #244a7a;
          font-size: 14px;
          line-height: 1.55;
        }

        .help-banner {
          padding: 16px 18px;
          border-radius: 18px;
          background: linear-gradient(180deg, #fff6e9 0%, #fff1ea 100%);
          border: 1px solid #ffd9bf;
        }

        .help-banner-title {
          font-size: 16px;
          font-weight: 800;
          color: #7f3515;
          margin-bottom: 6px;
        }

        .help-banner-text {
          color: #87452b;
          line-height: 1.55;
          font-size: 14px;
        }

        .messages {
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          scroll-behavior: smooth;
          background:
            linear-gradient(
              180deg,
              rgba(248, 251, 255, 0.42),
              rgba(255, 255, 255, 0)
            );
        }

        .message-row {
          display: flex;
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .message-row.assistant {
          justify-content: flex-start;
        }

        .bubble {
          max-width: min(76%, 760px);
          border-radius: 22px;
          padding: 14px 16px;
          box-shadow: 0 10px 24px rgba(17, 30, 61, 0.06);
        }

        .bubble.user {
          background: linear-gradient(180deg, #2d6cf6 0%, #1f5ee9 100%);
          color: #ffffff;
          border-bottom-right-radius: 8px;
        }

        .bubble.assistant {
          background: #ffffff;
          color: #1c2b45;
          border: 1px solid #e1e8f5;
          border-bottom-left-radius: 8px;
        }

        .bubble-label {
          font-size: 11px;
          font-weight: 800;
          opacity: 0.8;
          margin-bottom: 8px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .bubble-text {
          font-size: 15px;
          line-height: 1.72;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .typing {
          display: inline-flex;
          gap: 6px;
          align-items: center;
          min-height: 20px;
        }

        .typing span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #9ab0d8;
          animation: blink 1.2s infinite ease-in-out;
        }

        .typing span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing span:nth-child(3) {
          animation-delay: 0.3s;
        }

        .composer {
          border-top: 1px solid rgba(20, 39, 74, 0.08);
          padding: 16px 20px 20px;
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(10px);
        }

        .composer-input {
          resize: vertical;
          min-height: 112px;
          line-height: 1.65;
          color: #1b2a44;
        }

        .composer-footer {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .helper-text {
          font-size: 13px;
          color: #6f7f96;
        }

        .send-button {
          border: none;
          border-radius: 16px;
          min-height: 46px;
          padding: 12px 18px;
          background: linear-gradient(180deg, #2d6cf6 0%, #1f5ee9 100%);
          color: #ffffff;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 14px 26px rgba(33, 94, 234, 0.22);
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            opacity 0.15s ease;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 32px rgba(33, 94, 234, 0.24);
        }

        .send-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        @keyframes blink {
          0%,
          80%,
          100% {
            transform: scale(0.7);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @media (max-width: 1180px) {
          .hero-card {
            grid-template-columns: 1fr;
          }

          .chat-layout {
            grid-template-columns: 1fr;
          }

          .side-panel {
            position: static;
            order: 2;
          }

          .chat-card {
            order: 1;
          }
        }

        @media (max-width: 700px) {
          .page-shell {
            padding: 16px 12px 20px;
          }

          .hero-left,
          .hero-right,
          .panel-card,
          .chat-card,
          .top-note {
            border-radius: 20px;
          }

          .hero-left {
            padding: 22px 18px;
            min-height: auto;
          }

          .hero-left h1 {
            font-size: 32px;
            max-width: none;
          }

          .chat-header {
            flex-direction: column;
            align-items: stretch;
          }

          .messages {
            padding: 16px;
          }

          .bubble {
            max-width: 92%;
            padding: 13px 14px;
          }

          .composer {
            padding: 14px 16px 16px;
          }

          .composer-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .send-button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
