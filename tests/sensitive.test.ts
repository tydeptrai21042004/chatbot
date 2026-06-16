import { describe, expect, it } from "vitest";
import { scanSensitiveContent } from "../src/server/utils/sensitive";

describe("sensitive language filter",()=>{
  it("masks configured offensive terms",()=>{
    const result=scanSensitiveContent("Đồ ngu, cút đi!");
    expect(result.detected).toBe(true);
    expect(result.sanitizedText).not.toContain("ngu");
    expect(result.warning).toBeTruthy();
  });
  it("does not block ordinary emotional disclosure",()=>{
    const result=scanSensitiveContent("Em đang buồn và rất áp lực vì điểm số.");
    expect(result.detected).toBe(false);
    expect(result.sanitizedText).toContain("áp lực");
  });
});
