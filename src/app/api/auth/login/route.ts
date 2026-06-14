import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureFixedTeacher, findUserByEmail } from "@/src/server/data/store";
import { hashPassword, setAuthCookie, verifyPassword } from "@/src/server/auth/auth";
const S=z.object({email:z.string().email(),password:z.string().min(1)});
export async function POST(req:NextRequest){
  let b:unknown; try{b=await req.json();}catch{return NextResponse.json({ok:false,error:"JSON không hợp lệ"},{status:400});}
  const p=S.safeParse(b); if(!p.success)return NextResponse.json({ok:false,error:"Thông tin đăng nhập không hợp lệ"},{status:400});
  await ensureFixedTeacher(hashPassword("123"));
  const u=await findUserByEmail(p.data.email);
  if(!u||!verifyPassword(p.data.password,u.passwordHash))return NextResponse.json({ok:false,error:"Email hoặc mật khẩu không đúng"},{status:401});
  const identity={id:u.id,role:u.role,name:u.name,email:u.email,mustChangePassword:Boolean(u.mustChangePassword)};
  const r=NextResponse.json({ok:true,identity,requirePasswordChange:Boolean(u.mustChangePassword)}); setAuthCookie(r,identity); return r;
}
