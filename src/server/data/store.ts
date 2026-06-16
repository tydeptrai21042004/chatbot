import { neon } from "@neondatabase/serverless";
import { encryptText, decryptText } from "../security/encryption";
import * as local from "./localStore";
import type { ConversationSession, SessionTurn } from "../types/session";
export type { User, AcademicRecord } from "./localStore";
import type { User, AcademicRecord } from "./localStore";

const databaseUrl = process.env.DATABASE_URL?.trim();
const useDb = Boolean(databaseUrl);
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

async function ensureSchema() {
  if (!sql) return;
  if (!schemaReady)
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('student','teacher','admin')),password_hash TEXT NOT NULL,student_code TEXT UNIQUE,must_change_password BOOLEAN NOT NULL DEFAULT FALSE,created_at BIGINT NOT NULL)`;
      // CREATE TABLE IF NOT EXISTS does not upgrade an older table. Keep these
      // additive ALTERs here so a stale Neon schema cannot crash production.
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at BIGINT NOT NULL DEFAULT 0`;
      await sql`UPDATE users SET role=CASE WHEN lower(email)='1@gmail.com' THEN 'teacher' ELSE 'student' END WHERE role IS NULL OR role NOT IN ('student','teacher','admin')`;
      await sql`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'student'`;
      await sql`ALTER TABLE users ALTER COLUMN role SET NOT NULL`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_users_student_code ON users(student_code) WHERE student_code IS NOT NULL`;
      await sql`CREATE TABLE IF NOT EXISTS teacher_student_assignments (teacher_id TEXT NOT NULL,student_user_id TEXT NOT NULL,class_name TEXT NOT NULL DEFAULT '',created_at BIGINT NOT NULL,PRIMARY KEY(teacher_id,student_user_id))`;
      await sql`CREATE TABLE IF NOT EXISTS academic_records (id TEXT PRIMARY KEY,student_id TEXT NOT NULL,student_name TEXT NOT NULL,class_name TEXT NOT NULL DEFAULT '',subject TEXT NOT NULL,semester TEXT NOT NULL DEFAULT '',assessment_type TEXT NOT NULL DEFAULT 'Điểm tổng kết',note TEXT NOT NULL DEFAULT '',score DOUBLE PRECISION NOT NULL,teacher_id TEXT NOT NULL,imported_at BIGINT NOT NULL)`;
      await sql`ALTER TABLE academic_records ADD COLUMN IF NOT EXISTS assessment_type TEXT NOT NULL DEFAULT 'Điểm tổng kết'`;
      await sql`ALTER TABLE academic_records ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE academic_records DROP CONSTRAINT IF EXISTS academic_records_teacher_id_student_id_subject_semester_key`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_record_kind ON academic_records(teacher_id,student_id,subject,semester,assessment_type)`;
      await sql`CREATE TABLE IF NOT EXISTS sessions (session_id TEXT NOT NULL,owner_id TEXT NOT NULL,title TEXT NOT NULL DEFAULT 'Cuộc trò chuyện mới',role_id TEXT NOT NULL DEFAULT 'co-van-hoc-duong',encrypted_state TEXT,state_iv TEXT,state_tag TEXT,encryption_version INTEGER NOT NULL DEFAULT 1,created_at BIGINT NOT NULL DEFAULT 0,updated_at BIGINT NOT NULL,PRIMARY KEY(session_id,owner_id))`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS owner_id TEXT`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Cuộc trò chuyện mới'`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS role_id TEXT NOT NULL DEFAULT 'co-van-hoc-duong'`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS encrypted_state TEXT`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS state_iv TEXT`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS state_tag TEXT`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS encryption_version INTEGER NOT NULL DEFAULT 1`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at BIGINT NOT NULL DEFAULT 0`;
      await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at BIGINT NOT NULL DEFAULT 0`;
      await sql`CREATE TABLE IF NOT EXISTS session_messages (id TEXT PRIMARY KEY,session_id TEXT NOT NULL,owner_id TEXT NOT NULL,role TEXT NOT NULL,encrypted_content TEXT NOT NULL,content_iv TEXT NOT NULL,content_tag TEXT NOT NULL,encryption_version INTEGER NOT NULL DEFAULT 1,created_at BIGINT NOT NULL)`;
      await sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS owner_id TEXT`;
      await sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS role TEXT`;
      await sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS encrypted_content TEXT`;
      await sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS content_iv TEXT`;
      await sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS content_tag TEXT`;
      await sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS encryption_version INTEGER NOT NULL DEFAULT 1`;
      await sql`ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS created_at BIGINT NOT NULL DEFAULT 0`;
      await sql`CREATE TABLE IF NOT EXISTS risk_assessments (id TEXT PRIMARY KEY,session_id TEXT NOT NULL,owner_id TEXT NOT NULL,risk_level TEXT NOT NULL,reasons JSONB NOT NULL DEFAULT '[]',confidence DOUBLE PRECISION,created_at BIGINT NOT NULL,expires_at BIGINT NOT NULL)`;
      await sql`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY,actor_id TEXT,action TEXT NOT NULL,target_id TEXT,ip_hash TEXT,metadata JSONB NOT NULL DEFAULT '{}',created_at BIGINT NOT NULL,expires_at BIGINT NOT NULL)`;
      await sql`CREATE TABLE IF NOT EXISTS rate_limits (bucket_key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset_at BIGINT NOT NULL)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_messages_session ON session_messages(owner_id,session_id,created_at)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_sessions_owner_updated ON sessions(owner_id,updated_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_records_student ON academic_records(student_id)`;
    })();
  return schemaReady;
}
function rowUser(r: any): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    passwordHash: r.password_hash,
    studentCode: r.student_code || undefined,
    mustChangePassword: Boolean(r.must_change_password),
    createdAt: Number(r.created_at),
  };
}
function rowRecord(r: any): AcademicRecord {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    className: r.class_name,
    subject: r.subject,
    semester: r.semester,
    assessmentType: r.assessment_type || "Điểm tổng kết",
    note: r.note || "",
    score: Number(r.score),
    teacherId: r.teacher_id,
    importedAt: Number(r.imported_at),
  };
}

export async function listUsers() {
  if (!useDb) return local.listUsers();
  await ensureSchema();
  return (await sql!`SELECT * FROM users ORDER BY created_at DESC`).map(
    rowUser,
  );
}
export async function findUserById(id: string) {
  if (!useDb) return local.findUserById(id);
  await ensureSchema();
  const r = await sql!`SELECT * FROM users WHERE id=${id} LIMIT 1`;
  return r[0] ? rowUser(r[0]) : undefined;
}
export async function findUserByEmail(email: string) {
  if (!useDb) return local.findUserByEmail(email);
  await ensureSchema();
  const e = email.trim().toLowerCase();
  const r = await sql!`SELECT * FROM users WHERE lower(email)=${e} LIMIT 1`;
  return r[0] ? rowUser(r[0]) : undefined;
}
export async function createUser(input: Omit<User, "id" | "createdAt">) {
  if (!useDb) return local.createUser(input);
  await ensureSchema();
  const id = crypto.randomUUID(),
    now = Date.now(),
    email = input.email.trim().toLowerCase();
  try {
    const r =
      await sql!`INSERT INTO users(id,email,name,role,password_hash,student_code,must_change_password,created_at) VALUES(${id},${email},${input.name},${input.role},${input.passwordHash},${input.studentCode || null},${Boolean(input.mustChangePassword)},${now}) RETURNING *`;
    return rowUser(r[0]);
  } catch (e: any) {
    if (String(e?.message).includes("email")) throw new Error("EMAIL_EXISTS");
    if (String(e?.message).includes("student_code"))
      throw new Error("STUDENT_CODE_EXISTS");
    throw e;
  }
}
export async function updateUserPassword(
  userId: string,
  passwordHash: string,
  mustChangePassword = false,
) {
  if (!useDb)
    return local.updateUserPassword(userId, passwordHash, mustChangePassword);
  await ensureSchema();
  const r =
    await sql!`UPDATE users SET password_hash=${passwordHash}, must_change_password=${mustChangePassword} WHERE id=${userId} RETURNING *`;
  if (!r[0]) throw new Error("USER_NOT_FOUND");
  return rowUser(r[0]);
}
export async function ensureFixedTeacher(passwordHash: string) {
  if (!useDb) return local.ensureFixedTeacher(passwordHash);
  await ensureSchema();
  const existing = await findUserByEmail("1@gmail.com");
  if (existing) {
    const r =
      await sql!`UPDATE users SET name='Giáo viên',role='teacher',password_hash=${passwordHash},must_change_password=false,student_code=NULL WHERE id=${existing.id} RETURNING *`;
    return rowUser(r[0]);
  }
  return createUser({
    email: "1@gmail.com",
    name: "Giáo viên",
    role: "teacher",
    passwordHash,
    mustChangePassword: false,
  });
}
export async function deleteUser(userId: string) {
  if (!useDb) return local.deleteUser(userId);
  await ensureSchema();
  await sql!`DELETE FROM academic_records WHERE student_id IN (SELECT student_code FROM users WHERE id=${userId})`;
  const r =
    await sql!`DELETE FROM users WHERE id=${userId} AND role='student' RETURNING id`;
  return Boolean(r[0]);
}

export async function getOwnedSession(id: string, ownerId: string) {
  if (!useDb) return local.getOwnedSession(id, ownerId);
  await ensureSchema();
  const r =
    await sql!`SELECT encrypted_state,state_iv,state_tag,encryption_version FROM sessions WHERE session_id=${id} AND owner_id=${ownerId}`;
  if (!r[0] || !r[0].encrypted_state) return undefined;
  return JSON.parse(
    decryptText({
      ciphertext: r[0].encrypted_state,
      iv: r[0].state_iv,
      tag: r[0].state_tag,
      version: Number(r[0].encryption_version),
    }),
  ) as ConversationSession;
}
export async function saveOwnedSession(session: ConversationSession) {
  if (!useDb) return local.saveOwnedSession(session);
  await ensureSchema();
  const e = encryptText(JSON.stringify(session));
  const existing =
    await sql!`SELECT title FROM sessions WHERE session_id=${session.sessionId} AND owner_id=${session.ownerId}`;
  const title = existing[0]?.title || "Cuộc trò chuyện mới";
  await sql!`INSERT INTO sessions(session_id,owner_id,title,role_id,encrypted_state,state_iv,state_tag,encryption_version,created_at,updated_at) VALUES(${session.sessionId},${session.ownerId},${title},${session.roleId},${e.ciphertext},${e.iv},${e.tag},${e.version},${session.createdAt},${Date.now()}) ON CONFLICT(session_id,owner_id) DO UPDATE SET role_id=EXCLUDED.role_id,encrypted_state=EXCLUDED.encrypted_state,state_iv=EXCLUDED.state_iv,state_tag=EXCLUDED.state_tag,encryption_version=EXCLUDED.encryption_version,updated_at=EXCLUDED.updated_at`;
}
export async function appendMessage(
  sessionId: string,
  ownerId: string,
  turn: SessionTurn,
) {
  if (!useDb) return local.appendMessage(sessionId, ownerId, turn);
  await ensureSchema();
  const e = encryptText(turn.content);
  await sql!`INSERT INTO session_messages(id,session_id,owner_id,role,encrypted_content,content_iv,content_tag,encryption_version,created_at) VALUES(${crypto.randomUUID()},${sessionId},${ownerId},${turn.role},${e.ciphertext},${e.iv},${e.tag},${e.version},${turn.timestamp})`;
}
export async function listMessages(sessionId: string, ownerId: string) {
  if (!useDb) return local.listMessages(sessionId, ownerId);
  await ensureSchema();
  const r =
    await sql!`SELECT id,role,encrypted_content,content_iv,content_tag,encryption_version,created_at FROM session_messages WHERE session_id=${sessionId} AND owner_id=${ownerId} ORDER BY created_at ASC LIMIT 300`;
  if (!r.length) {
    const exists =
      await sql!`SELECT 1 FROM sessions WHERE session_id=${sessionId} AND owner_id=${ownerId}`;
    return exists.length ? [] : null;
  }
  return r.map(
    (x: any) =>
      ({
        id: x.id,
        role: x.role,
        content: decryptText({
          ciphertext: x.encrypted_content,
          iv: x.content_iv,
          tag: x.content_tag,
          version: Number(x.encryption_version),
        }),
        timestamp: Number(x.created_at),
      }) as SessionTurn & { id: string },
  );
}
export async function deleteMessage(
  messageId: string,
  sessionId: string,
  ownerId: string,
) {
  if (!useDb) return false;
  await ensureSchema();
  const r =
    await sql!`DELETE FROM session_messages WHERE id=${messageId} AND session_id=${sessionId} AND owner_id=${ownerId} RETURNING id`;
  return Boolean(r[0]);
}
export async function deleteOwnedSession(sessionId: string, ownerId: string) {
  if (!useDb) return local.deleteOwnedSession(sessionId, ownerId);
  await ensureSchema();
  await sql!`DELETE FROM session_messages WHERE session_id=${sessionId} AND owner_id=${ownerId}`;
  await sql!`DELETE FROM risk_assessments WHERE session_id=${sessionId} AND owner_id=${ownerId}`;
  const r =
    await sql!`DELETE FROM sessions WHERE session_id=${sessionId} AND owner_id=${ownerId} RETURNING session_id`;
  return Boolean(r[0]);
}
export async function listOwnedSessions(ownerId: string, query = "") {
  if (!useDb) return [];
  await ensureSchema();
  const q = `%${query.trim()}%`;
  const rows = query.trim()
    ? await sql!`SELECT session_id,title,role_id,created_at,updated_at FROM sessions WHERE owner_id=${ownerId} AND title ILIKE ${q} ORDER BY updated_at DESC LIMIT 50`
    : await sql!`SELECT session_id,title,role_id,created_at,updated_at FROM sessions WHERE owner_id=${ownerId} ORDER BY updated_at DESC LIMIT 50`;
  return rows.map((r: any) => ({
    sessionId: r.session_id,
    title: r.title,
    roleId: r.role_id,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  }));
}
export async function renameOwnedSession(
  sessionId: string,
  ownerId: string,
  title: string,
) {
  if (!useDb) return false;
  await ensureSchema();
  const r =
    await sql!`UPDATE sessions SET title=${title},updated_at=${Date.now()} WHERE session_id=${sessionId} AND owner_id=${ownerId} RETURNING session_id`;
  return Boolean(r[0]);
}
export async function exportOwnedData(ownerId: string) {
  if (!useDb) return { sessions: [], messages: [] };
  await ensureSchema();
  const sessions = await listOwnedSessions(ownerId);
  const messages = [] as any[];
  for (const s of sessions) {
    messages.push({
      sessionId: s.sessionId,
      title: s.title,
      messages: (await listMessages(s.sessionId, ownerId)) || [],
    });
  }
  return { exportedAt: new Date().toISOString(), sessions, messages };
}
export async function addAcademicRecords(
  records: Omit<AcademicRecord, "id" | "importedAt">[],
) {
  if (!useDb) return local.addAcademicRecords(records);
  await ensureSchema();
  const now = Date.now();
  for (const x of records) {
    await sql!`INSERT INTO academic_records(id,student_id,student_name,class_name,subject,semester,assessment_type,note,score,teacher_id,imported_at) VALUES(${crypto.randomUUID()},${x.studentId},${x.studentName},${x.className},${x.subject},${x.semester},${x.assessmentType || 'Điểm tổng kết'},${x.note || ''},${x.score},${x.teacherId},${now}) ON CONFLICT(teacher_id,student_id,subject,semester,assessment_type) DO UPDATE SET student_name=EXCLUDED.student_name,class_name=EXCLUDED.class_name,note=EXCLUDED.note,score=EXCLUDED.score,imported_at=EXCLUDED.imported_at`;
  }
  return records.length;
}
export async function studentRecords(user: User) {
  if (!useDb) return local.studentRecords(user);
  await ensureSchema();
  const code = (user.studentCode || user.email.split("@")[0])
    .trim()
    .toLowerCase();
  return (
    await sql!`SELECT * FROM academic_records WHERE lower(student_id)=${code} ORDER BY imported_at DESC`
  ).map(rowRecord);
}
export async function teacherRecords(teacherId: string) {
  if (!useDb) return local.teacherRecords(teacherId);
  await ensureSchema();
  return (
    await sql!`SELECT * FROM academic_records WHERE teacher_id=${teacherId} ORDER BY imported_at DESC`
  ).map(rowRecord);
}
export async function deleteAcademicRecord(
  recordId: string,
  teacherId: string,
) {
  if (!useDb) return local.deleteAcademicRecord(recordId, teacherId);
  await ensureSchema();
  const r =
    await sql!`DELETE FROM academic_records WHERE id=${recordId} AND teacher_id=${teacherId} RETURNING id`;
  return Boolean(r[0]);
}
export async function listStudentWellbeing() {
  if (!useDb) return local.listStudentWellbeing();
  await ensureSchema();
  const rows = await sql!`
    SELECT DISTINCT ON (owner_id)
      owner_id, risk_level, reasons, confidence, created_at
    FROM risk_assessments
    WHERE expires_at > ${Date.now()}
    ORDER BY owner_id, created_at DESC
  `;
  const counts = await sql!`
    SELECT owner_id,
      count(*)::int AS assessment_count,
      count(*) FILTER (WHERE risk_level='high')::int AS high_risk_count,
      count(*) FILTER (WHERE risk_level IN ('medium','high'))::int AS distress_count
    FROM risk_assessments
    WHERE expires_at > ${Date.now()}
    GROUP BY owner_id
  `;
  const countMap = new Map(counts.map((row:any)=>[row.owner_id,row]));
  return rows.map((row:any)=>{
    const count = countMap.get(row.owner_id) as any;
    return {
      ownerId: row.owner_id,
      riskLevel: row.risk_level,
      reasons: Array.isArray(row.reasons) ? row.reasons : [],
      confidence: row.confidence == null ? null : Number(row.confidence),
      lastAssessedAt: Number(row.created_at),
      sessionCount: Number(count?.assessment_count || 0),
      distressCount: Number(count?.distress_count || 0),
      highRiskCount: Number(count?.high_risk_count || 0),
    };
  });
}
export async function teacherStudents(teacherId: string) {
  let users = await listUsers();
  if (useDb) {
    await ensureSchema();
    const assigned = await sql!`SELECT student_user_id FROM teacher_student_assignments WHERE teacher_id=${teacherId}`;
    const allowed = new Set(assigned.map((row:any)=>row.student_user_id));
    users = users.filter((user)=>user.role !== "student" || allowed.has(user.id));
  }
  const records = await teacherRecords(teacherId);
  const wellbeing = await listStudentWellbeing();
  const wellbeingMap = new Map(wellbeing.map((w: any) => [w.ownerId, w]));
  const map = new Map<string, any>();
  for (const u of users.filter((u) => u.role === "student"))
    map.set((u.studentCode || "").toLowerCase(), {
      id: u.id,
      email: u.email,
      name: u.name,
      studentCode: u.studentCode || "",
      mustChangePassword: Boolean(u.mustChangePassword),
      className: "",
      recordCount: 0,
      averageScore: null,
      records: [],
      wellbeing: wellbeingMap.get(u.id) || null,
    });
  for (const r of records) {
    const k = r.studentId.toLowerCase();
    const s = map.get(k);
    if (s) {
      s.className = s.className || r.className;
      s.recordCount++;
      s._sum = (s._sum || 0) + r.score;
      s.averageScore = s._sum / s.recordCount;
      s.records.push(r);
    }
  }
  return [...map.values()].map(({ _sum, ...x }) => x);
}
export const resolveDataRoot = local.resolveDataRoot;
export const createLocalBackup = local.createLocalBackup;
export const cleanupExpiredSessions = local.cleanupExpiredSessions;


export async function isStudentAssignedToTeacher(teacherId: string, studentUserId: string) {
  if (!useDb) {
    const user = await findUserById(studentUserId);
    return Boolean(user && user.role === "student");
  }
  await ensureSchema();
  const rows = await sql!`SELECT 1 FROM teacher_student_assignments WHERE teacher_id=${teacherId} AND student_user_id=${studentUserId} LIMIT 1`;
  return rows.length > 0;
}

export async function assignStudentToTeacher(
  teacherId: string,
  studentUserId: string,
  className = "",
) {
  if (!useDb) return true;
  await ensureSchema();
  await sql!`INSERT INTO teacher_student_assignments(teacher_id,student_user_id,class_name,created_at) VALUES(${teacherId},${studentUserId},${className},${Date.now()}) ON CONFLICT(teacher_id,student_user_id) DO UPDATE SET class_name=EXCLUDED.class_name`;
  return true;
}
export async function writeAudit(input: {
  actorId?: string;
  action: string;
  targetId?: string;
  ipHash?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!useDb) return;
  await ensureSchema();
  const now = Date.now(),
    days = Number(process.env.AUDIT_RETENTION_DAYS || 180);
  await sql!`INSERT INTO audit_logs(id,actor_id,action,target_id,ip_hash,metadata,created_at,expires_at) VALUES(${crypto.randomUUID()},${input.actorId || null},${input.action},${input.targetId || null},${input.ipHash || null},${JSON.stringify(input.metadata || {})}::jsonb,${now},${now + days * 86400000})`;
}
export async function persistRiskAssessment(input: {
  sessionId: string;
  ownerId: string;
  riskLevel: string;
  reasons: string[];
  confidence?: number;
}) {
  if (!useDb) return;
  await ensureSchema();
  const now = Date.now(),
    days = Number(process.env.RISK_RETENTION_DAYS || 90);
  await sql!`INSERT INTO risk_assessments(id,session_id,owner_id,risk_level,reasons,confidence,created_at,expires_at) VALUES(${crypto.randomUUID()},${input.sessionId},${input.ownerId},${input.riskLevel},${JSON.stringify(input.reasons)}::jsonb,${input.confidence ?? null},${now},${now + days * 86400000})`;
}
export async function consumeSharedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  if (!useDb) return null;
  await ensureSchema();
  const now = Date.now(),
    reset = now + windowMs;
  const rows =
    await sql!`INSERT INTO rate_limits(bucket_key,count,reset_at) VALUES(${key},1,${reset}) ON CONFLICT(bucket_key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<=${now} THEN 1 ELSE rate_limits.count+1 END,reset_at=CASE WHEN rate_limits.reset_at<=${now} THEN ${reset} ELSE rate_limits.reset_at END RETURNING count,reset_at`;
  const row = rows[0];
  return {
    ok: Number(row.count) <= limit,
    retryAfter: Math.max(0, Math.ceil((Number(row.reset_at) - now) / 1000)),
  };
}
