import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { assertExternalOutput, buildExternalIntegritySeal, sameSourceSnapshot, sourceAuthoritySnapshot } from "./a80r1-two-phase-release-controller-lib.mjs";

const invariant = (condition, code) => { if (!condition) throw new Error(code); };
function args(argv) {
  const values = new Map();
  const allowed = new Set(["--source-root", "--phase1", "--source-zip", "--materials-zip", "--final-verification", "--roadmap", "--output"]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    invariant(allowed.has(name), `a102r41_seal_argument_unknown:${name}`);
    invariant(!values.has(name), `a102r41_seal_argument_duplicate:${name}`);
    const value = argv[++index];
    invariant(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `a102r41_seal_argument_value:${name}`);
    values.set(name, path.resolve(value));
  }
  for (const name of allowed) invariant(values.has(name), `a102r41_seal_argument_required:${name}`);
  return Object.fromEntries([...values].map(([key, value]) => [key.slice(2).replaceAll("-", "_"), value]));
}

try {
  const options = args(process.argv.slice(2));
  const before = sourceAuthoritySnapshot(options.source_root);
  assertExternalOutput(options.source_root, options.output);
  const phaseBytes = fs.readFileSync(options.phase1);
  const phase1 = parseStrictJsonCli(phaseBytes.toString("utf8"), { maxBytes: 8 * 1024 * 1024, maxDepth: 64, maxNodes: 250000, requireObject: true });
  const seal = buildExternalIntegritySeal({
    phase1,
    sourceArchivePath: options.source_zip,
    materialsArchivePath: options.materials_zip,
    finalVerificationPath: options.final_verification,
    roadmapPath: options.roadmap,
  });
  invariant(sameSourceSnapshot(before, phase1.source), "a102r41_seal_phase1_current_source_mismatch");
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(seal, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  const after = sourceAuthoritySnapshot(options.source_root);
  invariant(sameSourceSnapshot(before, after), "a102r41_seal_source_changed_during_write");
  process.stdout.write(`${JSON.stringify(seal, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ status: "FAIL_A102R41_EXTERNAL_INTEGRITY_SEAL", error: error instanceof Error ? error.message : String(error), globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false })}\n`);
  process.exitCode = 1;
}
