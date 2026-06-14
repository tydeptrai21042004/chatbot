import type { RoleId } from "../prompts/personas";
export type SessionTurnRole = "user" | "assistant";
export interface SessionTurn { role:SessionTurnRole; content:string; timestamp:number; }
export interface MemorySnapshot { rollingSummary:string; stableFacts:string[]; recentTurns:SessionTurn[]; }
export interface CustomPersonaState { enabled:boolean; name?:string; prompt?:string; }
export interface ConversationSession extends MemorySnapshot { sessionId:string; ownerId:string; roleId:RoleId; createdAt:number; updatedAt:number; totalTurns:number; customPersona:CustomPersonaState; }
export interface MemoryRefreshResult { updated:boolean; usedFallback:boolean; }
