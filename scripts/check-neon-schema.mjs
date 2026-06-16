import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = neon(process.env.DATABASE_URL);
const expected = {
  users: ['id','email','name','role','password_hash','student_code','must_change_password','created_at'],
  sessions: ['session_id','owner_id','title','role_id','encrypted_state','state_iv','state_tag','encryption_version','created_at','updated_at'],
  session_messages: ['id','session_id','owner_id','role','encrypted_content','content_iv','content_tag','encryption_version','created_at'],
};
let failed = false;
for (const [table, columns] of Object.entries(expected)) {
  const rows = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=${table}`;
  const actual = new Set(rows.map(r=>r.column_name));
  const missing = columns.filter(c=>!actual.has(c));
  if (missing.length) { failed = true; console.error(`${table}: missing ${missing.join(', ')}`); }
  else console.log(`${table}: OK`);
}
if (failed) { console.error('Run: npm run db:migrate'); process.exit(1); }
console.log('Neon schema is compatible with this application version.');
