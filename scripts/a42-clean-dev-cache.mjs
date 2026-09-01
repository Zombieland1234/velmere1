#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { loadA42Contract, prepareDevRuntimeCache } from "../lib/build/dev-runtime-cache-recovery.mjs";
import {
  PASS35_A42_REVISION_ID,
  isProcessAlive,
  readJsonFile,
  removeFileIfPresent,
  sessionMarkerPath,
  sourceFingerprintPath,
} from "./lib/a42-dev-runtime-policy.mjs";

const root = process.cwd();
const sessionPath = sessionMarkerPath(root);
const session = readJsonFile(sessionPath);
const activePid = Number(session?.parentPid);
if (session && isProcessAlive(activePid)) {
  process.stderr.write(`[a42-clean] refused: an A42 dev launcher is active for this folder (PID ${activePid}). Stop it first.\n`);
  process.exit(1);
}

const contract = loadA42Contract(root);
const result = prepareDevRuntimeCache({ root, contract, forceClear: true });
removeFileIfPresent(sessionPath);
removeFileIfPresent(sourceFingerprintPath(root));
removeFileIfPresent(path.join(root, ".velmere", "dev-runtime", "last-launch.json"));

process.stdout.write(`${JSON.stringify({
  schemaVersion: "velmere.pass35.a42.clean-dev-cache.v1",
  revisionId: PASS35_A42_REVISION_ID,
  cacheCleared: result.cacheCleared,
  reasons: result.reasons,
  boundary: "Only the direct project child .next and local .velmere/dev-runtime markers were touched.",
}, null, 2)}\n`);
