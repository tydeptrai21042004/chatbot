import { neon } from '@neondatabase/serverless';
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql=neon(process.env.DATABASE_URL); const now=Date.now();
const chatDays=Number(process.env.CHAT_RETENTION_DAYS||30);
await sql`DELETE FROM sessions WHERE updated_at < ${now-chatDays*86400000}`;
await sql`DELETE FROM risk_assessments WHERE expires_at < ${now}`;
await sql`DELETE FROM audit_logs WHERE expires_at < ${now}`;
await sql`DELETE FROM rate_limits WHERE reset_at < ${now}`;
console.log('Retention cleanup completed');
