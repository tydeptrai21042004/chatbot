import { NextRequest,NextResponse } from "next/server";
import { readIdentity,hashPassword } from "@/src/server/auth/auth";
import { findUserById,updateUserPassword } from "@/src/server/data/store";
export async function POST(req:NextRequest,c:{params:Promise<{id:string}>}){const me=readIdentity(req);if(!me||me.role!=="teacher")return NextResponse.json({ok:false,error:"Forbidden"},{status:403});const{id}=await c.params;const u=await findUserById(id);if(!u||u.role!=="student")return NextResponse.json({ok:false,error:"Không tìm thấy học sinh"},{status:404});await updateUserPassword(id,hashPassword("123456"),true);return NextResponse.json({ok:true,defaultPassword:"123456"});}
