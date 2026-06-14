import fs from "node:fs";
import path from "node:path";
const root = process.env.DATA_DIR || path.join(process.cwd(), "data");
const days = Number(process.env.SESSION_RETENTION_DAYS || 90);
const cutoff = Date.now() - days * 86400000;
const sessions = path.join(root, "sessions");
let removed = 0;
if (fs.existsSync(sessions)) {
  for (const owner of fs.readdirSync(sessions)) {
    const dir = path.join(sessions, owner);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const name of fs.readdirSync(dir).filter(x => x.endsWith(".json"))) {
      const file = path.join(dir, name);
      try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        if (!data?.session?.updatedAt || data.session.updatedAt < cutoff) {
          fs.rmSync(file, { force:true }); fs.rmSync(`${file}.bak`, { force:true }); removed++;
        }
      } catch { /* preserve unreadable files for manual recovery */ }
    }
  }
}
console.log(`Removed ${removed} expired session file(s).`);
