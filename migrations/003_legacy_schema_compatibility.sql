-- Upgrade databases created by older versions of the application.
-- Every statement is additive/idempotent and preserves existing rows.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at bigint NOT NULL DEFAULT 0;
UPDATE users SET role = CASE WHEN lower(email) = '1@gmail.com' THEN 'teacher' ELSE 'student' END WHERE role IS NULL OR role NOT IN ('student','teacher','admin');
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'student';
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_student_code ON users(student_code) WHERE student_code IS NOT NULL;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Cuộc trò chuyện mới';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS role_id text NOT NULL DEFAULT 'co-van-hoc-duong';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS encrypted_state text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS state_iv text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS state_tag text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS encryption_version integer NOT NULL DEFAULT 1;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at bigint NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at bigint NOT NULL DEFAULT 0;

ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS encrypted_content text;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS content_iv text;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS content_tag text;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS encryption_version integer NOT NULL DEFAULT 1;
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS created_at bigint NOT NULL DEFAULT 0;
