import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const handoffDir = path.join(root, "docs", "codex-handoff");
const codexRootPattern = /^CODEX_.*\.(?:ts|tsx|js|jsx|mjs|cjs)$/;

fs.mkdirSync(handoffDir, { recursive: true });

let moved = 0;
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isFile() || !codexRootPattern.test(entry.name)) continue;
  const source = path.join(root, entry.name);
  const target = path.join(handoffDir, `${entry.name}.txt`);
  fs.renameSync(source, target);
  moved += 1;
}

if (moved > 0) {
  console.log(`Codex handoff repair moved ${moved} root artifact(s) into docs/codex-handoff as .txt.`);
} else {
  console.log("Codex handoff repair OK · no root source artifacts.");
}
