import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { AccountRole } from "../auth/auth";
import type { ConversationSession, SessionTurn } from "../types/session";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Exclude<AccountRole, "guest">;
  passwordHash: string;
  studentCode?: string;
  createdAt: number;
};

export type AcademicRecord = {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  subject: string;
  semester: string;
  score: number;
  teacherId: string;
  importedAt: number;
};

type UserIndex = { version: 1; users: User[] };
type AcademicFile = { version: 1; teacherId: string; records: AcademicRecord[] };
type SessionFile = { version: 1; session: ConversationSession; messages: SessionTurn[] };

const MAX_MESSAGES_PER_SESSION = Number(process.env.MAX_MESSAGES_PER_SESSION || 300);
const MAX_SESSIONS_PER_OWNER = Number(process.env.MAX_SESSIONS_PER_OWNER || 30);
const SESSION_RETENTION_DAYS = Number(process.env.SESSION_RETENTION_DAYS || 90);
const MAX_ACADEMIC_RECORDS_PER_TEACHER = Number(process.env.MAX_ACADEMIC_RECORDS_PER_TEACHER || 20_000);

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV ||
    process.cwd().startsWith("/var/task")
  );
}

export function resolveDataRoot() {
  const configured = process.env.DATA_DIR?.trim();

  // Vercel/Lambda deployment bundles are read-only. Never accept a relative
  // DATA_DIR such as ./data there, because it resolves inside the bundle.
  if (isServerlessRuntime()) {
    if (configured && path.isAbsolute(configured) && configured.startsWith("/tmp/")) {
      return path.normalize(configured);
    }
    return path.join("/tmp", "an-tam-data");
  }

  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "data");
}

function rootDir() {
  return resolveDataRoot();
}
function usersFile() { return path.join(rootDir(), "users.json"); }
function sessionsDir() { return path.join(rootDir(), "sessions"); }
function academicsDir() { return path.join(rootDir(), "academics"); }
function backupsDir() { return path.join(rootDir(), "backups"); }
function safeKey(value: string) { return createHash("sha256").update(value).digest("hex"); }
function sessionFile(ownerId: string, sessionId: string) {
  return path.join(sessionsDir(), safeKey(ownerId), `${safeKey(sessionId)}.json`);
}
function academicFile(teacherId: string) { return path.join(academicsDir(), `${safeKey(teacherId)}.json`); }

function ensureParent(file: string) {
  const parent = path.dirname(file);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
}
function clone<T>(value: T): T { return structuredClone(value); }
function readJson<T>(file: string, fallback: T): T {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as T;
    return parsed;
  } catch {
    try {
      const parsed = JSON.parse(fs.readFileSync(`${file}.bak`, "utf8")) as T;
      return parsed;
    } catch {
      return clone(fallback);
    }
  }
}
function atomicWrite(file: string, value: unknown) {
  ensureParent(file);
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  const fd = fs.openSync(tmp, "w", 0o600);
  try {
    fs.writeFileSync(fd, payload, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
  fs.renameSync(tmp, file);
}
function listJsonFiles(dir: string): string[] {
  try { return fs.readdirSync(dir).filter(x => x.endsWith(".json")).map(x => path.join(dir, x)); }
  catch { return []; }
}
function emptyUsers(): UserIndex { return { version: 1, users: [] }; }
function emptyAcademic(teacherId: string): AcademicFile { return { version: 1, teacherId, records: [] }; }
function readSession(ownerId: string, sessionId: string): SessionFile | null {
  const file = sessionFile(ownerId, sessionId);
  if (!fs.existsSync(file) && !fs.existsSync(`${file}.bak`)) return null;
  return readJson<SessionFile | null>(file, null);
}

export function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return readJson(usersFile(), emptyUsers()).users.find(u => u.email.toLowerCase() === normalized);
}
export function createUser(input: Omit<User, "id" | "createdAt">) {
  const db = readJson(usersFile(), emptyUsers());
  const email = input.email.trim().toLowerCase();
  if (db.users.some(u => u.email.toLowerCase() === email)) throw new Error("EMAIL_EXISTS");
  if (input.studentCode && db.users.some(u => u.studentCode?.toLowerCase() === input.studentCode?.toLowerCase())) {
    throw new Error("STUDENT_CODE_EXISTS");
  }
  const user: User = {
    ...input,
    email,
    studentCode: input.studentCode?.trim() || undefined,
    id: randomUUID(),
    createdAt: Date.now()
  };
  db.users.push(user);
  atomicWrite(usersFile(), db);
  return clone(user);
}
export function getOwnedSession(id: string, ownerId: string) {
  return clone(readSession(ownerId, id)?.session);
}
export function saveOwnedSession(session: ConversationSession) {
  const current = readSession(session.ownerId, session.sessionId);
  const data: SessionFile = {
    version: 1,
    session: clone(session),
    messages: current?.messages ?? []
  };
  atomicWrite(sessionFile(session.ownerId, session.sessionId), data);
  pruneOwnerSessions(session.ownerId);
}
export function appendMessage(sessionId: string, ownerId: string, turn: SessionTurn) {
  const current = readSession(ownerId, sessionId);
  if (!current) throw new Error("SESSION_NOT_FOUND");
  current.messages.push(clone(turn));
  if (current.messages.length > MAX_MESSAGES_PER_SESSION) {
    current.messages = current.messages.slice(-MAX_MESSAGES_PER_SESSION);
  }
  atomicWrite(sessionFile(ownerId, sessionId), current);
}
export function listMessages(sessionId: string, ownerId: string) {
  const current = readSession(ownerId, sessionId);
  return current ? clone(current.messages) : null;
}
export function deleteOwnedSession(sessionId: string, ownerId: string) {
  const file = sessionFile(ownerId, sessionId);
  if (!fs.existsSync(file) && !fs.existsSync(`${file}.bak`)) return false;
  for (const target of [file, `${file}.bak`]) {
    try { fs.rmSync(target, { force: true }); } catch { /* no-op */ }
  }
  return true;
}
export function addAcademicRecords(records: Omit<AcademicRecord, "id" | "importedAt">[]) {
  if (!records.length) return 0;
  const teacherId = records[0].teacherId;
  if (records.some(r => r.teacherId !== teacherId)) throw new Error("MIXED_TEACHERS");
  const file = academicFile(teacherId);
  const data = readJson(file, emptyAcademic(teacherId));
  const now = Date.now();
  const byKey = new Map(data.records.map(r => [academicKey(r), r]));
  for (const record of records) {
    const full: AcademicRecord = { ...record, id: randomUUID(), importedAt: now };
    byKey.set(academicKey(full), full);
  }
  data.records = [...byKey.values()]
    .sort((a, b) => b.importedAt - a.importedAt)
    .slice(0, MAX_ACADEMIC_RECORDS_PER_TEACHER);
  atomicWrite(file, data);
  return records.length;
}
function academicKey(r: Pick<AcademicRecord, "studentId" | "subject" | "semester" | "teacherId">) {
  return [r.teacherId, r.studentId, r.subject, r.semester].map(x => x.trim().toLowerCase()).join("|");
}
export function studentRecords(user: User) {
  const keys = new Set([
    user.studentCode?.trim().toLowerCase(),
    user.email.split("@")[0].trim().toLowerCase()
  ].filter(Boolean));
  const records: AcademicRecord[] = [];
  for (const file of listJsonFiles(academicsDir())) {
    const data = readJson<AcademicFile>(file, { version: 1, teacherId: "", records: [] });
    for (const record of data.records) {
      if (keys.has(record.studentId.trim().toLowerCase())) records.push(record);
    }
  }
  return records.sort((a, b) => b.importedAt - a.importedAt);
}
export function teacherRecords(teacherId: string) {
  return clone(readJson(academicFile(teacherId), emptyAcademic(teacherId)).records)
    .sort((a, b) => b.importedAt - a.importedAt);
}
export function createLocalBackup() {
  fs.mkdirSync(backupsDir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(backupsDir(), `backup-${stamp}`);
  fs.mkdirSync(target, { recursive: true });
  for (const name of ["users.json", "academics", "sessions"]) {
    const source = path.join(rootDir(), name);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(target, name), { recursive: true });
  }
  return target;
}
export function cleanupExpiredSessions(now = Date.now()) {
  const cutoff = now - SESSION_RETENTION_DAYS * 86_400_000;
  let deleted = 0;
  let ownerDirs: string[] = [];
  try { ownerDirs = fs.readdirSync(sessionsDir()).map(x => path.join(sessionsDir(), x)); } catch { return 0; }
  for (const ownerDir of ownerDirs) {
    for (const file of listJsonFiles(ownerDir)) {
      const data = readJson<SessionFile | null>(file, null);
      if (!data || data.session.updatedAt < cutoff) {
        fs.rmSync(file, { force: true });
        fs.rmSync(`${file}.bak`, { force: true });
        deleted++;
      }
    }
  }
  return deleted;
}
function pruneOwnerSessions(ownerId: string) {
  const dir = path.join(sessionsDir(), safeKey(ownerId));
  const files = listJsonFiles(dir).map(file => ({ file, data: readJson<SessionFile | null>(file, null) }))
    .filter((x): x is { file: string; data: SessionFile } => Boolean(x.data))
    .sort((a, b) => b.data.session.updatedAt - a.data.session.updatedAt);
  for (const old of files.slice(MAX_SESSIONS_PER_OWNER)) {
    fs.rmSync(old.file, { force: true });
    fs.rmSync(`${old.file}.bak`, { force: true });
  }
}
