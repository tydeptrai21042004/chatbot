import { createHmac, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export type AccountRole = "guest" | "student" | "teacher";
export type Identity = { id: string; role: AccountRole; name: string; email?: string };
const COOKIE = "advisor_auth";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() { return process.env.AUTH_SECRET?.trim() || "dev-only-change-this-secret-before-deployment"; }
function b64(v: string) { return Buffer.from(v).toString("base64url"); }
function unb64(v: string) { return Buffer.from(v, "base64url").toString(); }
function sign(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
export function createToken(identity: Identity) {
  const payload = b64(JSON.stringify({ ...identity, exp: Math.floor(Date.now()/1000)+MAX_AGE }));
  return `${payload}.${sign(payload)}`;
}
export function readIdentity(request: NextRequest): Identity | null {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(unb64(payload));
    if (!data.exp || data.exp < Date.now()/1000) return null;
    return { id: data.id, role: data.role, name: data.name, email: data.email };
  } catch { return null; }
}
export function guestIdentity(): Identity { return { id: `guest_${randomUUID()}`, role: "guest", name: "Khách" }; }
export function setAuthCookie(response: NextResponse, identity: Identity) {
  response.cookies.set(COOKIE, createToken(identity), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}
export function clearAuthCookie(response: NextResponse) { response.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 }); }
export function hashPassword(password: string) { const salt = randomUUID(); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; }
export function verifyPassword(password: string, saved: string) {
  const [salt, hex] = saved.split(":"); if (!salt || !hex) return false;
  const actual = scryptSync(password, salt, 64); const expected = Buffer.from(hex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
