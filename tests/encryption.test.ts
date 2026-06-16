import {describe,it,expect} from 'vitest';import{encryptText,decryptText}from'../src/server/security/encryption';
describe('chat encryption',()=>{it('round trips without storing plaintext',()=>{const raw='Nội dung nhạy cảm';const e=encryptText(raw);expect(e.ciphertext).not.toContain(raw);expect(decryptText(e)).toBe(raw);});});
