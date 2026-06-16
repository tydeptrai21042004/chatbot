import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = 1;
function key(): Buffer {
  const raw = process.env.CHAT_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") throw new Error("CHAT_ENCRYPTION_KEY is required in production");
    return Buffer.alloc(32, 7);
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) throw new Error("CHAT_ENCRYPTION_KEY must be a base64 encoded 32-byte key");
  return decoded;
}
export type EncryptedPayload = { ciphertext:string; iv:string; tag:string; version:number };
export function encryptText(value:string):EncryptedPayload {
  const iv=randomBytes(12); const cipher=createCipheriv("aes-256-gcm",key(),iv);
  const ciphertext=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return {ciphertext:ciphertext.toString("base64"),iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),version:VERSION};
}
export function decryptText(payload:EncryptedPayload):string {
  const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(payload.iv,"base64"));
  decipher.setAuthTag(Buffer.from(payload.tag,"base64"));
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext,"base64")),decipher.final()]).toString("utf8");
}
