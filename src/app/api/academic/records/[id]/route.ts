import { NextRequest, NextResponse } from "next/server";
import { readIdentity } from "@/src/server/auth/auth";
import { deleteAcademicRecord } from "@/src/server/data/store";

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const identity=readIdentity(request);
  if(!identity||identity.role!=="teacher")return NextResponse.json({ok:false,error:"Chỉ giáo viên được xóa điểm"},{status:403});
  const {id}=await params;
  const deleted=await deleteAcademicRecord(id,identity.id);
  if(!deleted)return NextResponse.json({ok:false,error:"Không tìm thấy điểm hoặc bạn không có quyền xóa"},{status:404});
  return NextResponse.json({ok:true});
}
