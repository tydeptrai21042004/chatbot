import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { readIdentity } from "@/src/server/auth/auth";
import { addAcademicRecords } from "@/src/server/data/store";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5_000_000;
const MAX_ROWS = 10_000;

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}
function valueText(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value) return String(value.text ?? "").trim();
    if ("result" in value) return String(value.result ?? "").trim();
    if ("richText" in value) return value.richText.map(part => part.text).join("").trim();
  }
  return String(value).trim();
}
function findValue(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value) return value;
  }
  return "";
}

export async function POST(req: NextRequest) {
  const identity = readIdentity(req);
  if (!identity || identity.role !== "teacher") {
    return NextResponse.json({ ok:false, error:"Chỉ tài khoản giáo viên được nhập dữ liệu" }, { status:403 });
  }

  const form = await req.formData();
  const uploaded = form.get("file");
  if (!(uploaded instanceof File)) return NextResponse.json({ ok:false, error:"Thiếu file Excel/CSV" }, { status:400 });
  if (uploaded.size > MAX_FILE_SIZE) return NextResponse.json({ ok:false, error:"File vượt quá 5 MB" }, { status:413 });

  const extension = uploaded.name.toLowerCase().split(".").pop();
  if (!extension || !["xlsx", "csv"].includes(extension)) {
    return NextResponse.json({ ok:false, error:"Chỉ hỗ trợ file .xlsx hoặc .csv" }, { status:415 });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.from(await uploaded.arrayBuffer());
    if (extension === "csv") await workbook.csv.read(Readable.from(buffer));
    else await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      return NextResponse.json({ ok:false, error:"File không có dữ liệu" }, { status:400 });
    }
    if (sheet.rowCount > MAX_ROWS + 1) {
      return NextResponse.json({ ok:false, error:`File vượt quá ${MAX_ROWS} dòng dữ liệu` }, { status:413 });
    }

    const headers = sheet.getRow(1).values as ExcelJS.CellValue[];
    const normalizedHeaders = headers.map(normalizeHeader);
    const records: Array<{
      studentId:string; studentName:string; className:string; subject:string;
      semester:string; score:number; teacherId:string;
    }> = [];

    sheet.eachRow((excelRow, rowNumber) => {
      if (rowNumber === 1) return;
      const row: Record<string, string> = {};
      excelRow.eachCell({ includeEmpty:true }, (cell, colNumber) => {
        const header = normalizedHeaders[colNumber];
        if (header) row[header] = valueText(cell.value);
      });
      const studentId = findValue(row, ["studentId", "student_id", "Mã học sinh", "Ma hoc sinh", "Mã HS"]);
      const studentName = findValue(row, ["studentName", "student_name", "Họ và tên", "Ho va ten", "Tên học sinh"]);
      const className = findValue(row, ["className", "class", "Lớp", "Lop"]);
      const subject = findValue(row, ["subject", "Môn học", "Mon hoc", "Môn"]);
      const semester = findValue(row, ["semester", "Học kỳ", "Hoc ky"]);
      const score = Number(findValue(row, ["score", "Điểm", "Diem", "Điểm TB"]).replace(",", "."));
      if (studentId && studentName && subject && Number.isFinite(score) && score >= 0 && score <= 10) {
        records.push({ studentId, studentName, className, subject, semester, score, teacherId:identity.id });
      }
    });

    if (!records.length) {
      return NextResponse.json({ ok:false, error:"Không tìm thấy dòng hợp lệ. Cần mã học sinh, họ tên, môn học và điểm từ 0 đến 10." }, { status:400 });
    }
    const count = addAcademicRecords(records);
    return NextResponse.json({ ok:true, count });
  } catch {
    return NextResponse.json({ ok:false, error:"Không thể đọc file. Hãy kiểm tra định dạng và thử lại." }, { status:400 });
  }
}
