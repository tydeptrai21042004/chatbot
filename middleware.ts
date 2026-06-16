import { NextRequest, NextResponse } from "next/server";
const MUTATING=new Set(["POST","PUT","PATCH","DELETE"]);
export function middleware(req:NextRequest){
  const requestId=req.headers.get("x-request-id")||crypto.randomUUID();
  if(req.nextUrl.pathname.startsWith("/api/")&&MUTATING.has(req.method)){
    const origin=req.headers.get("origin"),host=req.headers.get("x-forwarded-host")||req.headers.get("host");
    if(origin){try{if(new URL(origin).host!==host)return NextResponse.json({ok:false,error:"Yêu cầu bị từ chối bởi CSRF protection"},{status:403});}catch{return NextResponse.json({ok:false,error:"Origin không hợp lệ"},{status:403});}}
  }
  const headers=new Headers(req.headers);headers.set("x-request-id",requestId);
  const res=NextResponse.next({request:{headers}});res.headers.set("x-request-id",requestId);return res;
}
export const config={matcher:["/api/:path*"]};
