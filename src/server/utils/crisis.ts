import type { RiskLevel } from "../prompts/safety";

export type ChatHistoryMessage = { role: "user" | "assistant"; content: string };
export interface CrisisAssessment {
  riskLevel: RiskLevel;
  shouldBypassModel: boolean;
  matchedTerms: string[];
  reasons: string[];
  flags: { selfHarm: boolean; suicide: boolean; violence: boolean; coercion: boolean; panic: boolean; immediateDanger: boolean; medicalWarning: boolean };
}

const normalize = (value: string) => value.toLowerCase().normalize("NFC").replace(/[“”"']/g, " ").replace(/\s+/g, " ").trim();
const SUICIDE = ["tự tử", "muốn chết", "không muốn sống", "kết thúc cuộc đời", "tự làm hại bản thân", "cắt tay", "uống thuốc quá liều", "nhảy lầu", "treo cổ"];
const SELF_HARM = ["muốn làm đau bản thân", "không chịu nổi nữa", "hết cách rồi", "muốn biến mất khỏi đây"];
const VIOLENCE = ["bạo lực gia đình", "bị đánh", "đánh em", "dọa đánh", "đe dọa", "khống chế", "nhốt", "đuổi khỏi nhà", "cưỡng ép"];
const COERCION = ["ép em", "bị ép", "bị kiểm soát", "không cho ra ngoài", "bắt phải làm"];
const PANIC = ["hoảng loạn", "khó thở", "tim đập nhanh", "không thở nổi", "muốn ngất", "quá sợ", "không kiểm soát được"];
const IMMEDIATE = ["ngay bây giờ", "lúc này", "bây giờ", "đang ở đây", "đang xảy ra", "tối nay", "sắp làm", "có kế hoạch", "có dao", "có thuốc"];
const MEDICAL = ["đau ngực", "ngất", "co giật", "không thở được", "mất ý thức"];
const EDUCATIONAL = ["bài luận", "bài tập", "nghiên cứu", "định nghĩa", "từ khóa", "ví dụ", "phim", "truyện"];
const THIRD_PERSON = ["bạn em", "bạn tôi", "em gái em", "anh em", "chị em", "học sinh của tôi", "một người bạn"];

function isNegated(text: string, term: string) {
  const index = text.indexOf(term);
  if (index < 0) return false;
  const prefix = text.slice(Math.max(0, index - 48), index);
  return /(?:không|chưa|chẳng|không hề|không còn|không có ý định|chưa bao giờ)(?:\s+\S+){0,4}\s*$/.test(prefix);
}
function activeMatches(text: string, patterns: string[]) {
  return patterns.filter((pattern) => text.includes(pattern) && !isNegated(text, pattern));
}
function hasAny(text: string, patterns: string[]) { return patterns.some((pattern) => text.includes(pattern)); }

export function assessCrisisRisk(input: { message: string; history?: ChatHistoryMessage[] }): CrisisAssessment {
  const current = normalize(input.message);
  const userHistory = normalize((input.history ?? []).filter((item) => item.role === "user").slice(-4).map((item) => item.content).join(" "));
  const educationalContext = hasAny(current, EDUCATIONAL);
  const thirdPersonContext = hasAny(current, THIRD_PERSON) && !/(?:em|tôi|mình)\s+(?:cũng|đang|muốn|bị)/.test(current);

  const suicide = activeMatches(current, SUICIDE);
  const selfHarm = activeMatches(current, SELF_HARM);
  const violence = activeMatches(current, VIOLENCE);
  const coercion = activeMatches(current, COERCION);
  const panic = activeMatches(current, PANIC);
  const immediate = activeMatches(current, IMMEDIATE);
  const medical = activeMatches(current, MEDICAL);
  const pastConcern = activeMatches(userHistory, [...SUICIDE, ...VIOLENCE, ...COERCION]).length > 0;

  const personalCrisis = !educationalContext && !thirdPersonContext;
  const flags = {
    selfHarm: personalCrisis && (suicide.length > 0 || selfHarm.length > 0),
    suicide: personalCrisis && suicide.length > 0,
    violence: personalCrisis && violence.length > 0,
    coercion: personalCrisis && coercion.length > 0,
    panic: personalCrisis && panic.length > 0,
    immediateDanger: personalCrisis && immediate.length > 0,
    medicalWarning: personalCrisis && medical.length > 0
  };

  let riskLevel: RiskLevel = "safe";
  let shouldBypassModel = false;
  const reasons: string[] = [];

  if ((flags.suicide && flags.immediateDanger) || ((flags.violence || flags.coercion) && flags.immediateDanger)) {
    riskLevel = "high_risk";
    shouldBypassModel = true;
    reasons.push("Có dấu hiệu nguy hiểm hiện tại cần ưu tiên hỗ trợ trực tiếp.");
  } else if (flags.suicide || flags.selfHarm || flags.violence || flags.coercion || flags.panic || flags.medicalWarning || pastConcern || thirdPersonContext) {
    riskLevel = "distress";
    reasons.push(thirdPersonContext ? "Có dấu hiệu người dùng đang báo cáo nguy cơ của người khác." : "Có dấu hiệu đau khổ hoặc mất an toàn cần phản hồi thận trọng.");
  }

  return {
    riskLevel,
    shouldBypassModel,
    matchedTerms: [...new Set([...suicide, ...selfHarm, ...violence, ...coercion, ...panic, ...immediate, ...medical])],
    reasons,
    flags
  };
}
