#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildR44P35DynamicScorecard } from "../../lib/product/vlm-dynamic-product-scoring.mjs";
const result = buildR44P35DynamicScorecard();
const index = process.argv.indexOf("--output");
if (index >= 0) {
  const output = process.argv[index + 1];
  if (!output) throw new Error("output_path_required");
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(path.resolve(output), `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify(result, null, 2));
