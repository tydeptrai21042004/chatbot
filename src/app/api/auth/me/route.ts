import { NextRequest, NextResponse } from "next/server";
import { guestIdentity, readIdentity, setAuthCookie } from "@/src/server/auth/auth";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(req:NextRequest){ let identity=readIdentity(req); const response=NextResponse.json({ok:true,identity:identity??guestIdentity()}); if(!identity){ identity=guestIdentity(); const final=NextResponse.json({ok:true,identity}); setAuthCookie(final,identity); return final; } return response; }
