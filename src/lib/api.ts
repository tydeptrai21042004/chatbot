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
      cache: "no-store"
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
    cache: "no-store"
  });

  const data = (await response.json()) as SessionMessagesResponse & {
    error?: string;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Không tải được lịch sử hội thoại.");
  }

  return data;
}

export async function deleteSession(sessionId:string):Promise<void>{
  const response=await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`,{method:"DELETE",cache:"no-store"});
  if(!response.ok) throw new Error("Không thể xoá phiên chat.");
}
