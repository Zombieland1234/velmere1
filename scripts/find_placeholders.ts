import fs from "node:fs";
import path from "node:path";

const files = [
  "lib/security/benchmarks/institutional-asset-profiles.ts",
  "lib/security/benchmarks/institutional-asset-profiles-extended.ts",
];

const placeholderPatterns = [
  /0x112233/i,
  /0x444455/i,
  /0x89abcdef/i,
  /0x987654/i,
  /0x1111aaaa/i,
  /0x2222bbbb/i,
  /0x3333cccc/i,
  /0x12345678901234567890/i,
  /0x123456789abcdef/i,
];

for (const file of files) {
  const fullPath = path.resolve(file);
  const content = fs.readFileSync(fullPath, "utf8");
  console.log(`\n=== Checking ${file} ===`);
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    for (const pat of placeholderPatterns) {
      if (pat.test(line)) {
        console.log(`Line ${i + 1}: ${line.trim()}`);
        break;
      }
    }
  });
}
