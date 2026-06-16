import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const migration = readFileSync('migrations/003_legacy_schema_compatibility.sql','utf8');
const store = readFileSync('src/server/data/store.ts','utf8');

describe('legacy Neon schema compatibility',()=>{
  it('adds the columns reported missing in production',()=>{
    expect(migration).toContain('ALTER TABLE users ADD COLUMN IF NOT EXISTS role text');
    expect(migration).toContain('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS encrypted_state text');
  });
  it('is additive and does not drop production tables',()=>{
    expect(migration).not.toMatch(/DROP\s+TABLE/i);
    expect(migration).not.toMatch(/TRUNCATE/i);
  });
  it('does not query the removed sessions.data wellbeing column',()=>{
    expect(store).not.toContain('SELECT owner_id,data FROM sessions');
    expect(store).toContain('FROM risk_assessments');
  });
});
