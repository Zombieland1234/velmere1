export function evaluateResumeState(previous, current) {
  const reasons = [];
  if (!previous || typeof previous !== "object") reasons.push("state_missing");
  if (previous?.schemaVersion !== current.schemaVersion) reasons.push("schema_changed");
  if (previous?.node !== current.node) reasons.push("node_changed");
  if (previous?.commandFingerprint !== current.commandFingerprint) reasons.push("commands_changed");
  if (previous?.source?.sha256 !== current.sourceSha256) reasons.push("source_changed");
  if (previous?.packageLockSha256 !== current.packageLockSha256) reasons.push("lockfile_changed");
  return { reusable: reasons.length === 0, reasons };
}

export function canReuseStep(step, current) {
  return Boolean(
    step?.ok === true &&
    step.commandFingerprint === current.commandFingerprint &&
    step.sourceSha256Before === current.sourceSha256 &&
    step.sourceSha256After === current.sourceSha256
  );
}
