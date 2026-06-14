import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser } from "@/src/server/data/store";
import { hashPassword, setAuthCookie } from "@/src/server/auth/auth";

const Schema = z.object({
  email: z.string().email().max(160),
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(100),
  role: z.enum(["student", "teacher"]),
  studentCode: z.string().trim().max(50).optional().default("")
}).superRefine((data, ctx) => {
  if (data.role === "student" && data.studentCode.length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["studentCode"], message: "Học sinh cần nhập mã học sinh/sinh viên." });
  }
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok:false, error:"JSON không hợp lệ" }, { status:400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok:false, error:"Thông tin đăng ký không hợp lệ", details:parsed.error.flatten() }, { status:400 });
  try {
    const user = createUser({
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash: hashPassword(parsed.data.password),
      studentCode: parsed.data.role === "student" ? parsed.data.studentCode : undefined
    });
    const identity = { id:user.id, role:user.role, name:user.name, email:user.email };
    const response = NextResponse.json({ ok:true, identity });
    setAuthCookie(response, identity);
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const message = code === "EMAIL_EXISTS" ? "Email đã tồn tại" : code === "STUDENT_CODE_EXISTS" ? "Mã học sinh/sinh viên đã được sử dụng" : "Không thể tạo tài khoản";
    return NextResponse.json({ ok:false, error:message }, { status:409 });
  }
}
