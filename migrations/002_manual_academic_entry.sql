ALTER TABLE academic_records ADD COLUMN IF NOT EXISTS assessment_type text NOT NULL DEFAULT 'Điểm tổng kết';
ALTER TABLE academic_records ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';
DROP INDEX IF EXISTS academic_records_teacher_id_student_id_subject_semester_key;
ALTER TABLE academic_records DROP CONSTRAINT IF EXISTS academic_records_teacher_id_student_id_subject_semester_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_record_kind ON academic_records(teacher_id,student_id,subject,semester,assessment_type);
