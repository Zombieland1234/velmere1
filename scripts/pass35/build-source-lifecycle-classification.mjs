#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildSourceLifecycleClassification, lifecycleClassificationOutputPath } from "./source-lifecycle-classifier.mjs";

const root = process.cwd();
const manifest = await buildSourceLifecycleClassification(root);
const output = path.join(root, lifecycleClassificationOutputPath);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: lifecycleClassificationOutputPath, ...manifest.summary }));
