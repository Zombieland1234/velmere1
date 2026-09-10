import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("chatgpt_master_pipeline_pack.json", "utf8"));
const p1 = data.phase4InitialArchitectureAndPipelinePart1;
const p2 = data.phase4ContinuationPipelinePart2AndReleaseGateScript;

// 1. Extract Part 1 code
const p1Start = p1.indexOf("/**\n\nVELMÈRE — Unified Institutional Audit Pipeline");
const p1Trunc = p1.indexOf("Tricentis Americas, Inc.");
let p1Code = p1.slice(p1Start, p1Trunc !== -1 ? p1Trunc : undefined);
p1Code = p1Code.replace(/throw new Error\(\s*\"Evidence bundle generation aborted:[\s\S]*$/, "");

// 2. Extract Part 2 pipeline code
const p2Start = p2.indexOf("  \"Evidence bundle generation aborted: no evidence was produced.\",");
const p2Split = p2.indexOf("A teraz drugi plik.");
const p2Code = p2.slice(p2Start, p2Split);

// Combine to get the complete unified-institutional-gate.ts
const fullPipelineCode = p1Code + `throw new Error(\n` + p2Code;

// 3. Extract Release Gate script
const scriptStart = p2.indexOf("/**\n\nVELMÈRE — MASTER AUDIT PIPELINE");
const scriptCode = p2.slice(scriptStart);

fs.writeFileSync("lib/security/institutional-pipeline-gate.ts", fullPipelineCode.trim() + "\n", "utf8");
fs.writeFileSync("scripts/qa/master-adversarial-gate.ts", scriptCode.trim() + "\n", "utf8");

console.log("Successfully extracted:");
console.log("- lib/security/institutional-pipeline-gate.ts:", fullPipelineCode.length, "bytes");
console.log("- scripts/qa/master-adversarial-gate.ts:", scriptCode.length, "bytes");
