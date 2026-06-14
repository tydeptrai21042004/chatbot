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
