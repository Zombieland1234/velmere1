import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "app");
const failures = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(appDir).filter((file) => /\.(ts|tsx)$/.test(file))) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (/params\s*:\s*\{/.test(source) && /(?:page|layout|opengraph-image|route)\.(?:ts|tsx)$/.test(relative)) {
    failures.push(`${relative}: synchronous params type remains`);
  }
  if (/searchParams\?*\s*:\s*\{/.test(source) && /page\.(?:ts|tsx)$/.test(relative)) {
    failures.push(`${relative}: synchronous searchParams type remains`);
  }
}

const rootNotFound = fs.readFileSync(path.join(appDir, "not-found.tsx"), "utf8");
if (/<html[\s>]/i.test(rootNotFound) || /<body[\s>]/i.test(rootNotFound)) {
  failures.push("app/not-found.tsx: nested html/body tags remain");
}

if (failures.length) {
  console.error("PASS717 FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS717 PASS — Next 16 async route props and 404 document boundary are clean.");
