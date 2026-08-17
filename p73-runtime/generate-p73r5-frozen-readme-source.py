from __future__ import annotations

import hashlib
import json
from pathlib import Path

INPUT = Path("p73-runtime/p73r4-new-audit-adjudicated-authority-evidence.ts")
OUTPUT = Path("p73-runtime/p73r5-authority-evidence-source.ts")
RECEIPT = Path("p73-runtime/P73R5_SOURCE_GENERATION_RECEIPT.json")
INPUT_BYTES = 19749
INPUT_SHA256 = "0d9ad2b771ad4d19c61853ed5d5562f54c2549b07493690f28edc5383aff6521"
FROZEN_COMMIT = "b667d67ecfa5361a81e8f110234ce242613b0012"
FROZEN_URL = f"https://raw.githubusercontent.com/mds1/multicall3/{FROZEN_COMMIT}/README.md"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def replace_once(source: str, old: str, new: str, label: str, applied: list[str]) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"anchor_count_mismatch:{label}:{count}")
    applied.append(label)
    return source.replace(old, new, 1)


def main() -> int:
    source = INPUT.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
    source_bytes = source.encode("utf-8")
    if len(source_bytes) != INPUT_BYTES or sha256(source_bytes) != INPUT_SHA256:
        raise RuntimeError(f"input_identity_mismatch:{len(source_bytes)}:{sha256(source_bytes)}")

    applied: list[str] = []
    source = replace_once(
        source,
        '    maintainerAuthorityUrl: "https://api.github.com/repos/mds1/multicall3/issues/comments/2495504312",',
        f'    maintainerAuthorityUrl: "{FROZEN_URL}",',
        "canonical_reference_frozen_readme_url",
        applied,
    )

    source = replace_once(
        source,
        '''function sourceRepoFromGithubApiUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "api.github.com") return null;
  const match = parsed.pathname.match(/^\\/repos\\/([^/]+)\\/([^/]+)\\/issues\\/comments\\/\\d+$/);
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null;
}''',
        '''function frozenRepositoryAuthorityUrlMatches(value: string, reference: CanonicalReference) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "raw.githubusercontent.com") return false;
    const expectedPath = `/${reference.sourceRepo}/${reference.sourceCommit}/README.md`.toLowerCase();
    return parsed.pathname.toLowerCase() === expectedPath && parsed.search === "" && parsed.hash === "";
  } catch {
    return false;
  }
}''',
        "frozen_repository_url_validator",
        applied,
    )

    source = replace_once(
        source,
        '''  const docsUrl = clean(input.docsUrl, 700) || authority.defaultContractsUrl;
  const maintainerUrl = clean(input.maintainerUrl, 700) || reference.maintainerAuthorityUrl;
  try {
    if (hostOf(docsUrl) !== authority.officialDocsHost) throw new Error("official_chain_docs_host_mismatch");
    if (sourceRepoFromGithubApiUrl(maintainerUrl) !== reference.sourceRepo.toLowerCase()) throw new Error("project_maintainer_repository_mismatch");

    const [docs, maintainer] = await Promise.all([
      fetchAuthority(docsUrl, "audit_authority_chain_docs", [authority.officialDocsHost]),
      fetchAuthority(maintainerUrl, "audit_authority_project_maintainer", ["api.github.com"]),
    ]);''',
        '''  const docsUrl = clean(input.docsUrl, 700) || authority.defaultContractsUrl;
  // Recognized canonical references use an immutable registry-bound project authority.
  // Caller input cannot replace this root with a mutable issue, branch, redirect or fork.
  const maintainerUrl = reference.maintainerAuthorityUrl;
  try {
    if (hostOf(docsUrl) !== authority.officialDocsHost) throw new Error("official_chain_docs_host_mismatch");
    if (!frozenRepositoryAuthorityUrlMatches(maintainerUrl, reference)) throw new Error("project_maintainer_frozen_repository_binding_mismatch");

    const [docs, maintainer] = await Promise.all([
      fetchAuthority(docsUrl, "audit_authority_chain_docs", [authority.officialDocsHost]),
      fetchAuthority(maintainerUrl, "audit_authority_project_maintainer", ["raw.githubusercontent.com"]),
    ]);''',
        "fetch_frozen_readme_instead_of_api_comment",
        applied,
    )

    source = replace_once(
        source,
        '''    let maintainerJson: Record<string, unknown>;
    try { maintainerJson = JSON.parse(maintainer.text) as Record<string, unknown>; }
    catch { throw new Error("maintainer_json_invalid"); }
    const user = maintainerJson.user && typeof maintainerJson.user === "object" && !Array.isArray(maintainerJson.user) ? maintainerJson.user as Record<string, unknown> : {};
    const body = String(maintainerJson.body ?? "");
    const bodyLower = body.toLowerCase();
    const authorAssociation = String(maintainerJson.author_association ?? "").toUpperCase();
    const maintainerBound = authorAssociation === "OWNER"
      && String(user.login ?? "").trim().length > 0
      && bodyLower.includes(reference.projectName.toLowerCase())
      && bodyLower.includes(chain)
      && bodyLower.includes(contractAddress)
      && /compromis(?:ed|e)|different contract|wrong contract/.test(bodyLower)
      && /cannot be deployed|can not be deployed|unable to deploy|regular multicall3/.test(bodyLower);
    if (!maintainerBound) throw new Error("project_maintainer_adverse_statement_not_bound");''',
        '''    const maintainerLower = maintainer.text.toLowerCase();
    const frozenReadmeBound = maintainerLower.includes(reference.projectName.toLowerCase())
      && maintainerLower.includes(chain)
      && maintainerLower.includes(contractAddress)
      && maintainerLower.includes("deployer private key")
      && maintainerLower.includes("compromised")
      && maintainerLower.includes("custom contract being deployed to the multicall3 address on ancient8")
      && maintainerLower.includes("only the ancient8 deployment is known to be incorrect");
    if (!frozenReadmeBound) throw new Error("project_maintainer_frozen_readme_adverse_statement_not_bound");''',
        "frozen_readme_content_binding",
        applied,
    )

    source = replace_once(
        source,
        '''    const sourceTimestamp = typeof maintainerJson.updated_at === "string" && Number.isFinite(Date.parse(maintainerJson.updated_at))
      ? new Date(Date.parse(maintainerJson.updated_at)).toISOString()
      : typeof maintainerJson.created_at === "string" && Number.isFinite(Date.parse(maintainerJson.created_at))
        ? new Date(Date.parse(maintainerJson.created_at)).toISOString()
        : maintainer.sourceTimestamp;
    const maintainerReceipt = receipt({
      id: `authority-project-maintainer-${sha256Digest(maintainer.finalUrl).replace(/^sha256:/, "").slice(0, 20)}`,
      authorityClass: "project_maintainer",
      providerId: `github-owner:${reference.sourceRepo}`,
      providerFamily: "project_maintainer_authority",
      upstreamRoot: "api.github.com",
      independenceEligible: true,
      targetBound: true,
      statusCode: maintainer.statusCode,
      contentType: maintainer.contentType,
      bodyBytes: maintainer.bytes.byteLength,
      bodyDigest: sha256BytesDigest(maintainer.bytes),
      requestUrlDigest: sha256Digest(maintainer.finalUrl),
      observedAt: maintainer.observedAt,
      sourceTimestamp: sourceTimestamp ?? null,
      sourceTimestampProvenance: sourceTimestamp ? "provider" : "transport_received",
      assertions: [
        `repository:${reference.sourceRepo}`,
        `author_association:${authorAssociation}`,
        `project:${reference.projectName}`,
        `chain:${chain}`,
        `wrong_contract_address:${contractAddress}`,
      ],
    });''',
        '''    const sourceTimestamp = maintainer.sourceTimestamp;
    const maintainerReceipt = receipt({
      id: `authority-project-maintainer-${sha256Digest(maintainer.finalUrl).replace(/^sha256:/, "").slice(0, 20)}`,
      authorityClass: "project_maintainer",
      providerId: `repo-commit:${reference.sourceRepo}@${reference.sourceCommit}`,
      providerFamily: "project_maintainer_authority",
      upstreamRoot: "raw.githubusercontent.com",
      independenceEligible: true,
      targetBound: true,
      statusCode: maintainer.statusCode,
      contentType: maintainer.contentType,
      bodyBytes: maintainer.bytes.byteLength,
      bodyDigest: sha256BytesDigest(maintainer.bytes),
      requestUrlDigest: sha256Digest(maintainer.finalUrl),
      observedAt: maintainer.observedAt,
      sourceTimestamp: sourceTimestamp ?? null,
      sourceTimestampProvenance: sourceTimestamp ? "provider" : "transport_received",
      assertions: [
        `repository:${reference.sourceRepo}`,
        `source_commit:${reference.sourceCommit}`,
        `project:${reference.projectName}`,
        `chain:${chain}`,
        `canonical_address:${contractAddress}`,
        "deployment_status:known_incorrect",
      ],
    });''',
        "frozen_readme_receipt_binding",
        applied,
    )

    source = replace_once(
        source,
        '      truthBoundary: "This evidence proves a deployment-identity contradiction, not a source-code vulnerability or exploitability finding. The 90/100 risk floor applies only to the audited deployment identity because using the wrong contract at an expected canonical address is a critical integrity hazard; current runtime bytecode remains explicitly unverified until independent RPC quorum exists.",',
        '      truthBoundary: "This evidence proves a deployment-identity contradiction from two independent authorities: official chain documentation plus the project exact frozen repository commit. It is not a source-code vulnerability or exploitability finding. The 90/100 risk floor applies only to audited deployment identity because using the wrong contract at an expected canonical address is a critical integrity hazard; current runtime bytecode remains explicitly unverified until independent RPC quorum exists.",',
        "authority_truth_boundary",
        applied,
    )

    forbidden = [
        "api.github.com/repos/mds1/multicall3/issues/comments/2495504312",
        "sourceRepoFromGithubApiUrl",
        "maintainerJson",
        "authorAssociation",
        "github-owner:",
    ]
    for token in forbidden:
        if token in source:
            raise RuntimeError(f"forbidden_legacy_runtime_authority:{token}")

    required = [
        FROZEN_URL,
        "frozenRepositoryAuthorityUrlMatches",
        "repo-commit:${reference.sourceRepo}@${reference.sourceCommit}",
        "custom contract being deployed to the multicall3 address on ancient8",
        "only the ancient8 deployment is known to be incorrect",
        "current_runtime_bytecode_quorum_unavailable",
        '["raw.githubusercontent.com"]',
    ]
    for token in required:
        if token not in source:
            raise RuntimeError(f"required_invariant_missing:{token}")

    output_bytes = source.encode("utf-8")
    OUTPUT.write_bytes(output_bytes)
    result = {
        "schemaVersion": "velmere.p73r5.frozen-readme-source-generation.v1",
        "status": "PASS_CONTROL_SOURCE_GENERATION_NO_PRODUCT_CREDIT",
        "inputBytes": len(source_bytes),
        "inputSha256": sha256(source_bytes),
        "outputBytes": len(output_bytes),
        "outputSha256": sha256(output_bytes),
        "replacementLabels": applied,
        "runtimeProjectAuthority": f"raw.githubusercontent.com/mds1/multicall3@{FROZEN_COMMIT}/README.md",
        "authorityRootCountRequired": 2,
        "currentRuntimeBytecodeCredit": 0,
        "vulnerabilityGroundTruthCredit": 0,
        "customerFinalOutputCredit": 0,
        "auditFinalPdfCredit": 0,
        "rightsCredit": 0,
        "paidValueCredit": 0,
        "saleCredit": 0,
        "live": False,
        "truthBoundary": "Generates the P73R5 replacement source only. Runtime project authority is moved from an unstable GitHub API comment endpoint to the exact P70-frozen official repository README. Ancient8 official docs remain the independent second root. No product or release credit.",
    }
    RECEIPT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
