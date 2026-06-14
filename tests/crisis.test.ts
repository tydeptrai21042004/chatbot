import { describe, expect, it } from "vitest";
import { assessCrisisRisk } from "../src/server/utils/crisis";

describe("crisis assessment", () => {
  it.each([
    "Em muốn tự tử tối nay",
    "Em có dao và em muốn chết ngay bây giờ",
    "Người đó đang ở đây và dọa đánh em ngay bây giờ",
    "Em bị ép và chuyện đang xảy ra lúc này"
  ])("detects immediate danger: %s", (message) => {
    const result = assessCrisisRisk({ message });
    expect(result.riskLevel).toBe("high_risk");
    expect(result.shouldBypassModel).toBe(true);
  });

  it.each([
    "Em không muốn tự tử",
    "Em không có ý định tự tử",
    "Em chưa bao giờ muốn chết",
    "Em không hề bị đánh"
  ])("handles negation: %s", (message) => {
    expect(assessCrisisRisk({ message }).riskLevel).toBe("safe");
  });

  it("does not combine old violence with a harmless current message", () => {
    expect(assessCrisisRisk({ message: "Hôm nay em ổn", history: [{ role: "user", content: "Em từng bị đánh nhiều năm trước" }] }).riskLevel).not.toBe("high_risk");
  });

  it.each([
    "Bài luận của em phân tích từ tự tử",
    "Cho em định nghĩa bạo lực gia đình",
    "Trong phim nhân vật nói muốn chết"
  ])("does not treat educational/media context as a personal crisis: %s", (message) => {
    expect(assessCrisisRisk({ message }).riskLevel).toBe("safe");
  });

  it("routes third-person risk to a careful but non-bypass response", () => {
    const result = assessCrisisRisk({ message: "Bạn em nói bạn ấy muốn chết tối nay" });
    expect(result.riskLevel).toBe("distress");
    expect(result.shouldBypassModel).toBe(false);
  });

  it.each(["Em đang hoảng loạn", "Em khó thở và đau ngực", "Em không chịu nổi nữa"])('marks distress without inventing immediate danger: %s', (message) => {
    const result = assessCrisisRisk({ message });
    expect(result.riskLevel).toBe("distress");
    expect(result.shouldBypassModel).toBe(false);
  });

  it("returns unique matched terms", () => {
    const result = assessCrisisRisk({ message: "Em muốn chết, em muốn chết ngay bây giờ" });
    expect(new Set(result.matchedTerms).size).toBe(result.matchedTerms.length);
  });
});
