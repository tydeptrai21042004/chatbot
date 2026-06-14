import { neon } from "@neondatabase/serverless";
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
  if (!schemaReady) schemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student','teacher')),
      password_hash TEXT NOT NULL, student_code TEXT UNIQUE,
      must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      created_at BIGINT NOT NULL
    )`;
    await sql`CREATE TABLE IF NOT EXISTS academic_records (
      id TEXT PRIMARY KEY, student_id TEXT NOT NULL, student_name TEXT NOT NULL,
      class_name TEXT NOT NULL DEFAULT '', subject TEXT NOT NULL,
      semester TEXT NOT NULL DEFAULT '', score DOUBLE PRECISION NOT NULL,
      teacher_id TEXT NOT NULL, imported_at BIGINT NOT NULL,
      UNIQUE(teacher_id, student_id, subject, semester)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT NOT NULL, owner_id TEXT NOT NULL, data JSONB NOT NULL,
      updated_at BIGINT NOT NULL, PRIMARY KEY(session_id, owner_id)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS session_messages (
      id BIGSERIAL PRIMARY KEY, session_id TEXT NOT NULL, owner_id TEXT NOT NULL,
      turn JSONB NOT NULL, created_at BIGINT NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_session ON session_messages(owner_id, session_id, id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_records_student ON academic_records(student_id)`;
  })();
  return schemaReady;
}
function rowUser(r:any): User { return {id:r.id,email:r.email,name:r.name,role:r.role,passwordHash:r.password_hash,studentCode:r.student_code||undefined,mustChangePassword:Boolean(r.must_change_password),createdAt:Number(r.created_at)}; }
function rowRecord(r:any): AcademicRecord { return {id:r.id,studentId:r.student_id,studentName:r.student_name,className:r.class_name,subject:r.subject,semester:r.semester,score:Number(r.score),teacherId:r.teacher_id,importedAt:Number(r.imported_at)}; }

export async function listUsers(){ if(!useDb)return local.listUsers(); await ensureSchema(); return (await sql!`SELECT * FROM users ORDER BY created_at DESC`).map(rowUser); }
export async function findUserById(id:string){ if(!useDb)return local.findUserById(id); await ensureSchema(); const r=await sql!`SELECT * FROM users WHERE id=${id} LIMIT 1`; return r[0]?rowUser(r[0]):undefined; }
export async function findUserByEmail(email:string){ if(!useDb)return local.findUserByEmail(email); await ensureSchema(); const e=email.trim().toLowerCase(); const r=await sql!`SELECT * FROM users WHERE lower(email)=${e} LIMIT 1`; return r[0]?rowUser(r[0]):undefined; }
export async function createUser(input:Omit<User,"id"|"createdAt">){ if(!useDb)return local.createUser(input); await ensureSchema(); const id=crypto.randomUUID(), now=Date.now(), email=input.email.trim().toLowerCase(); try{const r=await sql!`INSERT INTO users(id,email,name,role,password_hash,student_code,must_change_password,created_at) VALUES(${id},${email},${input.name},${input.role},${input.passwordHash},${input.studentCode||null},${Boolean(input.mustChangePassword)},${now}) RETURNING *`;return rowUser(r[0]);}catch(e:any){if(String(e?.message).includes("email"))throw new Error("EMAIL_EXISTS");if(String(e?.message).includes("student_code"))throw new Error("STUDENT_CODE_EXISTS");throw e;} }
export async function updateUserPassword(userId:string,passwordHash:string,mustChangePassword=false){ if(!useDb)return local.updateUserPassword(userId,passwordHash,mustChangePassword); await ensureSchema(); const r=await sql!`UPDATE users SET password_hash=${passwordHash}, must_change_password=${mustChangePassword} WHERE id=${userId} RETURNING *`; if(!r[0])throw new Error("USER_NOT_FOUND"); return rowUser(r[0]); }
export async function ensureFixedTeacher(passwordHash:string){ if(!useDb)return local.ensureFixedTeacher(passwordHash); await ensureSchema(); const existing=await findUserByEmail("1@gmail.com"); if(existing){const r=await sql!`UPDATE users SET name='Giáo viên',role='teacher',password_hash=${passwordHash},must_change_password=false,student_code=NULL WHERE id=${existing.id} RETURNING *`;return rowUser(r[0]);} return createUser({email:"1@gmail.com",name:"Giáo viên",role:"teacher",passwordHash,mustChangePassword:false}); }
export async function deleteUser(userId:string){ if(!useDb)return local.deleteUser(userId); await ensureSchema(); await sql!`DELETE FROM academic_records WHERE student_id IN (SELECT student_code FROM users WHERE id=${userId})`; const r=await sql!`DELETE FROM users WHERE id=${userId} AND role='student' RETURNING id`; return Boolean(r[0]); }

export async function getOwnedSession(id:string,ownerId:string){ if(!useDb)return local.getOwnedSession(id,ownerId); await ensureSchema(); const r=await sql!`SELECT data FROM sessions WHERE session_id=${id} AND owner_id=${ownerId}`; return r[0]?.data as ConversationSession|undefined; }
export async function saveOwnedSession(session:ConversationSession){ if(!useDb)return local.saveOwnedSession(session); await ensureSchema(); await sql!`INSERT INTO sessions(session_id,owner_id,data,updated_at) VALUES(${session.sessionId},${session.ownerId},${JSON.stringify(session)}::jsonb,${Date.now()}) ON CONFLICT(session_id,owner_id) DO UPDATE SET data=EXCLUDED.data,updated_at=EXCLUDED.updated_at`; }
export async function appendMessage(sessionId:string,ownerId:string,turn:SessionTurn){ if(!useDb)return local.appendMessage(sessionId,ownerId,turn); await ensureSchema(); await sql!`INSERT INTO session_messages(session_id,owner_id,turn,created_at) VALUES(${sessionId},${ownerId},${JSON.stringify(turn)}::jsonb,${Date.now()})`; }
export async function listMessages(sessionId:string,ownerId:string){ if(!useDb)return local.listMessages(sessionId,ownerId); await ensureSchema(); const r=await sql!`SELECT turn FROM session_messages WHERE session_id=${sessionId} AND owner_id=${ownerId} ORDER BY id ASC LIMIT 300`; return r.length?r.map((x:any)=>x.turn as SessionTurn):null; }
export async function deleteOwnedSession(sessionId:string,ownerId:string){ if(!useDb)return local.deleteOwnedSession(sessionId,ownerId); await ensureSchema(); await sql!`DELETE FROM session_messages WHERE session_id=${sessionId} AND owner_id=${ownerId}`; const r=await sql!`DELETE FROM sessions WHERE session_id=${sessionId} AND owner_id=${ownerId} RETURNING session_id`; return Boolean(r[0]); }
export async function addAcademicRecords(records:Omit<AcademicRecord,"id"|"importedAt">[]){ if(!useDb)return local.addAcademicRecords(records); await ensureSchema(); const now=Date.now(); for(const x of records){await sql!`INSERT INTO academic_records(id,student_id,student_name,class_name,subject,semester,score,teacher_id,imported_at) VALUES(${crypto.randomUUID()},${x.studentId},${x.studentName},${x.className},${x.subject},${x.semester},${x.score},${x.teacherId},${now}) ON CONFLICT(teacher_id,student_id,subject,semester) DO UPDATE SET student_name=EXCLUDED.student_name,class_name=EXCLUDED.class_name,score=EXCLUDED.score,imported_at=EXCLUDED.imported_at`; } return records.length; }
export async function studentRecords(user:User){ if(!useDb)return local.studentRecords(user); await ensureSchema(); const code=(user.studentCode||user.email.split("@")[0]).trim().toLowerCase(); return (await sql!`SELECT * FROM academic_records WHERE lower(student_id)=${code} ORDER BY imported_at DESC`).map(rowRecord); }
export async function teacherRecords(teacherId:string){ if(!useDb)return local.teacherRecords(teacherId); await ensureSchema(); return (await sql!`SELECT * FROM academic_records WHERE teacher_id=${teacherId} ORDER BY imported_at DESC`).map(rowRecord); }
export async function teacherStudents(teacherId:string){ const users=await listUsers(); const records=await teacherRecords(teacherId); const map=new Map<string,any>(); for(const u of users.filter(u=>u.role==='student')) map.set((u.studentCode||'').toLowerCase(),{id:u.id,email:u.email,name:u.name,studentCode:u.studentCode||'',mustChangePassword:Boolean(u.mustChangePassword),className:'',recordCount:0,averageScore:null}); for(const r of records){const k=r.studentId.toLowerCase();const s=map.get(k);if(s){s.className=s.className||r.className;s.recordCount++;s._sum=(s._sum||0)+r.score;s.averageScore=s._sum/s.recordCount;}} return [...map.values()].map(({_sum,...x})=>x); }
export const resolveDataRoot=local.resolveDataRoot;
export const createLocalBackup=local.createLocalBackup;
export const cleanupExpiredSessions=local.cleanupExpiredSessions;
