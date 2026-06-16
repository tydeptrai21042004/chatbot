import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { readIdentity, hashPassword } from "@/src/server/auth/auth";
import { addAcademicRecords, assignStudentToTeacher, createUser, findUserByEmail } from "@/src/server/data/store";

export const runtime = "nodejs";
const MAX_FILE_SIZE=5_000_000, MAX_ROWS=10_000;
function norm(v:unknown){return String(v??"").trim().toLowerCase();}
function text(v:ExcelJS.CellValue){if(v==null)return"";if(typeof v==="object"){if("text" in v)return String(v.text??"").trim();if("result" in v)return String(v.result??"").trim();if("richText" in v)return v.richText.map(x=>x.text).join("").trim();}return String(v).trim();}
function pick(r:Record<string,string>,a:string[]){for(const k of a){const v=r[norm(k)];if(v)return v;}return"";}
export async function POST(req:NextRequest){
 const identity=readIdentity(req); if(!identity||identity.role!=="teacher")return NextResponse.json({ok:false,error:"Chỉ giáo viên được nhập dữ liệu"},{status:403});
 const form=await req.formData(); const uploaded=form.get("file");
 if(!(uploaded instanceof File))return NextResponse.json({ok:false,error:"Thiếu file Excel/CSV"},{status:400});
 if(uploaded.size>MAX_FILE_SIZE)return NextResponse.json({ok:false,error:"File vượt quá 5 MB"},{status:413});
 const ext=uploaded.name.toLowerCase().split(".").pop(); if(!ext||!["xlsx","csv"].includes(ext))return NextResponse.json({ok:false,error:"Chỉ hỗ trợ .xlsx hoặc .csv"},{status:415});
 try{
  const wb=new ExcelJS.Workbook(); const buf=Buffer.from(await uploaded.arrayBuffer());
  if(ext==="csv")await wb.csv.read(Readable.from(buf)); else await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
  const sheet=wb.worksheets[0]; if(!sheet||sheet.rowCount<2)return NextResponse.json({ok:false,error:"File không có dữ liệu"},{status:400});
  if(sheet.rowCount>MAX_ROWS+1)return NextResponse.json({ok:false,error:`File vượt quá ${MAX_ROWS} dòng`},{status:413});
  const hs=(sheet.getRow(1).values as ExcelJS.CellValue[]).map(norm); const rows:any[]=[]; const errors:string[]=[];
  sheet.eachRow((er,n)=>{if(n===1)return;const r:Record<string,string>={};er.eachCell({includeEmpty:true},(c,i)=>{if(hs[i])r[hs[i]]=text(c.value)});
   const studentId=pick(r,["studentId","Mã học sinh","Mã HS"]), studentName=pick(r,["studentName","Họ và tên","Tên học sinh"]), email=pick(r,["email","gmail","Email học sinh"]), className=pick(r,["className","Lớp"]), subject=pick(r,["subject","Môn học","Môn"]), semester=pick(r,["semester","Học kỳ"]), raw=pick(r,["score","Điểm","Điểm TB"]), score=Number(raw.replace(",","."));
   if(!studentId||!studentName||!email||!subject||!Number.isFinite(score)||score<0||score>10){errors.push(`Dòng ${n}: thiếu hoặc sai Mã học sinh, Họ tên, Gmail, Môn học hoặc Điểm 0-10.`);return;}
   if(!/^\S+@\S+\.\S+$/.test(email)){errors.push(`Dòng ${n}: Gmail không hợp lệ.`);return;}
   rows.push({studentId,studentName,email:email.toLowerCase(),className,subject,semester,assessmentType:"Điểm tổng kết",note:"",score});
  });
  if(errors.length)return NextResponse.json({ok:false,error:"File có dữ liệu không hợp lệ",details:errors.slice(0,20)},{status:400});
  if(!rows.length)return NextResponse.json({ok:false,error:"Không tìm thấy dòng hợp lệ"},{status:400});
  const students=new Map<string,{studentId:string;studentName:string;email:string}>();
  for(const r of rows){const prior=students.get(r.studentId.toLowerCase());if(prior&&(prior.email!==r.email||prior.studentName!==r.studentName)){return NextResponse.json({ok:false,error:`Mã ${r.studentId} có Gmail hoặc họ tên không thống nhất.`},{status:409});}students.set(r.studentId.toLowerCase(),r);}
  let createdAccounts=0;
  for(const s of students.values()){
   const existing=await findUserByEmail(s.email);
   let studentUser;
   if(existing){if(existing.role!=="student"||existing.studentCode?.toLowerCase()!==s.studentId.toLowerCase())return NextResponse.json({ok:false,error:`Gmail ${s.email} đã thuộc tài khoản khác.`},{status:409});studentUser=existing;}
   else {studentUser=await createUser({email:s.email,name:s.studentName,role:"student",studentCode:s.studentId,passwordHash:hashPassword("123456"),mustChangePassword:true});createdAccounts++;}
   const firstRow=rows.find(r=>r.studentId.toLowerCase()===s.studentId.toLowerCase());
   await assignStudentToTeacher(identity.id,studentUser.id,firstRow?.className||"");
  }
  const count=await addAcademicRecords(rows.map(r=>({studentId:r.studentId,studentName:r.studentName,className:r.className,subject:r.subject,semester:r.semester,assessmentType:r.assessmentType,note:r.note,score:r.score,teacherId:identity.id})));
  return NextResponse.json({ok:true,count,createdAccounts,defaultPassword:"123456"});
 }catch(e){console.error(e);return NextResponse.json({ok:false,error:"Không thể đọc file. Hãy dùng đúng file mẫu."},{status:400});}
}
