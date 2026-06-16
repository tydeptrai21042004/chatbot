export type CspOptions = {
  nonce: string;
  isDevelopment?: boolean;
};

/**
 * Builds a per-request CSP. Next.js reads the x-nonce request header and
 * applies it to framework-generated scripts, including hydration payloads.
 */
export function buildContentSecurityPolicy({
  nonce,
  isDevelopment = false,
}: CspOptions): string {
  if (!nonce || /[\r\n;'\s]/.test(nonce)) {
    throw new Error("Invalid CSP nonce");
  }

  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSources.join(" ")}`,
    "script-src-attr 'none'",
    "worker-src 'self' blob:",
    "connect-src 'self' https://generativelanguage.googleapis.com https://*.neon.tech wss://*.neon.tech",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
