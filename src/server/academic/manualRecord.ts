import { z } from "zod";

export const MANUAL_GRADE_TYPES = ["Miệng", "15 phút", "1 tiết", "Giữa kỳ", "Cuối kỳ", "Điểm tổng kết"] as const;
export const manualAcademicRecordSchema = z.object({
  studentUserId: z.string().uuid("Học sinh không hợp lệ"),
  subject: z.string().trim().min(1, "Vui lòng nhập môn học").max(80),
  semester: z.string().trim().min(1, "Vui lòng nhập học kỳ").max(40),
  assessmentType: z.string().trim().min(1, "Vui lòng chọn loại điểm").max(50),
  className: z.string().trim().max(50).default(""),
  score: z.coerce.number().min(0, "Điểm phải từ 0 đến 10").max(10, "Điểm phải từ 0 đến 10"),
  note: z.string().trim().max(300, "Ghi chú tối đa 300 ký tự").default(""),
});
export type ManualAcademicRecordInput = z.infer<typeof manualAcademicRecordSchema>;
export function normalizeManualAcademicRecord(input: unknown) {
  const parsed = manualAcademicRecordSchema.parse(input);
  return {...parsed, subject: parsed.subject.replace(/\s+/g," "), semester: parsed.semester.replace(/\s+/g," "), assessmentType: parsed.assessmentType.replace(/\s+/g," ")};
}
