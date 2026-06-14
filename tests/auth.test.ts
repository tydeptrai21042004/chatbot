import { afterEach, describe, expect, it } from "vitest";
import { createToken, hashPassword, verifyPassword } from "../src/server/auth/auth";

afterEach(() => { delete process.env.AUTH_SECRET; });

describe("authentication helpers", () => {
  it("hashes passwords with a random salt", () => {
    const first = hashPassword("correct horse battery staple");
    const second = hashPassword("correct horse battery staple");
    expect(first).not.toBe(second);
    expect(first).not.toContain("correct horse");
  });

  it("accepts the correct password and rejects incorrect/malformed values", () => {
    const saved = hashPassword("safe-password-123");
    expect(verifyPassword("safe-password-123", saved)).toBe(true);
    expect(verifyPassword("wrong", saved)).toBe(false);
    expect(verifyPassword("anything", "malformed")).toBe(false);
  });

  it("creates signed tokens without exposing plain identity JSON", () => {
    process.env.AUTH_SECRET = "test-secret-that-is-long-enough-for-tests";
    const token = createToken({ id: "student-1", role: "student", name: "An", email: "an@example.com" });
    expect(token.split(".")).toHaveLength(2);
    expect(token).not.toContain("an@example.com");
  });
});
