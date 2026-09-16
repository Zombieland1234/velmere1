import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

/** Validate local evidence bytes. Success is integrity ONLY, not licence approval. */
export function verifyEvidenceFile(root, evidence) {
  const errors = [];
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return ["evidence_object_required"];
  if (typeof evidence.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(evidence.sha256)) errors.push("bad_evidence_hash");
  const rel = evidence.path;
  if (typeof rel !== "string" || !rel.trim() || rel !== rel.trim()
      || rel.includes("\\") || rel.includes("\0") || path.posix.isAbsolute(rel)
      || /^[a-zA-Z]:/u.test(rel) || rel.split("/").some((p) => !p || p === "." || p === "..")) {
    return [...errors, "unsafe_or_missing_evidence_path"];
  }
  try {
    const rootReal = fs.realpathSync(root);
    let cursor = rootReal;
    for (const part of rel.split("/")) {
      cursor = path.join(cursor, part);
      if (fs.lstatSync(cursor).isSymbolicLink()) return [...errors, "symlink_evidence_forbidden"];
    }
    const target = fs.realpathSync(cursor);
    const relative = path.relative(rootReal, target);
    if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) return [...errors, "evidence_outside_root"];
    const stat = fs.statSync(target);
    if (!stat.isFile()) return [...errors, "evidence_not_regular_file"];
    if (stat.size === 0) return [...errors, "evidence_empty"];
    if (stat.size > 16 * 1024 * 1024) return [...errors, "evidence_too_large"];
    const actual = createHash("sha256").update(fs.readFileSync(target)).digest("hex");
    if (!errors.includes("bad_evidence_hash") && actual !== evidence.sha256) errors.push("evidence_hash_mismatch");
  } catch { errors.push("evidence_file_unreadable"); }
  return errors;
}
