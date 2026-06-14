import { NextResponse } from "next/server";import{clearAuthCookie,guestIdentity,setAuthCookie}from"@/src/server/auth/auth";
export async function POST(){const identity=guestIdentity();const r=NextResponse.json({ok:true,identity});clearAuthCookie(r);setAuthCookie(r,identity);return r;}
