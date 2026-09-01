#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

INPUT_BYTES = 14399
INPUT_SHA256 = "687b14858ec05972b97640e3943de1c779f3b7bcfbe819d9367ee9a9e2b3abe4"
OUTPUT_BYTES = 18911
OUTPUT_SHA256 = "805d80391fd2b4def259e896e1aadcd3b4bbe130c6374a5bc28a00f760abb6d2"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stable_sha(value: object) -> str:
    return sha256_bytes(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"patch_anchor_count_mismatch:{label}:{count}")
    return source.replace(old, new, 1)


def build(source: str) -> tuple[str, list[str]]:
    applied: list[str] = []

    receipt_anchor = "const receiptPath = join(outputRoot, 'P47_EXACT_WINDOWS_BUILD_RELEVANT_PROJECTION_RECEIPT.json');\n"
    generated_policy = """
const controlledGeneratedFile = Object.freeze({
  path: 'next-env.d.ts',
  sourceByteLength: 262,
  sourceSha256: 'e02cf94f68fe440954d3213106a7e943e5424cc867d7cd3ab406dc31263e6767',
  generatedByteLength: 247,
  generatedSha256: '7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651',
  generatedProjectionPayloadBytes: 20952819,
  generatedProjectionAggregateSha256: '1faa444439bff86564eb95bf283c91eca829053d16de70628c45df9d25eda405',
  rationale: 'Next.js 16.2.12 deterministically rewrites next-env.d.ts from the source-bound .next-pass25-webpack route import to the canonical .next route import during production build. The generated mutation is recorded, constrained to this one file, and the exact P46 source bytes are restored before final identity adjudication.',
});
"""
    source = replace_once(source, receipt_anchor, receipt_anchor + generated_policy, "generated_policy")
    applied.append("generated_policy")

    tree_anchor = "function treeFingerprint(root) {\n"
    helpers = """function fileIdentity(relativePath) {
  const absolute = join(sourceRoot, ...relativePath.split('/'));
  if (!existsSync(absolute)) return { path: relativePath, exists: false, byteLength: null, sha256: null };
  return { path: relativePath, exists: true, byteLength: statSync(absolute).size, sha256: sha256File(absolute) };
}
function assertFileIdentity(actual, expectedByteLength, expectedSha256, stage) {
  if (!actual.exists || actual.byteLength !== expectedByteLength || actual.sha256 !== expectedSha256) {
    throw new Error(`Controlled generated-file identity mismatch at ${stage}: ${JSON.stringify(actual)} expectedByteLength=${expectedByteLength} expectedSha256=${expectedSha256}`);
  }
}
function controlledMutationAdjudication(identity) {
  const mismatch = identity.mismatches[0] ?? null;
  const expectedProjection = manifest.projection;
  const pass = (
    identity.fileCount === expectedProjection.fileCount
    && identity.payloadBytes === controlledGeneratedFile.generatedProjectionPayloadBytes
    && identity.pathSetSha256 === expectedProjection.pathSetSha256
    && identity.sourceContentAggregateSha256 === controlledGeneratedFile.generatedProjectionAggregateSha256
    && identity.missing.length === 0
    && identity.unexpected.length === 0
    && identity.mismatches.length === 1
    && mismatch?.path === controlledGeneratedFile.path
    && mismatch?.expectedByteLength === controlledGeneratedFile.sourceByteLength
    && mismatch?.actualByteLength === controlledGeneratedFile.generatedByteLength
    && mismatch?.expectedSha256 === controlledGeneratedFile.sourceSha256
    && mismatch?.actualSha256 === controlledGeneratedFile.generatedSha256
  );
  return { pass, mismatch, policy: controlledGeneratedFile };
}

"""
    source = replace_once(source, tree_anchor, helpers + tree_anchor, "controlled_mutation_helpers")
    applied.append("controlled_mutation_helpers")

    source = replace_once(
        source,
        "schemaVersion: 'velmere.p47.exact-windows-build-relevant-projection-receipt.v1',",
        "schemaVersion: 'velmere.p60.exact-windows-build-relevant-projection-receipt.v1',",
        "receipt_schema",
    )
    applied.append("receipt_schema")
    source = replace_once(
        source,
        "classification: 'CURRENT_SOURCE_EXACT_BUILD_RELEVANT_PROJECTION_NOT_FULL_SOURCE',",
        "classification: 'CURRENT_SOURCE_EXACT_BUILD_RELEVANT_PROJECTION_WITH_CONTROLLED_NEXT_ENV_RECONCILIATION_NOT_FULL_SOURCE',\n  repairCheckpoint: 'P60',",
        "receipt_classification",
    )
    applied.append("receipt_classification")
    source = replace_once(
        source,
        "    turbopackProductionBuild: false,\n    exactProjectionPostBuild: false,",
        "    turbopackProductionBuild: false,\n    controlledNextEnvMutation: false,\n    exactProjectionPostBuild: false,",
        "hard_gate",
    )
    applied.append("hard_gate")

    lock_anchor = """  receipt.lockfileBefore = { sha256: sha256File(join(sourceRoot, 'package-lock.json')), packageJsonSha256: sha256File(join(sourceRoot, 'package.json')) };

  await runStep('npm-ci-ignore-scripts'"""
    lock_replacement = """  receipt.lockfileBefore = { sha256: sha256File(join(sourceRoot, 'package-lock.json')), packageJsonSha256: sha256File(join(sourceRoot, 'package.json')) };
  const controlledGeneratedPath = join(sourceRoot, controlledGeneratedFile.path);
  const controlledSourceBytes = readFileSync(controlledGeneratedPath);
  receipt.controlledGeneratedFile = {
    policy: controlledGeneratedFile,
    sourceBeforeBuild: fileIdentity(controlledGeneratedFile.path),
  };
  assertFileIdentity(receipt.controlledGeneratedFile.sourceBeforeBuild, controlledGeneratedFile.sourceByteLength, controlledGeneratedFile.sourceSha256, 'source-before-build');

  await runStep('npm-ci-ignore-scripts'"""
    source = replace_once(source, lock_anchor, lock_replacement, "capture_source_bytes")
    applied.append("capture_source_bytes")

    webpack_anchor = """  receipt.hardGates.webpackProductionBuild = receipt.webpackOutput.exists && receipt.webpackOutput.files > 0;
  if (!receipt.hardGates.webpackProductionBuild) throw new Error('Webpack build produced no .next output');
  rmSync(join(sourceRoot, '.next'), { recursive: true, force: true });

  await runStep('next-turbopack-production-build'"""
    webpack_replacement = """  receipt.hardGates.webpackProductionBuild = receipt.webpackOutput.exists && receipt.webpackOutput.files > 0;
  if (!receipt.hardGates.webpackProductionBuild) throw new Error('Webpack build produced no .next output');
  receipt.controlledGeneratedFile.afterWebpack = fileIdentity(controlledGeneratedFile.path);
  assertFileIdentity(receipt.controlledGeneratedFile.afterWebpack, controlledGeneratedFile.generatedByteLength, controlledGeneratedFile.generatedSha256, 'after-webpack');
  rmSync(join(sourceRoot, '.next'), { recursive: true, force: true });

  await runStep('next-turbopack-production-build'"""
    source = replace_once(source, webpack_anchor, webpack_replacement, "webpack_generated_identity")
    applied.append("webpack_generated_identity")

    final_anchor = """  receipt.hardGates.turbopackProductionBuild = receipt.turbopackOutput.exists && receipt.turbopackOutput.files > 0;
  if (!receipt.hardGates.turbopackProductionBuild) throw new Error('Turbopack build produced no .next output');

  receipt.projectionPostBuild = projectionIdentity();
  receipt.hardGates.exactProjectionPostBuild = receipt.projectionPostBuild.pass;
  receipt.lockfileAfter = { sha256: sha256File(join(sourceRoot, 'package-lock.json')), packageJsonSha256: sha256File(join(sourceRoot, 'package.json')) };
  receipt.lockfileUnchanged = receipt.lockfileBefore.sha256 === receipt.lockfileAfter.sha256 && receipt.lockfileBefore.packageJsonSha256 === receipt.lockfileAfter.packageJsonSha256;
  if (!receipt.hardGates.exactProjectionPostBuild || !receipt.lockfileUnchanged) throw new Error('Projection or lockfile changed during native-Windows execution');

  receipt.decision = 'PASS_NATIVE_WINDOWS_EXACT_BUILD_RELEVANT_PROJECTION_SEMANTIC_LINT_DUAL_BUILD';
"""
    final_replacement = """  receipt.hardGates.turbopackProductionBuild = receipt.turbopackOutput.exists && receipt.turbopackOutput.files > 0;
  if (!receipt.hardGates.turbopackProductionBuild) throw new Error('Turbopack build produced no .next output');
  receipt.controlledGeneratedFile.afterTurbopack = fileIdentity(controlledGeneratedFile.path);
  assertFileIdentity(receipt.controlledGeneratedFile.afterTurbopack, controlledGeneratedFile.generatedByteLength, controlledGeneratedFile.generatedSha256, 'after-turbopack');

  receipt.projectionPostBuildBeforeRestore = projectionIdentity();
  receipt.controlledGeneratedFile.mutationAdjudication = controlledMutationAdjudication(receipt.projectionPostBuildBeforeRestore);
  receipt.hardGates.controlledNextEnvMutation = receipt.controlledGeneratedFile.mutationAdjudication.pass;
  if (!receipt.hardGates.controlledNextEnvMutation) throw new Error('Post-build source mutation was not limited to the exact deterministic next-env.d.ts rewrite');

  writeFileSync(controlledGeneratedPath, controlledSourceBytes);
  receipt.controlledGeneratedFile.afterRestore = fileIdentity(controlledGeneratedFile.path);
  assertFileIdentity(receipt.controlledGeneratedFile.afterRestore, controlledGeneratedFile.sourceByteLength, controlledGeneratedFile.sourceSha256, 'after-source-restore');

  receipt.projectionPostBuild = projectionIdentity();
  receipt.hardGates.exactProjectionPostBuild = receipt.projectionPostBuild.pass;
  receipt.lockfileAfter = { sha256: sha256File(join(sourceRoot, 'package-lock.json')), packageJsonSha256: sha256File(join(sourceRoot, 'package.json')) };
  receipt.lockfileUnchanged = receipt.lockfileBefore.sha256 === receipt.lockfileAfter.sha256 && receipt.lockfileBefore.packageJsonSha256 === receipt.lockfileAfter.packageJsonSha256;
  if (!receipt.hardGates.exactProjectionPostBuild || !receipt.lockfileUnchanged) throw new Error('Exact P46 projection or lockfile identity was not restored after native-Windows execution');

  receipt.decision = 'PASS_NATIVE_WINDOWS_EXACT_BUILD_RELEVANT_PROJECTION_SEMANTIC_LINT_DUAL_BUILD_WITH_CONTROLLED_NEXT_ENV_RECONCILIATION';
"""
    source = replace_once(source, final_anchor, final_replacement, "post_build_reconciliation")
    applied.append("post_build_reconciliation")
    return source, applied


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    receipt_path = Path(args.receipt).resolve()
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt: dict[str, Any] = {
        "schemaVersion": "velmere.p60.reconciled-runner-build-receipt.v1",
        "status": "IN_PROGRESS",
        "input": {"path": str(input_path), "expectedByteLength": INPUT_BYTES, "expectedSha256": INPUT_SHA256},
        "output": {"path": str(output_path), "expectedByteLength": OUTPUT_BYTES, "expectedSha256": OUTPUT_SHA256},
        "truthBoundary": "This deterministic patch repairs only post-build adjudication of the exact Next.js-generated next-env.d.ts mutation. It does not alter the 1597-file projection payload or grant Browser/PDF/customer/value/rights/sale credit.",
    }
    try:
        source_bytes = input_path.read_bytes()
        observed_input = {"byteLength": len(source_bytes), "sha256": sha256_bytes(source_bytes)}
        receipt["input"]["observed"] = observed_input
        if observed_input != {"byteLength": INPUT_BYTES, "sha256": INPUT_SHA256}:
            raise RuntimeError(f"input_runner_identity_mismatch:{observed_input}")
        source = source_bytes.decode("utf-8")
        output, applied = build(source)
        output_bytes = output.encode("utf-8")
        observed_output = {"byteLength": len(output_bytes), "sha256": sha256_bytes(output_bytes)}
        receipt["output"]["observed"] = observed_output
        receipt["appliedRepairs"] = applied
        if observed_output != {"byteLength": OUTPUT_BYTES, "sha256": OUTPUT_SHA256}:
            raise RuntimeError(f"output_runner_identity_mismatch:{observed_output}")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(output_bytes)
        receipt["status"] = "PASS"
        receipt["decision"] = "PASS_EXACT_P60_RECONCILED_RUNNER_GENERATED"
        receipt["integritySha256"] = stable_sha(receipt)
        receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
        print(json.dumps(receipt, ensure_ascii=False, indent=2))
        return 0
    except Exception as error:
        receipt["status"] = "FAIL"
        receipt["decision"] = "FAIL_CLOSED_P60_RECONCILED_RUNNER_GENERATION"
        receipt["error"] = f"{type(error).__name__}: {error}"
        receipt["integritySha256"] = stable_sha(receipt)
        receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
        print(json.dumps(receipt, ensure_ascii=False, indent=2))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
