import { NextResponse } from "next/server";
import { DEFAULT_ROLE_ID, PUBLIC_ROLES } from "@/src/server/prompts/personas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    defaultRoleId: DEFAULT_ROLE_ID,
    roles: PUBLIC_ROLES
  });
}
