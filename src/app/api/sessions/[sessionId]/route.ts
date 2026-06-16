import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readIdentity } from "@/src/server/auth/auth";
import { deleteSession } from "@/src/server/utils/sessionStore";

const ParamsSchema = z.object({
  sessionId: z.string().trim().min(8).max(128)
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const identity = readIdentity(request);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Phiên đăng nhập không hợp lệ" }, { status: 401 });
  }

  const parsed = ParamsSchema.safeParse(await context.params);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Mã phiên trò chuyện không hợp lệ" }, { status: 400 });
  }

  const deleted = await deleteSession(parsed.data.sessionId, identity.id);
  return NextResponse.json({ ok: true, deleted });
}
