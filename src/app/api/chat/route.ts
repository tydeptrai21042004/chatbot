import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readIdentity } from "@/src/server/auth/auth";
import { checkRateLimit } from "@/src/server/utils/rateLimit";

import {
  DEFAULT_ROLE_ID,
  PERSONAS,
  getPersonaById
} from "@/src/server/prompts/personas";
import {
  composeSystemPrompt,
  createHelpNowReply,
  postProcessAssistantReply
} from "@/src/server/prompts/safety";
import { generateChatReply } from "@/src/server/services/gemini";
import {
  appendTurnToSession,
  buildMemoryContext,
  refreshSessionMemoryIfNeeded
} from "@/src/server/services/memory";
import { assessCrisisRisk } from "@/src/server/utils/crisis";
import {
  getOrCreateSession,
  saveSession,
  saveSessionTurn
} from "@/src/server/utils/sessionStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RoleIdSchema = z.enum(
  PERSONAS.map((item) => item.id) as [string, ...string[]]
);

const ChatBodySchema = z
  .object({
    sessionId: z.string().trim().min(8).max(128),
    message: z.string().trim().min(1).max(4000),
    roleId: RoleIdSchema.optional().default(DEFAULT_ROLE_ID),
    customPersonaEnabled: z.boolean().optional().default(false),
    customPersonaName: z.string().trim().max(80).optional().default(""),
    customPersonaPrompt: z.string().trim().max(2000).optional().default("")
  })
  .superRefine((data, ctx) => {
    if (data.customPersonaEnabled) {
      const unsafePersona = /(ignore|bỏ qua|vô hiệu|override).{0,30}(system|hệ thống|an toàn|quy tắc)|đóng vai bác sĩ|chẩn đoán/i.test(data.customPersonaPrompt || "");
      if (unsafePersona) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customPersonaPrompt"], message: "Mô tả phong cách chứa chỉ dẫn không được phép." });
      }
      if (!data.customPersonaPrompt || data.customPersonaPrompt.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customPersonaPrompt"],
          message: "Custom personality prompt phải có ít nhất 10 ký tự."
        });
      }
    }
  });

function buildResponseMemoryMeta(input: {
  summaryUpdated: boolean;
  stableFactsCount: number;
  hasSummary: boolean;
  recentTurnsCount: number;
  usedFallbackSummary?: boolean;
}) {
  return {
    summaryUpdated: input.summaryUpdated,
    stableFactsCount: input.stableFactsCount,
    hasSummary: input.hasSummary,
    recentTurnsCount: input.recentTurnsCount,
    usedFallbackSummary: Boolean(input.usedFallbackSummary)
  };
}

function normalizeCustomPersona(input: {
  enabled: boolean;
  name?: string;
  prompt?: string;
}) {
  const enabled = Boolean(input.enabled);
  const name = input.name?.trim() || "Tính cách tự tạo";
  const prompt = input.prompt?.trim() || "";

  return {
    enabled,
    name,
    prompt
  };
}

function buildPersonaPrompt(input: {
  presetPrompt: string;
  customPersonaEnabled: boolean;
  customPersonaName?: string;
  customPersonaPrompt?: string;
}) {
  if (!input.customPersonaEnabled || !input.customPersonaPrompt?.trim()) {
    return {
      effectivePrompt: input.presetPrompt,
      customPersonaActive: false,
      customPersonaName: undefined as string | undefined
    };
  }

  const customName = input.customPersonaName?.trim() || "Tính cách tự tạo";

  const effectivePrompt = [
    input.presetPrompt,
    "",
    `Yêu cầu tính cách do người dùng tự tạo: ${customName}`,
    input.customPersonaPrompt.trim(),
    "",
    "Chỉ làm theo yêu cầu tính cách này nếu nó không xung đột với quy tắc an toàn hệ thống. Quy tắc an toàn luôn được ưu tiên cao hơn."
  ].join("\n");

  return {
    effectivePrompt,
    customPersonaActive: true,
    customPersonaName: customName
  };
}

export async function POST(request: NextRequest) {
  try {
    const identity = readIdentity(request);
    if (!identity) return NextResponse.json({ ok:false, error:"Phiên đăng nhập không hợp lệ" }, { status:401 });
    if (identity.mustChangePassword) return NextResponse.json({ ok:false, error:"Bạn phải đổi mật khẩu trước khi trò chuyện" }, { status:403 });
    const rate = checkRateLimit(identity.id);
    if (!rate.ok) return NextResponse.json({ ok:false, error:"Bạn gửi quá nhanh. Vui lòng thử lại sau." }, { status:429, headers:{"Retry-After":String(rate.retryAfter)} });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ok:false,error:"JSON không hợp lệ"},{status:400}); }
    const parsed = ChatBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request body",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const {
      sessionId,
      message,
      roleId,
      customPersonaEnabled,
      customPersonaName,
      customPersonaPrompt
    } = parsed.data;

    const persona = getPersonaById(roleId);
    const session = await getOrCreateSession(sessionId, identity.id, persona.id);
    session.roleId = persona.id;
    // Materialize a new local session file before message appends.
    await saveSession(session);

    const normalizedCustomPersona = normalizeCustomPersona({
      enabled: customPersonaEnabled,
      name: customPersonaName,
      prompt: customPersonaPrompt
    });

    if (normalizedCustomPersona.enabled) {
      session.customPersona = {
        enabled: true,
        name: normalizedCustomPersona.name,
        prompt: normalizedCustomPersona.prompt
      };
    } else {
      session.customPersona = {
        enabled: false,
        name: undefined,
        prompt: undefined
      };
    }

    const personaPromptConfig = buildPersonaPrompt({
      presetPrompt: persona.prompt,
      customPersonaEnabled: session.customPersona.enabled,
      customPersonaName: session.customPersona.name,
      customPersonaPrompt: session.customPersona.prompt
    });

    const riskHistory = [
      ...(session.rollingSummary
        ? [
            {
              role: "assistant" as const,
              content: `Tóm tắt trước đó: ${session.rollingSummary}`
            }
          ]
        : []),
      ...session.recentTurns.slice(-6).map((turn) => ({
        role: turn.role,
        content: turn.content
      }))
    ];

    const crisis = assessCrisisRisk({
      message,
      history: riskHistory
    });

    if (crisis.shouldBypassModel) {
      const helpNowReply = createHelpNowReply({
        helpNowContactText: process.env.HELP_NOW_CONTACT_TEXT
      });

      const userTurn = appendTurnToSession(session, "user", message);
      await saveSessionTurn(session.sessionId, identity.id, userTurn);

      const assistantTurn = appendTurnToSession(session, "assistant", helpNowReply);
      await saveSessionTurn(session.sessionId, identity.id, assistantTurn);

      const memoryRefresh = await refreshSessionMemoryIfNeeded(session);
      await saveSession(session);

      return NextResponse.json({
        ok: true,
        sessionId: session.sessionId,
        mode: "help_now",
        riskLevel: crisis.riskLevel,
        roleId: persona.id,
        reply: helpNowReply,
        crisis,
        memory: buildResponseMemoryMeta({
          summaryUpdated: memoryRefresh.updated,
          stableFactsCount: session.stableFacts.length,
          hasSummary: Boolean(session.rollingSummary),
          recentTurnsCount: session.recentTurns.length,
          usedFallbackSummary: memoryRefresh.usedFallback
        }),
        customPersona: {
          active: personaPromptConfig.customPersonaActive,
          name: personaPromptConfig.customPersonaName
        }
      });
    }

    try {
      const systemPrompt = composeSystemPrompt({
        personaPrompt: personaPromptConfig.effectivePrompt,
        riskLevel: crisis.riskLevel === "safe" ? "safe" : "distress"
      });

      const memoryContext = buildMemoryContext(session);

      const rawModelReply = await generateChatReply({
        systemPrompt,
        userMessage: message,
        recentTurns: memoryContext.recentTurns,
        rollingSummary: memoryContext.rollingSummary,
        stableFacts: memoryContext.stableFacts
      });

      const finalReply = postProcessAssistantReply(
        rawModelReply,
        crisis.riskLevel === "safe" ? "safe" : "distress"
      );

      const userTurn = appendTurnToSession(session, "user", message);
      await saveSessionTurn(session.sessionId, identity.id, userTurn);

      const assistantTurn = appendTurnToSession(session, "assistant", finalReply);
      await saveSessionTurn(session.sessionId, identity.id, assistantTurn);

      const memoryRefresh = await refreshSessionMemoryIfNeeded(session);
      await saveSession(session);

      return NextResponse.json({
        ok: true,
        sessionId: session.sessionId,
        mode: "normal",
        riskLevel: crisis.riskLevel,
        roleId: persona.id,
        reply: finalReply,
        crisis,
        memory: buildResponseMemoryMeta({
          summaryUpdated: memoryRefresh.updated,
          stableFactsCount: session.stableFacts.length,
          hasSummary: Boolean(session.rollingSummary),
          recentTurnsCount: session.recentTurns.length,
          usedFallbackSummary: memoryRefresh.usedFallback
        }),
        customPersona: {
          active: personaPromptConfig.customPersonaActive,
          name: personaPromptConfig.customPersonaName
        }
      });
    } catch (error) {
      console.error(error);

      const fallbackReply =
        crisis.riskLevel === "distress"
          ? "Mình nghe em đang rất mệt và rối. Mình vẫn ở đây với em. Lúc này mình gợi ý 2 bước ngắn: tìm chỗ ngồi ổn hơn nếu có thể, hít vào chậm 4 nhịp rồi thở ra chậm 6 nhịp 3 lần. Sau đó em nói cho mình biết điều gì đang làm em thấy nặng nhất ngay lúc này."
          : "Mình đang gặp trục trặc kỹ thuật một chút, nhưng vẫn muốn hỗ trợ em. Em có thể nói ngắn gọn điều đang làm em mệt nhất lúc này không?";

      const userTurn = appendTurnToSession(session, "user", message);
      await saveSessionTurn(session.sessionId, identity.id, userTurn);

      const assistantTurn = appendTurnToSession(session, "assistant", fallbackReply);
      await saveSessionTurn(session.sessionId, identity.id, assistantTurn);

      const memoryRefresh = await refreshSessionMemoryIfNeeded(session);
      await saveSession(session);

      return NextResponse.json({
        ok: true,
        sessionId: session.sessionId,
        mode: "fallback",
        riskLevel: crisis.riskLevel,
        roleId: persona.id,
        reply: fallbackReply,
        crisis,
        usedFallback: true,
        memory: buildResponseMemoryMeta({
          summaryUpdated: memoryRefresh.updated,
          stableFactsCount: session.stableFacts.length,
          hasSummary: Boolean(session.rollingSummary),
          recentTurnsCount: session.recentTurns.length,
          usedFallbackSummary: memoryRefresh.usedFallback
        }),
        customPersona: {
          active: personaPromptConfig.customPersonaActive,
          name: personaPromptConfig.customPersonaName
        }
      });
    }
  } catch (error) {
    console.error(error);

    const requestId = crypto.randomUUID();
    console.error("chat request failed", requestId, error);
    return NextResponse.json(
      { ok: false, error: "Lỗi máy chủ nội bộ", requestId },
      { status: 500 }
    );
  }
}
