import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, writeAudit } from "@/src/server/data/store";
import { clientIpHash } from "@/src/server/security/request";
import { checkSharedRateLimit } from "@/src/server/utils/rateLimit";
import { setAuthCookie, verifyPassword } from "@/src/server/auth/auth";
const S=z.object({email:z.string().email(),password:z.string().min(1)});
export async function POST(req:NextRequest){
  let b:unknown; try{b=await req.json();}catch{return NextResponse.json({ok:false,error:"JSON không hợp lệ"},{status:400});}
  const p=S.safeParse(b); if(!p.success)return NextResponse.json({ok:false,error:"Thông tin đăng nhập không hợp lệ"},{status:400});
  const rate=await checkSharedRateLimit(`login:${clientIpHash(req)}`,5,15*60_000);if(!rate.ok)return NextResponse.json({ok:false,error:"Đăng nhập quá nhiều lần. Vui lòng thử lại sau."},{status:429,headers:{"Retry-After":String(rate.retryAfter)}});
  const u=await findUserByEmail(p.data.email);
  if(!u||!verifyPassword(p.data.password,u.passwordHash))return NextResponse.json({ok:false,error:"Email hoặc mật khẩu không đúng"},{status:401});
  const identity={id:u.id,role:u.role,name:u.name,email:u.email,mustChangePassword:Boolean(u.mustChangePassword)};
  await writeAudit({actorId:u.id,action:"USER_LOGIN",targetId:u.id,ipHash:clientIpHash(req)});const r=NextResponse.json({ok:true,identity,requirePasswordChange:Boolean(u.mustChangePassword)}); setAuthCookie(r,identity); return r;
}
