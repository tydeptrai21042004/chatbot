export type RoleId =
  | "nguoi-ban-diu-dang"
  | "tham-van-binh-tinh"
  | "co-van-hoc-duong"
  | "lang-nghe-khong-phan-xet";

export interface PublicRole {
  id: RoleId;
  name: string;
  description: string;
}

export interface RolesResponse {
  ok: boolean;
  defaultRoleId: RoleId;
  roles: PublicRole[];
}

export interface CrisisFlags {
  selfHarm: boolean;
  suicide: boolean;
  violence: boolean;
  coercion: boolean;
  panic: boolean;
  immediateDanger: boolean;
}

export interface CrisisAssessment {
  riskLevel: "safe" | "distress" | "high_risk";
  shouldBypassModel: boolean;
  matchedTerms: string[];
  reasons: string[];
  flags: CrisisFlags;
}

export interface ChatMemoryMeta {
  summaryUpdated: boolean;
  stableFactsCount: number;
  hasSummary: boolean;
  recentTurnsCount: number;
  usedFallbackSummary?: boolean;
}

export interface ChatResponse {
  ok: boolean;
  sessionId: string;
  mode: "normal" | "help_now" | "fallback";
  riskLevel: "safe" | "distress" | "high_risk";
  roleId: RoleId;
  reply: string;
  crisis: CrisisAssessment;
  sensitiveContent?: {
    detected: boolean;
    matchedTerms: string[];
    sanitizedText: string;
    warning?: string;
  };
  usedFallback?: boolean;
  memory?: ChatMemoryMeta;
  customPersona?: {
    active: boolean;
    name?: string;
  };
}

export interface SendChatPayload {
  sessionId: string;
  message: string;
  roleId: RoleId;
  customPersonaEnabled?: boolean;
  customPersonaName?: string;
  customPersonaPrompt?: string;
}

export interface SessionMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface SessionMessagesResponse {
  ok: boolean;
  sessionId: string;
  messages: SessionMessage[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

export interface AuthIdentity {
  id: string;
  role: "guest" | "student" | "teacher";
  name: string;
  email?: string;
  mustChangePassword?: boolean;
}

export async function initializeAuth(): Promise<AuthIdentity> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin"
  });
  const data = (await response.json()) as { ok?: boolean; identity?: AuthIdentity; error?: string };
  if (!response.ok || !data.ok || !data.identity) {
    throw new Error(data.error || "Không thể khởi tạo phiên riêng tư.");
  }
  return data.identity;
}

const DEFAULT_ROLES: PublicRole[] = [
  {
    id: "nguoi-ban-diu-dang",
    name: "Người bạn dịu dàng",
    description: "Ấm áp, nhẹ nhàng, gần gũi."
  },
  {
    id: "tham-van-binh-tinh",
    name: "Tham vấn bình tĩnh",
    description: "Điềm tĩnh, rõ ràng, theo từng bước."
  },
  {
    id: "co-van-hoc-duong",
    name: "Cố vấn học đường",
    description: "Thực tế, phù hợp bối cảnh sinh viên."
  },
  {
    id: "lang-nghe-khong-phan-xet",
    name: "Lắng nghe không phán xét",
    description: "Phản hồi chậm, tôn trọng cảm xúc."
  }
];

export async function fetchRoles(): Promise<RolesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      credentials: "same-origin"
    });

    const data = (await response.json()) as RolesResponse;

    if (!response.ok || !data.ok) {
      throw new Error("Không tải được danh sách vai trò.");
    }

    return data;
  } catch {
    return {
      ok: true,
      defaultRoleId: "co-van-hoc-duong",
      roles: DEFAULT_ROLES
    };
  }
}

export async function sendChat(payload: SendChatPayload): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store",
    credentials: "same-origin",
    body: JSON.stringify(payload)
  });

  const data = (await response.json()) as ChatResponse & {
    error?: string;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Không gửi được tin nhắn.");
  }

  return data;
}

export async function fetchSessionMessages(
  sessionId: string
): Promise<SessionMessagesResponse> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store",
    credentials: "same-origin"
  });

  const data = (await response.json()) as SessionMessagesResponse & {
    error?: string;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Không tải được lịch sử hội thoại.");
  }

  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE", cache: "no-store", credentials: "same-origin" }
  );
  const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Không thể xóa đoạn chat.");
  }
}

export interface ConversationListItem { sessionId:string; title:string; roleId:RoleId; createdAt:number; updatedAt:number; }
export async function fetchSessions(query=""):Promise<ConversationListItem[]>{const r=await fetch(`${API_BASE_URL}/sessions?q=${encodeURIComponent(query)}`,{cache:"no-store",credentials:"same-origin"});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Không tải được danh sách trò chuyện");return d.sessions;}
export async function renameSession(sessionId:string,title:string){const r=await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/title`,{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({title})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Không đổi được tên trò chuyện");}
export async function deleteMessage(sessionId:string,messageId:string){const r=await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(messageId)}`,{method:"DELETE",credentials:"same-origin"});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Không xóa được tin nhắn");}
export async function exportMyData(){const r=await fetch(`${API_BASE_URL}/me/export`,{credentials:"same-origin",cache:"no-store"});if(!r.ok)throw new Error("Không xuất được dữ liệu");const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`du-lieu-ca-nhan-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);}
