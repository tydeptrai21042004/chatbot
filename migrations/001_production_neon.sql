CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL,
 role text NOT NULL CHECK (role IN ('student','teacher','admin')),
 password_hash text NOT NULL, student_code text UNIQUE,
 must_change_password boolean NOT NULL DEFAULT false,
 created_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS teacher_student_assignments (
 teacher_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 student_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 class_name text NOT NULL DEFAULT '', created_at bigint NOT NULL,
 PRIMARY KEY(teacher_id,student_user_id)
);
CREATE TABLE IF NOT EXISTS academic_records (
 id text PRIMARY KEY, student_id text NOT NULL, student_name text NOT NULL,
 class_name text NOT NULL DEFAULT '', subject text NOT NULL, semester text NOT NULL DEFAULT '',
 assessment_type text NOT NULL DEFAULT 'Điểm tổng kết', note text NOT NULL DEFAULT '',
 score double precision NOT NULL CHECK(score>=0 AND score<=10),
 teacher_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, imported_at bigint NOT NULL,
 UNIQUE(teacher_id,student_id,subject,semester,assessment_type)
);
CREATE TABLE IF NOT EXISTS sessions (
 session_id text NOT NULL, owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title text NOT NULL DEFAULT 'Cuộc trò chuyện mới', role_id text NOT NULL,
 encrypted_state text NOT NULL, state_iv text NOT NULL, state_tag text NOT NULL,
 encryption_version integer NOT NULL DEFAULT 1,
 created_at bigint NOT NULL, updated_at bigint NOT NULL,
 PRIMARY KEY(session_id,owner_id)
);
CREATE TABLE IF NOT EXISTS session_messages (
 id text PRIMARY KEY, session_id text NOT NULL, owner_id text NOT NULL,
 role text NOT NULL CHECK(role IN ('user','assistant')),
 encrypted_content text NOT NULL, content_iv text NOT NULL, content_tag text NOT NULL,
 encryption_version integer NOT NULL DEFAULT 1, created_at bigint NOT NULL,
 FOREIGN KEY(session_id,owner_id) REFERENCES sessions(session_id,owner_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON session_messages(owner_id,session_id,created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_owner_updated ON sessions(owner_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_teacher_student ON academic_records(teacher_id,student_id);
CREATE TABLE IF NOT EXISTS risk_assessments (
 id text PRIMARY KEY, session_id text NOT NULL, owner_id text NOT NULL,
 risk_level text NOT NULL, reasons jsonb NOT NULL DEFAULT '[]', confidence double precision,
 created_at bigint NOT NULL, expires_at bigint NOT NULL,
 FOREIGN KEY(session_id,owner_id) REFERENCES sessions(session_id,owner_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id text PRIMARY KEY, actor_id text, action text NOT NULL, target_id text,
 ip_hash text, metadata jsonb NOT NULL DEFAULT '{}', created_at bigint NOT NULL,
 expires_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
 bucket_key text PRIMARY KEY, count integer NOT NULL, reset_at bigint NOT NULL
);
