const SENSITIVE_TERMS = [
  "địt", "đụ", "đéo", "đmm", "dm", "vcl", "vl", "cặc", "lồn", "buồi",
  "óc chó", "súc vật", "ngu như", "đồ ngu", "chết mẹ", "cút đi"
];

function normalize(value: string) {
  return value.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type SensitiveContentAssessment = {
  detected: boolean;
  matchedTerms: string[];
  sanitizedText: string;
  warning?: string;
};

export function scanSensitiveContent(message: string): SensitiveContentAssessment {
  const normalized = normalize(message);
  const matchedTerms = SENSITIVE_TERMS.filter((term) => normalized.includes(term));
  let sanitizedText = message;
  for (const term of matchedTerms) {
    sanitizedText = sanitizedText.replace(new RegExp(escapeRegExp(term), "giu"), "***");
  }
  return {
    detected: matchedTerms.length > 0,
    matchedTerms: [...new Set(matchedTerms)],
    sanitizedText,
    warning: matchedTerms.length
      ? "Một số từ ngữ nhạy cảm đã được che bớt. Bạn vẫn có thể chia sẻ cảm xúc, nhưng hãy cố gắng dùng cách diễn đạt tôn trọng và an toàn."
      : undefined
  };
}
