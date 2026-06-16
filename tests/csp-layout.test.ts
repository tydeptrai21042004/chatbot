import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("root layout CSP nonce integration", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");

  it("forces dynamic rendering so every document receives a request nonce", () => {
    expect(source).toContain('export const dynamic = "force-dynamic"');
  });

  it("reads x-nonce from request headers", () => {
    expect(source).toContain('(await headers()).get("x-nonce")');
  });

  it("applies nonce to the inline style element", () => {
    expect(source).toContain('<style nonce={nonce}>');
  });
});
