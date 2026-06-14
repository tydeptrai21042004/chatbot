import type { RoleId } from "../prompts/personas";
import type { ConversationSession, SessionTurn } from "../types/session";
import { appendMessage, deleteOwnedSession, getOwnedSession, listMessages, saveOwnedSession } from "../data/store";
function empty(sessionId:string,ownerId:string,roleId:RoleId):ConversationSession { const now=Date.now(); return {sessionId,ownerId,roleId,rollingSummary:"",stableFacts:[],recentTurns:[],createdAt:now,updatedAt:now,totalTurns:0,customPersona:{enabled:false}}; }
export async function getOrCreateSession(sessionId:string,ownerId:string,roleId:RoleId){ return structuredClone((await getOwnedSession(sessionId,ownerId))??empty(sessionId,ownerId,roleId)); }
export async function saveSession(s:ConversationSession){ s.updatedAt=Date.now(); await saveOwnedSession(structuredClone(s)); }
export async function saveSessionTurn(sessionId:string,ownerId:string,turn:SessionTurn){ await appendMessage(sessionId,ownerId,structuredClone(turn)); }
export async function listSessionTurns(sessionId:string,ownerId:string){ const r=await listMessages(sessionId,ownerId); return r?structuredClone(r):null; }
export async function deleteSession(sessionId:string,ownerId:string){ return deleteOwnedSession(sessionId,ownerId); }
