import fs from "node:fs";

const text = fs.readFileSync(new URL("../package-lock.json", import.meta.url), "utf8");
const forbidden = [
  "applied-caas-gateway",
  "packages.hub.ace-research.openai.org",
  "artifactory/api/npm",
];

const matches = forbidden.filter((value) => text.includes(value));
if (matches.length > 0) {
  console.error(`package-lock.json contains private registry references: ${matches.join(", ")}`);
  process.exit(1);
}

console.log("package-lock.json uses portable public registry URLs.");
