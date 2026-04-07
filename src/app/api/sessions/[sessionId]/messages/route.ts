import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listSessionTurns } from "@/src/server/utils/sessionStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  sessionId: z.string().trim().min(8).max(128)
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const params = await context.params;
  const parsed = ParamsSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid session id"
      },
      { status: 400 }
    );
  }

  const { sessionId } = parsed.data;
  const messages = listSessionTurns(sessionId);

  return NextResponse.json({
    ok: true,
    sessionId,
    messages
  });
}
