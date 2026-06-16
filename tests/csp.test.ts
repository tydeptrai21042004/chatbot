import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "../src/server/security/csp";

describe("buildContentSecurityPolicy", () => {
  it("uses a nonce and strict-dynamic without unsafe-inline for scripts", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc123XYZ=" });
    expect(csp).toContain("script-src 'self' 'nonce-abc123XYZ=' 'strict-dynamic'");
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("allows unsafe-eval only in development", () => {
    const development = buildContentSecurityPolicy({ nonce: "devNonce", isDevelopment: true });
    const production = buildContentSecurityPolicy({ nonce: "prodNonce", isDevelopment: false });
    expect(development).toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(production).not.toContain("'unsafe-eval'");
  });

  it("rejects nonce injection characters", () => {
    expect(() => buildContentSecurityPolicy({ nonce: "bad'; script-src *" })).toThrow(
      "Invalid CSP nonce",
    );
  });

  it("allows Neon websocket connections", () => {
    const csp = buildContentSecurityPolicy({ nonce: "safeNonce" });
    expect(csp).toContain("wss://*.neon.tech");
  });
});
