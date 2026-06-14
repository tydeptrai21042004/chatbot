import type { RoleId } from "../prompts/personas";
import type { ConversationSession, SessionTurn } from "../types/session";
import { appendMessage, deleteOwnedSession, getOwnedSession, listMessages, saveOwnedSession } from "../data/store";
function empty(sessionId:string,ownerId:string,roleId:RoleId):ConversationSession { const now=Date.now(); return {sessionId,ownerId,roleId,rollingSummary:"",stableFacts:[],recentTurns:[],createdAt:now,updatedAt:now,totalTurns:0,customPersona:{enabled:false}}; }
export function getOrCreateSession(sessionId:string,ownerId:string,roleId:RoleId){ return structuredClone(getOwnedSession(sessionId,ownerId)??empty(sessionId,ownerId,roleId)); }
export function saveSession(s:ConversationSession){ s.updatedAt=Date.now(); saveOwnedSession(structuredClone(s)); }
export function saveSessionTurn(sessionId:string,ownerId:string,turn:SessionTurn){ appendMessage(sessionId,ownerId,structuredClone(turn)); }
export function listSessionTurns(sessionId:string,ownerId:string){ const r=listMessages(sessionId,ownerId); return r?structuredClone(r):null; }
export function deleteSession(sessionId:string,ownerId:string){ return deleteOwnedSession(sessionId,ownerId); }
