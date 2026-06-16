import { NextRequest, NextResponse } from "next/server";
import { buildContentSecurityPolicy } from "./src/server/security/csp";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function rejectCsrf(message: string, requestId: string): NextResponse {
  const response = NextResponse.json({ ok: false, error: message }, { status: 403 });
  response.headers.set("x-request-id", requestId);
  return response;
}

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    isDevelopment: process.env.NODE_ENV !== "production",
  });

  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    MUTATING_METHODS.has(request.method)
  ) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

    if (origin) {
      try {
        if (!host || new URL(origin).host !== host) {
          return rejectCsrf("Yêu cầu bị từ chối bởi CSRF protection", requestId);
        }
      } catch {
        return rejectCsrf("Origin không hợp lệ", requestId);
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
