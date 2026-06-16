import { describe, expect, it } from "vitest";
import { manualAcademicRecordSchema, normalizeManualAcademicRecord } from "../src/server/academic/manualRecord";

const valid = {studentUserId:"550e8400-e29b-41d4-a716-446655440000",subject:"Toán",semester:"HK1",assessmentType:"15 phút",className:"10A1",score:8.5,note:"Tiến bộ"};
describe("manual academic record validation",()=>{
 it("accepts a complete manual grade",()=>{expect(manualAcademicRecordSchema.safeParse(valid).success).toBe(true)});
 it("accepts decimal score sent as text",()=>{expect(manualAcademicRecordSchema.parse({...valid,score:"8.5"}).score).toBe(8.5)});
 it("rejects scores below zero and above ten",()=>{expect(manualAcademicRecordSchema.safeParse({...valid,score:-1}).success).toBe(false);expect(manualAcademicRecordSchema.safeParse({...valid,score:10.1}).success).toBe(false)});
 it("requires a valid assigned student identifier shape",()=>{expect(manualAcademicRecordSchema.safeParse({...valid,studentUserId:"student-1"}).success).toBe(false)});
 it("rejects empty subject, semester, and assessment type",()=>{expect(manualAcademicRecordSchema.safeParse({...valid,subject:"",semester:"",assessmentType:""}).success).toBe(false)});
 it("limits notes to 300 characters",()=>{expect(manualAcademicRecordSchema.safeParse({...valid,note:"x".repeat(301)}).success).toBe(false)});
 it("normalizes repeated whitespace",()=>{const x=normalizeManualAcademicRecord({...valid,subject:"  Ngữ   văn ",semester:" Học   kỳ 1 "});expect(x.subject).toBe("Ngữ văn");expect(x.semester).toBe("Học kỳ 1")});
});
