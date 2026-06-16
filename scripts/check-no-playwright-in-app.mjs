import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const forbiddenFiles = ['playwright.config.ts', 'playwright.config.mts'];
const failures = [];

for (const file of forbiddenFiles) {
  if (existsSync(join(root, file))) failures.push(`${file} must not exist in the application root`);
}

const scanRoots = ['app', 'src', 'tests'];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full).replaceAll('\\\\', '/');
    if (rel.startsWith('tests/e2e/') || rel.startsWith('e2e/')) continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(name)) {
      const text = readFileSync(full, 'utf8');
      if (text.includes("@playwright/test")) failures.push(`${rel} imports @playwright/test`);
    }
  }
}
for (const dir of scanRoots) walk(join(root, dir));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Application build is isolated from Playwright.');
