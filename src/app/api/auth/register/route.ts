import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ ok:false, error:"Học sinh không thể tự tạo tài khoản. Giáo viên sẽ cấp tài khoản qua file Excel." }, { status:403 });
}
