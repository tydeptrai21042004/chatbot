import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
export function requestId(req:NextRequest){return req.headers.get("x-request-id")?.slice(0,100)||randomUUID();}
export function clientIpHash(req:NextRequest){const ip=(req.headers.get("x-forwarded-for")?.split(",")[0]||req.headers.get("x-real-ip")||"unknown").trim();return createHash("sha256").update(`${process.env.IP_HASH_SALT||"dev"}:${ip}`).digest("hex");}
export function assertSameOrigin(req:NextRequest){
  const origin=req.headers.get("origin"); if(!origin)return true;
  const host=req.headers.get("x-forwarded-host")||req.headers.get("host");
  try{return new URL(origin).host===host;}catch{return false;}
}
export function safeLogError(scope:string,error:unknown,extra:Record<string,unknown>={}){
  const sanitized=Object.fromEntries(Object.entries(extra).filter(([k])=>!["message","reply","customPersonaPrompt","studentEmail","studentName","matchedTerms"].includes(k)));
  console.error(JSON.stringify({level:"error",scope,error:error instanceof Error?error.name:"UnknownError",...sanitized}));
}
