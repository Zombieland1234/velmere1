import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const cssPath = path.join(root, "app/globals.css");
const before = fs.readFileSync(cssPath, "utf8");

let repairedApplyBlocks = 0;
let repairedBracketBoundaries = 0;
let repairedDecimalBoundaries = 0;

const after = before.replace(/@apply\s+([^;}]*)(?=[;}])/gu, (full, value) => {
  let repaired = value.replace(/\](?=[^/\s:;},)])/gu, () => {
    repairedBracketBoundaries += 1;
    return "] ";
  });
  repaired = repaired.replace(/(\d)\s+\.(\d)/gu, (_match, left, right) => {
    repairedDecimalBoundaries += 1;
    return `${left}.${right}`;
  });
  if (repaired !== value) repairedApplyBlocks += 1;
  return full.replace(value, repaired);
});

if (after === before) {
  throw new Error("a90_a59_tailwind_apply_repair_no_changes");
}

fs.writeFileSync(cssPath, after, "utf8");
process.stdout.write(`${JSON.stringify({
  schemaVersion: "velmere.pass36.a90.a59-tailwind-apply-repair.v1",
  repairedApplyBlocks,
  repairedBracketBoundaries,
  repairedDecimalBoundaries,
  bytesBefore: Buffer.byteLength(before),
  bytesAfter: Buffer.byteLength(after),
}, null, 2)}\n`);
