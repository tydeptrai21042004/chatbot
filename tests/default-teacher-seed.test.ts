import { describe, expect, it } from "vitest";
// @ts-ignore -- runtime-tested JavaScript seed module
import { DEFAULT_TEACHER, getSeedOptions, hashSeedPassword, seedDefaultTeacher } from "../scripts/lib/default-teacher-seed.mjs";
import { verifyPassword } from "../src/server/auth/auth";

type Row = Record<string, any>;
function memoryRepository(initial?: Row) {
  let row = initial ?? null;
  let creates = 0;
  let updates = 0;
  return {
    repository: {
      findByEmail: async (email: string) => row?.email === email ? row : null,
      create: async (value: Row) => { creates++; row = value; return row; },
      update: async (id: string, patch: Row) => { updates++; row = { ...row, ...patch, id }; return row; },
    },
    snapshot: () => ({ row, creates, updates }),
  };
}

describe("default Neon teacher seed", () => {
  it("uses the requested default credentials and forces first-login password change", () => {
    const options = getSeedOptions({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
    expect(options.email).toBe(DEFAULT_TEACHER.email);
    expect(options.password).toBe(DEFAULT_TEACHER.password);
    expect(options.mustChangePassword).toBe(true);
  });

  it("creates a teacher whose password hash is accepted by application login", async () => {
    const db = memoryRepository();
    const options = getSeedOptions({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
    const result = await seedDefaultTeacher(db.repository, options);
    const saved = db.snapshot();
    expect(result.action).toBe("created");
    expect(saved.creates).toBe(1);
    expect(saved.row!.role).toBe("teacher");
    expect(saved.row!.passwordHash).not.toContain("123");
    expect(verifyPassword("123", saved.row!.passwordHash)).toBe(true);
    expect(saved.row!.mustChangePassword).toBe(true);
  });

  it("is idempotent and preserves an existing password by default", async () => {
    const originalHash = hashSeedPassword("a-strong-existing-password", "fixed-salt");
    const db = memoryRepository({ id: "teacher-1", email: "1@gmail.com", passwordHash: originalHash, role: "teacher" });
    const result = await seedDefaultTeacher(db.repository, getSeedOptions({ NODE_ENV: "test" } as NodeJS.ProcessEnv));
    const saved = db.snapshot();
    expect(result.action).toBe("unchanged");
    expect(saved.creates).toBe(0);
    expect(saved.updates).toBe(0);
    expect(saved.row!.passwordHash).toBe(originalHash);
  });

  it("resets an existing password only when explicitly requested", async () => {
    const db = memoryRepository({ id: "teacher-1", email: "1@gmail.com", passwordHash: "old:00", role: "student" });
    const options = getSeedOptions({ NODE_ENV: "test", SEED_RESET_TEACHER_PASSWORD: "true" } as NodeJS.ProcessEnv);
    const result = await seedDefaultTeacher(db.repository, options);
    const saved = db.snapshot();
    expect(result.action).toBe("updated");
    expect(saved.updates).toBe(1);
    expect(saved.row!.role).toBe("teacher");
    expect(verifyPassword("123", saved.row!.passwordHash)).toBe(true);
  });

  it("refuses weak default credentials in production without an explicit override", () => {
    expect(() => getSeedOptions({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toThrow("REFUSED_WEAK_PRODUCTION_SEED");
    expect(getSeedOptions({ NODE_ENV: "production", ALLOW_INSECURE_DEFAULT_TEACHER: "true" } as NodeJS.ProcessEnv).email).toBe("1@gmail.com");
  });

  it("rejects an empty password", () => {
    expect(() => hashSeedPassword("")).toThrow("SEED_PASSWORD_REQUIRED");
  });
});
