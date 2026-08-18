from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PARENT = {
    "fileCount": 1602,
    "payloadBytes": 21065534,
    "pathSetSha256": "214c0ad793a36a61c5290baeb104d2e671387df5c07e42862143861aa13ef66f",
    "sourceContentAggregateSha256": "280fa6aa59b39e52c695951664664d525d12ab46124becd8c1ac1ff3539d6432",
}

PREIMAGE = {
    "path": "lib/security/erc2771-multicall-source-detector.ts",
    "bytes": 22188,
    "sha256": "98f2dc5e278d55f2c32de44be1e665b5350213b97663de3f8dbe2c5dcfcc2728",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def identity(rows: list[dict]) -> dict[str, object]:
    ordered = sorted(rows, key=lambda row: row["path"])
    path_set = hashlib.sha256("\n".join(row["path"] for row in ordered).encode()).hexdigest()
    aggregate = hashlib.sha256()
    for row in ordered:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode())
    return {
        "fileCount": len(ordered),
        "payloadBytes": sum(int(row["byteLength"]) for row in ordered),
        "pathSetSha256": path_set,
        "sourceContentAggregateSha256": aggregate.hexdigest(),
    }


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"P78R5 replacement anchor mismatch:{label}:{count}")
    return text.replace(old, new, 1)


AUTH_HELPERS = r'''type Erc2771ContextAuthenticity = {
  state: "verified_openzeppelin_import" | "verified_source_semantics" | "unverified_name_only" | "not_present";
  evidenceUnitIds: string[];
};

function stripSolidityComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n\r]*/g, " ");
}

function hasOpenZeppelinErc2771Import(source: string) {
  const withoutComments = stripSolidityComments(source);
  return /(?:^|[\r\n])\s*import\s+(?:\{[^}\r\n]*\bERC2771Context\b[^}\r\n]*\}\s+from\s+)?["']@openzeppelin\/contracts\/metatx\/ERC2771Context\.sol["']\s*;/m.test(withoutComments);
}

function erc2771ContextAuthenticity(
  closure: ReturnType<typeof inheritanceClosure>,
  units: SourceUnit[],
  correlation: ContractCorrelation,
): Erc2771ContextAuthenticity {
  const contextNamed = closure.inheritedNames.has("ERC2771Context") || closure.nodes.some((node) => node.name === "ERC2771Context");
  if (!contextNamed) return { state: "not_present", evidenceUnitIds: [] };

  const correlatedIds = new Set(correlation.sourceUnitIds);
  const importUnits = units
    .filter((unit) => correlatedIds.has(unit.id) && hasOpenZeppelinErc2771Import(unit.content))
    .map((unit) => unit.id);
  if (importUnits.length > 0) {
    return { state: "verified_openzeppelin_import", evidenceUnitIds: Array.from(new Set(importUnits)).slice(0, 8) };
  }

  const semanticNodes = closure.nodes.filter((node) => node.name === "ERC2771Context" && (
    /\bisTrustedForwarder\s*\(\s*msg\s*\.\s*sender\s*\)/.test(node.text)
    && (
      (/\bcalldataload\s*\(/.test(node.text) && /\bcalldatasize\s*\(/.test(node.text))
      || (/\b_contextSuffixLength\s*\(/.test(node.text) && /\bmsg\s*\.\s*data\b/.test(node.text))
    )
  ));
  if (semanticNodes.length === 1) {
    return { state: "verified_source_semantics", evidenceUnitIds: Array.from(new Set(semanticNodes.map((node) => node.unitId))).slice(0, 8) };
  }

  return {
    state: "unverified_name_only",
    evidenceUnitIds: Array.from(new Set(closure.nodes.filter((node) => node.name === "ERC2771Context").map((node) => node.unitId))).slice(0, 8),
  };
}
'''


def patch_detector(text: str) -> str:
    text = replace_once(
        text,
        '  correlation: {\n    targetSelection: "etherscan_contract_name" | "single_concrete_contract" | "ambiguous_or_missing";\n    targetContractName?: string;\n    analyzedContractNames: string[];\n    sourceUnitIds: string[];\n  };\n  signals: {',
        '  correlation: {\n    targetSelection: "etherscan_contract_name" | "single_concrete_contract" | "ambiguous_or_missing";\n    targetContractName?: string;\n    analyzedContractNames: string[];\n    sourceUnitIds: string[];\n  };\n  contextAuthenticity: {\n    state: "verified_openzeppelin_import" | "verified_source_semantics" | "unverified_name_only" | "not_present";\n    evidenceUnitIds: string[];\n  };\n  signals: {',
        "report_context_authenticity",
    )

    text = replace_once(
        text,
        'function evidenceRefs(units: SourceUnit[], responseDigest: string, sourceDigest: string, signals: Pass5002Erc2771MulticallSourceDetectorReport["signals"]) {',
        AUTH_HELPERS + '\n\nfunction evidenceRefs(units: SourceUnit[], responseDigest: string, sourceDigest: string, signals: Pass5002Erc2771MulticallSourceDetectorReport["signals"]) {',
        "context_authenticity_helpers",
    )

    text = replace_once(
        text,
        '  correlation?: ContractCorrelation;\n  signals?: Pass5002Erc2771MulticallSourceDetectorReport["signals"];',
        '  correlation?: ContractCorrelation;\n  contextAuthenticity?: Erc2771ContextAuthenticity;\n  signals?: Pass5002Erc2771MulticallSourceDetectorReport["signals"];',
        "base_report_auth_arg",
    )
    text = replace_once(
        text,
        '    correlation: args.correlation ?? { targetSelection: "ambiguous_or_missing", analyzedContractNames: [], sourceUnitIds: [] },\n    signals: args.signals ?? ZERO_SIGNALS,',
        '    correlation: args.correlation ?? { targetSelection: "ambiguous_or_missing", analyzedContractNames: [], sourceUnitIds: [] },\n    contextAuthenticity: args.contextAuthenticity ?? { state: "not_present", evidenceUnitIds: [] },\n    signals: args.signals ?? ZERO_SIGNALS,',
        "base_report_auth_value",
    )

    old_meta = '''  const clean = closure.nodes.map((node) => node.text).join("\\n");
  const metaContext = (closure.inheritedNames.has("ERC2771Context") || closure.nodes.some((node) => node.name === "ERC2771Context"))
    && /\\b_msgSender\\s*\\(\\s*\\)/.test(clean);'''
    new_meta = '''  const clean = closure.nodes.map((node) => node.text).join("\\n");
  const contextAuthenticity = erc2771ContextAuthenticity(closure, units, correlation);
  const authenticErc2771Context = contextAuthenticity.state === "verified_openzeppelin_import" || contextAuthenticity.state === "verified_source_semantics";
  const metaContext = authenticErc2771Context && /\\b_msgSender\\s*\\(\\s*\\)/.test(clean);'''
    text = replace_once(text, old_meta, new_meta, "authenticated_meta_context")

    old_state = '''  const vulnerablePattern = metaContext && selfDelegatecall && batchedUserCalldata && authUsesLogicalSender && !preservation;
  const mitigatedPattern = metaContext && selfDelegatecall && batchedUserCalldata && preservation;
  const state: Pass5002SourcePatternState = vulnerablePattern ? "confirmed_source_pattern" : mitigatedPattern ? "mitigated_source_pattern" : "not_detected";'''
    new_state = '''  const vulnerablePattern = metaContext && selfDelegatecall && batchedUserCalldata && authUsesLogicalSender && !preservation;
  const mitigatedPattern = metaContext && selfDelegatecall && batchedUserCalldata && preservation;
  const authenticityBlocked = contextAuthenticity.state === "unverified_name_only";
  const state: Pass5002SourcePatternState = authenticityBlocked
    ? "blocked"
    : vulnerablePattern
      ? "confirmed_source_pattern"
      : mitigatedPattern
        ? "mitigated_source_pattern"
        : "not_detected";'''
    text = replace_once(text, old_state, new_state, "fail_closed_unverified_context")

    text = replace_once(
        text,
        '      sourceUnitCount: units.length, correlation, signals, confidence: 92, severityCandidate: "elevated",',
        '      sourceUnitCount: units.length, correlation, contextAuthenticity, signals, confidence: 92, severityCandidate: "elevated",',
        "vulnerable_auth_output",
    )
    text = replace_once(
        text,
        '    sourceUnitCount: units.length, correlation, signals, confidence: mitigatedPattern ? 88 : 70,',
        '    sourceUnitCount: units.length, correlation, contextAuthenticity, signals, confidence: mitigatedPattern ? 88 : authenticityBlocked ? 35 : 70,',
        "nonvulnerable_auth_output",
    )

    old_customer = '''    customerLine: mitigatedPattern
      ? t(locale, "Wzorzec multicall/meta-tx zawiera sender-preservation; ten detector nie zgłasza findingu.", "Multicall/Meta-Tx-Muster enthaelt Sender Preservation; dieser Detektor meldet kein Finding.", "The multicall/meta-transaction pattern includes sender preservation; this detector raises no finding.")
      : t(locale, "Detektor nie potwierdził wzorca ERC-2771/Multicall sender spoofing w zweryfikowanym source.", "Detektor hat das ERC-2771/Multicall-Sender-Spoofing-Muster im verifizierten Source nicht bestaetigt.", "The detector did not confirm the ERC-2771/Multicall sender-spoofing pattern in verified source."),'''
    new_customer = '''    customerLine: authenticityBlocked
      ? t(locale, "Source używa nazwy ERC2771Context, ale semantyka trusted-forwardera nie została zweryfikowana; detector fail-closed nie zgłasza findingu.", "Source verwendet den Namen ERC2771Context, aber die Trusted-Forwarder-Semantik ist nicht verifiziert; der Detector bleibt fail-closed und meldet kein Finding.", "Source uses the ERC2771Context name, but trusted-forwarder semantics are not verified; the detector fails closed and asserts no finding.")
      : mitigatedPattern
        ? t(locale, "Wzorzec multicall/meta-tx zawiera sender-preservation; ten detector nie zgłasza findingu.", "Multicall/Meta-Tx-Muster enthaelt Sender Preservation; dieser Detektor meldet kein Finding.", "The multicall/meta-transaction pattern includes sender preservation; this detector raises no finding.")
        : t(locale, "Detektor nie potwierdził wzorca ERC-2771/Multicall sender spoofing w zweryfikowanym source.", "Detektor hat das ERC-2771/Multicall-Sender-Spoofing-Muster im verifizierten Source nicht bestaetigt.", "The detector did not confirm the ERC-2771/Multicall sender-spoofing pattern in verified source."),'''
    text = replace_once(text, old_customer, new_customer, "authenticity_customer_boundary")

    old_action = '''    advancedAction: t(locale, "Brak findingu; zachować kontrolę przy kolejnych zmianach source.", "Kein Finding; Kontrolle bei spaeteren Source-Aenderungen beibehalten.", "No finding; retain the control for future source changes."),
    evidenceRefs: refs,
  });'''
    new_action = '''    advancedAction: authenticityBlocked
      ? t(locale, "Zweryfikować implementację trusted-forwardera/context sender i uruchomić detector ponownie.", "Trusted-Forwarder-/Context-Sender-Implementierung verifizieren und Detector erneut ausfuehren.", "Verify the trusted-forwarder/context-sender implementation and rerun the detector.")
      : t(locale, "Brak findingu; zachować kontrolę przy kolejnych zmianach source.", "Kein Finding; Kontrolle bei spaeteren Source-Aenderungen beibehalten.", "No finding; retain the control for future source changes."),
    evidenceRefs: refs,
    blockers: authenticityBlocked ? ["erc2771_context_authenticity_not_verified"] : [],
  });'''
    text = replace_once(text, old_action, new_action, "authenticity_blocker")
    return text


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", required=True)
    ap.add_argument("--parent-manifest", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--receipt", required=True)
    args = ap.parse_args()

    root = Path(args.source_root)
    parent = json.loads(Path(args.parent_manifest).read_text(encoding="utf-8"))
    for key, expected in PARENT.items():
        observed = parent["projection"].get(key)
        if observed != expected:
            raise SystemExit(f"P78R5 parent projection mismatch:{key}:{observed}:{expected}")

    rel = PREIMAGE["path"]
    path = root / rel
    before = path.read_bytes()
    before_sha = sha256(before)
    if len(before) != PREIMAGE["bytes"] or before_sha != PREIMAGE["sha256"]:
        raise SystemExit(f"P78R5 preimage mismatch:{len(before)}/{PREIMAGE['bytes']}:{before_sha}/{PREIMAGE['sha256']}")
    after = patch_detector(before.decode("utf-8")).encode("utf-8")
    if after == before:
        raise SystemExit("P78R5 no-op detector patch")
    after_sha = sha256(after)
    path.write_bytes(after)

    rowmap = {row["path"]: dict(row) for row in parent["files"]}
    rowmap[rel]["byteLength"] = len(after)
    rowmap[rel]["sha256"] = after_sha
    rows = sorted(rowmap.values(), key=lambda row: row["path"])
    projection = identity(rows)
    if projection["fileCount"] != PARENT["fileCount"] or projection["pathSetSha256"] != PARENT["pathSetSha256"]:
        raise SystemExit(f"P78R5 unexpected path identity change:{projection}")

    manifest = dict(parent)
    manifest["schemaVersion"] = "velmere.p78r5.build-relevant-projection.v1"
    manifest["classification"] = "CURRENT_PRODUCT_PROJECTION_P78R5_VERIFIED_ERC2771_CONTEXT_AUTHENTICITY"
    manifest["projection"] = dict(parent["projection"])
    manifest["projection"].update(projection)
    manifest["projection"]["purpose"] = "Require verified ERC-2771 trusted-forwarder authenticity before the ERC2771+Multicall source-pattern detector can assert a finding; class-name-only contexts fail closed."
    manifest["projection"]["excludedFromCredit"] = ["runtime exploitability proof", "deployed bytecode equivalence", "formal detector accuracy", "Customer FINAL", "Audit FINAL PDF", "rights expansion", "paid value", "sale eligibility", "LIVE", "world-class proof"]
    manifest["files"] = rows
    manifest["p78r5Delta"] = {
        "parent": "P78R4/V17",
        "changedBuildRelevantFiles": [{"path": rel, "beforeBytes": len(before), "beforeSha256": before_sha, "afterBytes": len(after), "afterSha256": after_sha}],
        "measuredParentFalsePositive": "custom class named ERC2771Context without trusted-forwarder semantics",
        "authenticityModes": ["verified_openzeppelin_import", "verified_source_semantics"],
        "unverifiedNameOnly": "FAIL_CLOSED_BLOCKED",
        "riskFloorPromotion": False,
        "runtimeExploitabilityPromotion": False,
        "customerFinalOutputCredit": 0,
        "auditFinalPdfCredit": 0,
        "rightsCredit": 0,
        "paidValueCredit": 0,
        "saleCredit": 0,
        "live": False,
    }
    Path(args.manifest).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    receipt = {
        "schemaVersion": "velmere.p78r5.erc2771-context-authenticity-source-patch.v1",
        "status": "PASS",
        "parentProjection": PARENT,
        "projection": projection,
        "changedFiles": manifest["p78r5Delta"]["changedBuildRelevantFiles"],
        "rootCause": "P78R4 treated the ERC2771Context class name as sufficient meta-transaction evidence, so a custom class with plain msg.sender semantics could compose a false positive.",
        "repair": [
            "recognize exact OpenZeppelin metatx/ERC2771Context.sol import only from comment-stripped Solidity import statements in correlated units",
            "otherwise require source-visible isTrustedForwarder(msg.sender) plus sender-suffix extraction semantics in the inherited ERC2771Context body",
            "treat class-name-only context as blocked/fail-closed and expose an authenticity blocker instead of a vulnerability finding",
            "preserve exact target/inheritance correlation and source-unit evidence scoping from P78R4",
        ],
        "zeroFakeCredit": {"runtimeExploitability": 0, "deployedBytecodeEquivalence": 0, "formalDetectorAccuracy": "WITHHELD", "customerFinal": "0/20", "auditFinalPdf": "0/3", "rights": "2/203", "paidValue": "0/10", "saleEligible": "0/20", "live": False},
        "truthBoundary": "P78R5 is a source-authenticity precision repair. It can remove class-name false positives but does not prove population accuracy, deployed equivalence, runtime exploitability or customer/commercial release readiness.",
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
