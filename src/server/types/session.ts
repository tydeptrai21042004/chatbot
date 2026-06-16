import type { RoleId } from "../prompts/personas";
export type SessionTurnRole = "user" | "assistant";
export interface SessionTurn { role:SessionTurnRole; content:string; timestamp:number; }
export interface MemorySnapshot { rollingSummary:string; stableFacts:string[]; recentTurns:SessionTurn[]; }
export interface CustomPersonaState { enabled:boolean; name?:string; prompt?:string; }
export interface SessionWellbeingSnapshot {
  latestRiskLevel:"safe"|"distress"|"high_risk";
  latestReasons:string[];
  latestMatchedTerms:string[];
  lastAssessedAt:number;
  distressCount:number;
  highRiskCount:number;
}
export interface ConversationSession extends MemorySnapshot { sessionId:string; ownerId:string; roleId:RoleId; createdAt:number; updatedAt:number; totalTurns:number; customPersona:CustomPersonaState; wellbeing?:SessionWellbeingSnapshot; }
export interface MemoryRefreshResult { updated:boolean; usedFallback:boolean; }
