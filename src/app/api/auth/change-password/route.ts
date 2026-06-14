import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readIdentity, hashPassword, setAuthCookie } from "@/src/server/auth/auth";
import { findUserById, updateUserPassword } from "@/src/server/data/store";
const S=z.object({password:z.string().min(8).max(100)});
export async function POST(req:NextRequest){
  const identity=readIdentity(req); if(!identity||identity.role!=="student") return NextResponse.json({ok:false,error:"Không có quyền"},{status:403});
  let body:unknown; try{body=await req.json();}catch{return NextResponse.json({ok:false,error:"JSON không hợp lệ"},{status:400});}
  const parsed=S.safeParse(body); if(!parsed.success)return NextResponse.json({ok:false,error:"Mật khẩu mới phải có ít nhất 8 ký tự"},{status:400});
  const user=findUserById(identity.id); if(!user)return NextResponse.json({ok:false,error:"Không tìm thấy tài khoản"},{status:404});
  const updated=updateUserPassword(user.id,hashPassword(parsed.data.password),false);
  const nextIdentity={id:updated.id,role:updated.role,name:updated.name,email:updated.email,mustChangePassword:false};
  const response=NextResponse.json({ok:true,identity:nextIdentity}); setAuthCookie(response,nextIdentity); return response;
}
