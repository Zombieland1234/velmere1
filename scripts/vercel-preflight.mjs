import { filterOptionalDocumentationErrors, pkg, setCurrentPhase, writePreflightTrace } from "./preflight/context.mjs";
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync(new URL("../config/preflight-phase-manifest.json", import.meta.url), "utf8"));
const phases = manifest.phases;
const phaseTimings = [];
let textFiles = [];
let activeCheckpoint = phases[0]?.checkpoint ?? "main";

function trace() {
  writePreflightTrace(
    process.env.VELMERE_PREFLIGHT_TRACE_OUT,
    phases.map((phase) => phase.path.split("/").at(-1)),
    phaseTimings,
  );
}

function checkpointLabel(checkpoint) {
  if (checkpoint === "main") return "Velmère preflight failed:";
  if (checkpoint === "late") return "Velmère late preflight guards failed:";
  return "Velmère post-late preflight guards failed:";
}

function enforceCheckpoint(checkpoint) {
  if (!filterOptionalDocumentationErrors(checkpointLabel(checkpoint))) {
    trace();
    process.exit(1);
  }
  if (checkpoint === "main") {
    console.log(`Velmère preflight OK · next ${pkg.dependencies?.next ?? pkg.devDependencies?.next} · scanned ${textFiles.length} files`);
  }
}

for (const phase of phases) {
  if (phase.checkpoint !== activeCheckpoint) {
    enforceCheckpoint(activeCheckpoint);
    activeCheckpoint = phase.checkpoint;
  }
  setCurrentPhase(phase.path);
  const started = performance.now();
  const module = await import(`./preflight/${phase.path.split("/").at(-1)}`);
  if (phase.exportsTextFiles && Array.isArray(module.textFiles)) textFiles = module.textFiles;
  phaseTimings.push({
    name: phase.path.split("/").at(-1),
    logicalPhase: phase.logicalPhase,
    durationMs: Number((performance.now() - started).toFixed(3)),
  });
}

enforceCheckpoint(activeCheckpoint);
trace();
