import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const files = fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".mjs") && f !== "fix_paths.mjs");
let fixed = 0;

for (const file of files) {
  const p = path.join(scriptsDir, file);
  const content = fs.readFileSync(p, "utf8");
  if (content.includes("decodeURIComponent(new URL(")) {
    let updated = content;
    if (!updated.includes("fileURLToPath")) {
      updated = 'import { fileURLToPath } from "node:url";\n' + updated;
    }
    updated = updated.replaceAll(
      'path.resolve(decodeURIComponent(new URL("..", import.meta.url).pathname))',
      'path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")'
    );
    updated = updated.replaceAll(
      'path.resolve(decodeURIComponent(new URL(".", import.meta.url).pathname))',
      'path.resolve(path.dirname(fileURLToPath(import.meta.url)))'
    );
    if (updated !== content) {
      fs.writeFileSync(p, updated, "utf8");
      fixed++;
      console.log(`Updated Windows path in: ${file}`);
    }
  }
}
console.log(`Total scripts fixed for Windows paths: ${fixed}`);
