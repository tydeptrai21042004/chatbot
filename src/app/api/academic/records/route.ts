import { NextRequest, NextResponse } from "next/server";
import { readIdentity } from "@/src/server/auth/auth";
import { addAcademicRecords, findUserById, isStudentAssignedToTeacher, writeAudit } from "@/src/server/data/store";
import { manualAcademicRecordSchema } from "@/src/server/academic/manualRecord";
import { clientIpHash } from "@/src/server/security/request";

export async function POST(req: NextRequest) {
  const identity = readIdentity(req);
  if (!identity || identity.role !== "teacher") return NextResponse.json({ok:false,error:"Chỉ giáo viên được nhập điểm"},{status:403});
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ok:false,error:"JSON không hợp lệ"},{status:400}); }
  const parsed = manualAcademicRecordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ok:false,error:"Dữ liệu điểm không hợp lệ",details:parsed.error.issues.map(i=>i.message)},{status:400});
  const student = await findUserById(parsed.data.studentUserId);
  if (!student || student.role !== "student") return NextResponse.json({ok:false,error:"Không tìm thấy học sinh"},{status:404});
  if (!(await isStudentAssignedToTeacher(identity.id, student.id))) return NextResponse.json({ok:false,error:"Bạn không được quản lý học sinh này"},{status:403});
  if (!student.studentCode) return NextResponse.json({ok:false,error:"Học sinh chưa có mã học sinh"},{status:409});
  await addAcademicRecords([{studentId:student.studentCode,studentName:student.name,className:parsed.data.className,subject:parsed.data.subject,semester:parsed.data.semester,assessmentType:parsed.data.assessmentType,note:parsed.data.note,score:parsed.data.score,teacherId:identity.id}]);
  await writeAudit({actorId:identity.id,action:"ACADEMIC_RECORD_MANUAL_UPSERT",targetId:student.id,ipHash:clientIpHash(req),metadata:{subject:parsed.data.subject,semester:parsed.data.semester,assessmentType:parsed.data.assessmentType}});
  return NextResponse.json({ok:true,message:"Đã lưu điểm thủ công"},{status:201});
}
