import fs from "node:fs";
import path from "node:path";
const root = process.env.DATA_DIR || path.join(process.cwd(), "data");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(root, "backups", `manual-${stamp}`);
fs.mkdirSync(target, { recursive: true });
for (const name of ["users.json", "sessions", "academics"]) {
  const source = path.join(root, name);
  if (fs.existsSync(source)) fs.cpSync(source, path.join(target, name), { recursive: true });
}
console.log(`Backup created: ${target}`);
