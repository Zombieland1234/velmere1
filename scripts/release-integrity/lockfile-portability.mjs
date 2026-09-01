import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const PUBLIC_HOSTS = new Set(["registry.npmjs.org"]);

export function inspectLockfile(root, lockName = "package-lock.json") {
  const lockPath = path.join(root, lockName);
  const raw = fs.readFileSync(lockPath, "utf8");
  const lock = JSON.parse(raw);
  const resolved = [];
  const violations = [];
  for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
    if (!metadata || typeof metadata !== "object" || typeof metadata.resolved !== "string") continue;
    let url;
    try { url = new URL(metadata.resolved); } catch {
      violations.push({ packagePath, resolved: metadata.resolved, reason: "invalid_url" });
      continue;
    }
    resolved.push({ packagePath, host: url.hostname, resolved: metadata.resolved });
    if (url.protocol !== "https:") violations.push({ packagePath, resolved: metadata.resolved, reason: "non_https" });
    if (!PUBLIC_HOSTS.has(url.hostname)) violations.push({ packagePath, resolved: metadata.resolved, reason: "non_public_registry" });
  }
  const integrityMissing = Object.entries(lock.packages ?? {})
    .filter(([packagePath, metadata]) => packagePath.startsWith("node_modules/") && metadata && typeof metadata === "object" && metadata.resolved && !metadata.integrity)
    .map(([packagePath]) => packagePath);
  return {
    schemaVersion: "velmere.release-integrity.lockfile-portability.v1",
    ok: violations.length === 0 && integrityMissing.length === 0,
    lockfileVersion: lock.lockfileVersion ?? null,
    packageEntries: Object.keys(lock.packages ?? {}).length,
    resolvedEntries: resolved.length,
    publicResolvedEntries: resolved.length - violations.filter((item) => item.reason === "non_public_registry").length,
    violations,
    integrityMissing,
    sha256: createHash("sha256").update(raw).digest("hex"),
  };
}
