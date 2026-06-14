import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  addAcademicRecords,
  createUser,
  deleteOwnedSession,
  findUserByEmail,
  getOwnedSession,
  listMessages,
  saveOwnedSession,
  appendMessage,
  studentRecords,
  teacherRecords
} from "../src/server/data/store";
import type { ConversationSession } from "../src/server/types/session";

let tempDir = "";

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "advisor-store-"));
  process.env.DATA_DIR = tempDir;
});
afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.DATA_DIR;
});

function session(ownerId: string): ConversationSession {
  const now = Date.now();
  return {
    sessionId: "session-test-123",
    ownerId,
    roleId: "co-van-hoc-duong",
    rollingSummary: "",
    stableFacts: [],
    recentTurns: [],
    createdAt: now,
    updatedAt: now,
    totalTurns: 0,
    customPersona: { enabled: false }
  };
}

describe("local file storage", () => {
  it("stores users and enforces unique email/student code", () => {
    const user = createUser({ email:"HS001@example.com", name:"An", role:"student", passwordHash:"hash", studentCode:"HS001" });
    expect(findUserByEmail("hs001@example.com")?.id).toBe(user.id);
    expect(() => createUser({ email:"other@example.com", name:"B", role:"student", passwordHash:"hash", studentCode:"hs001" })).toThrow("STUDENT_CODE_EXISTS");
  });

  it("isolates sessions by owner and deletes the physical session", () => {
    const s = session("owner-a");
    saveOwnedSession(s);
    appendMessage(s.sessionId, s.ownerId, { role:"user", content:"Xin chào", timestamp:Date.now() });
    expect(getOwnedSession(s.sessionId, "owner-a")?.sessionId).toBe(s.sessionId);
    expect(getOwnedSession(s.sessionId, "owner-b")).toBeUndefined();
    expect(listMessages(s.sessionId, "owner-a")).toHaveLength(1);
    expect(deleteOwnedSession(s.sessionId, "owner-a")).toBe(true);
    expect(listMessages(s.sessionId, "owner-a")).toBeNull();
  });

  it("upserts duplicate academic rows and matches by student code", () => {
    const user = createUser({ email:"student@example.com", name:"Nguyễn An", role:"student", passwordHash:"hash", studentCode:"HS001" });
    const base = { studentId:"HS001", studentName:"Nguyễn An", className:"10A1", subject:"Toán", semester:"HK1", teacherId:"teacher-1" };
    addAcademicRecords([{ ...base, score:7.5 }]);
    addAcademicRecords([{ ...base, score:8.5 }]);
    expect(teacherRecords("teacher-1")).toHaveLength(1);
    expect(studentRecords(user)[0].score).toBe(8.5);
  });

  it("keeps a recoverable backup after replacing a file", () => {
    createUser({ email:"first@example.com", name:"First", role:"teacher", passwordHash:"hash" });
    createUser({ email:"second@example.com", name:"Second", role:"teacher", passwordHash:"hash" });
    expect(fs.existsSync(path.join(tempDir, "users.json.bak"))).toBe(true);
  });
});

describe("local storage edge cases", () => {
  it("normalizes email and rejects duplicate email regardless of case", () => {
    createUser({ email: "Case@Test.com", name: "A", role: "teacher", passwordHash: "hash" });
    expect(() => createUser({ email: " case@test.COM ", name: "B", role: "teacher", passwordHash: "hash" })).toThrow("EMAIL_EXISTS");
  });

  it("rejects academic records from mixed teachers in one operation", () => {
    expect(() => addAcademicRecords([
      { studentId: "S1", studentName: "A", className: "1A", subject: "Toán", semester: "HK1", score: 8, teacherId: "T1" },
      { studentId: "S2", studentName: "B", className: "1A", subject: "Văn", semester: "HK1", score: 7, teacherId: "T2" }
    ])).toThrow("MIXED_TEACHERS");
  });

  it("returns zero for an empty academic import", () => {
    expect(addAcademicRecords([])).toBe(0);
  });

  it("fails clearly when appending to a missing session", () => {
    expect(() => appendMessage("missing", "owner", { role: "user", content: "hello", timestamp: Date.now() })).toThrow("SESSION_NOT_FOUND");
  });

  it("returns false when deleting a session that does not exist", () => {
    expect(deleteOwnedSession("missing", "owner")).toBe(false);
  });

  it("recovers users from the backup when the primary JSON is corrupted", () => {
    createUser({ email: "first@example.com", name: "First", role: "teacher", passwordHash: "hash" });
    createUser({ email: "second@example.com", name: "Second", role: "teacher", passwordHash: "hash" });
    fs.writeFileSync(path.join(tempDir, "users.json"), "{broken-json", "utf8");
    expect(findUserByEmail("first@example.com")?.name).toBe("First");
  });

  it("does not expose one teacher's academic rows to another teacher", () => {
    addAcademicRecords([{ studentId: "S1", studentName: "A", className: "1A", subject: "Toán", semester: "HK1", score: 8, teacherId: "T1" }]);
    expect(teacherRecords("T1")).toHaveLength(1);
    expect(teacherRecords("T2")).toHaveLength(0);
  });

  it("falls back to email prefix when a student code is absent", () => {
    const user = createUser({ email: "fallback01@example.com", name: "Fallback", role: "student", passwordHash: "hash" });
    addAcademicRecords([{ studentId: "FALLBACK01", studentName: "Fallback", className: "2A", subject: "Anh", semester: "HK2", score: 9, teacherId: "T1" }]);
    expect(studentRecords(user)).toHaveLength(1);
  });
});

describe("serverless data directory resolution", () => {
  it("ignores a relative DATA_DIR on Vercel and uses /tmp", async () => {
    const previousVercel = process.env.VERCEL;
    const previousDataDir = process.env.DATA_DIR;
    process.env.VERCEL = "1";
    process.env.DATA_DIR = "./data";

    const { resolveDataRoot } = await import("../src/server/data/store");
    expect(resolveDataRoot()).toBe(path.join("/tmp", "an-tam-data"));

    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
  });

  it("allows an explicit absolute /tmp directory on Vercel", async () => {
    const previousVercel = process.env.VERCEL;
    const previousDataDir = process.env.DATA_DIR;
    process.env.VERCEL = "1";
    process.env.DATA_DIR = "/tmp/custom-an-tam";

    const { resolveDataRoot } = await import("../src/server/data/store");
    expect(resolveDataRoot()).toBe("/tmp/custom-an-tam");

    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
  });
});
