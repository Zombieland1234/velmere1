from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PARENT = {
    "fileCount": 1602,
    "payloadBytes": 21069277,
    "pathSetSha256": "214c0ad793a36a61c5290baeb104d2e671387df5c07e42862143861aa13ef66f",
    "sourceContentAggregateSha256": "530e81064adafe6b8c2f3a7d31f485c85b0e5f7977c371369b721e88a8558cfe",
}
PREIMAGE = {
    "path": "lib/security/erc2771-multicall-source-detector.ts",
    "bytes": 25931,
    "sha256": "26eeaa3b3a4a73096f4da3986182aeb910c432f1f883f90094664d2f93fdc908",
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
        raise SystemExit(f"P78R6 replacement anchor mismatch:{label}:{count}")
    return text.replace(old, new, 1)


OLD_IMPORT_AUTH = r'''function hasOpenZeppelinErc2771Import(source: string) {
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
}'''

NEW_IMPORT_AUTH = r'''type Erc2771ImportBinding = {
  unitId: string;
  localSymbol: string;
  form: "plain" | "selective" | "namespace" | "legacy_namespace";
};

const OPENZEPPELIN_ERC2771_IMPORT_PATH = "@openzeppelin/contracts/metatx/ERC2771Context.sol" as const;

function parseOpenZeppelinErc2771ImportBindings(unit: SourceUnit): Erc2771ImportBinding[] {
  const withoutComments = stripSolidityComments(unit.content);
  const statements = withoutComments.matchAll(/(?:^|[\r\n])\s*import\s+([\s\S]*?)\s*;/gm);
  const bindings: Erc2771ImportBinding[] = [];
  const quotedPath = `["']${OPENZEPPELIN_ERC2771_IMPORT_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`;
  for (const statement of statements) {
    const body = statement[1].trim();
    const plain = body.match(new RegExp(`^${quotedPath}$`));
    if (plain) {
      bindings.push({ unitId: unit.id, localSymbol: "ERC2771Context", form: "plain" });
      continue;
    }
    const selective = body.match(new RegExp(`^\\{([\\s\\S]*?)\\}\\s+from\\s+${quotedPath}$`));
    if (selective) {
      for (const entry of selective[1].split(",")) {
        const match = entry.trim().match(/^ERC2771Context(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/);
        if (!match) continue;
        bindings.push({ unitId: unit.id, localSymbol: match[1] ?? "ERC2771Context", form: "selective" });
      }
      continue;
    }
    const namespace = body.match(new RegExp(`^\\*\\s+as\\s+([A-Za-z_][A-Za-z0-9_]*)\\s+from\\s+${quotedPath}$`));
    if (namespace) {
      bindings.push({ unitId: unit.id, localSymbol: `${namespace[1]}.ERC2771Context`, form: "namespace" });
      continue;
    }
    const legacyNamespace = body.match(new RegExp(`^${quotedPath}\\s+as\\s+([A-Za-z_][A-Za-z0-9_]*)$`));
    if (legacyNamespace) {
      bindings.push({ unitId: unit.id, localSymbol: `${legacyNamespace[1]}.ERC2771Context`, form: "legacy_namespace" });
    }
  }
  return bindings.slice(0, 16);
}

function boundOpenZeppelinErc2771Imports(
  closure: ReturnType<typeof inheritanceClosure>,
  units: SourceUnit[],
  correlation: ContractCorrelation,
) {
  const correlatedIds = new Set(correlation.sourceUnitIds);
  const bindings = units
    .filter((unit) => correlatedIds.has(unit.id))
    .flatMap((unit) => parseOpenZeppelinErc2771ImportBindings(unit));
  return bindings.filter((binding) => closure.nodes.some((node) =>
    node.unitId === binding.unitId && node.bases.includes(binding.localSymbol)
  ));
}

function erc2771ContextAuthenticity(
  closure: ReturnType<typeof inheritanceClosure>,
  units: SourceUnit[],
  correlation: ContractCorrelation,
): Erc2771ContextAuthenticity {
  const boundImports = boundOpenZeppelinErc2771Imports(closure, units, correlation);
  if (boundImports.length > 0) {
    return {
      state: "verified_openzeppelin_import",
      evidenceUnitIds: Array.from(new Set(boundImports.map((binding) => binding.unitId))).slice(0, 8),
    };
  }

  const contextNamed = closure.inheritedNames.has("ERC2771Context") || closure.nodes.some((node) => node.name === "ERC2771Context");
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

  if (!contextNamed) return { state: "not_present", evidenceUnitIds: [] };
  return {
    state: "unverified_name_only",
    evidenceUnitIds: Array.from(new Set(closure.nodes.filter((node) => node.name === "ERC2771Context").map((node) => node.unitId))).slice(0, 8),
  };
}'''


def patch_detector(text: str) -> str:
    text = replace_once(text, OLD_IMPORT_AUTH, NEW_IMPORT_AUTH, "symbol_bound_import_authenticator")
    text = replace_once(
        text,
        '    const match = entry.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)/);\n    return match ? [match[1]] : [];',
        '    const match = entry.trim().match(/^([A-Za-z_][A-Za-z0-9_]*(?:\\.[A-Za-z_][A-Za-z0-9_]*)?)/);\n    return match ? [match[1]] : [];',
        "qualified_base_name_support",
    )
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
            raise SystemExit(f"P78R6 parent projection mismatch:{key}:{observed}:{expected}")

    rel = PREIMAGE["path"]
    target = root / rel
    before = target.read_bytes()
    before_sha = sha256(before)
    if len(before) != PREIMAGE["bytes"] or before_sha != PREIMAGE["sha256"]:
        raise SystemExit(f"P78R6 preimage mismatch:{len(before)}/{PREIMAGE['bytes']}:{before_sha}/{PREIMAGE['sha256']}")
    after = patch_detector(before.decode("utf-8")).encode("utf-8")
    if after == before:
        raise SystemExit("P78R6 no-op detector patch")
    after_sha = sha256(after)
    target.write_bytes(after)

    rowmap = {row["path"]: dict(row) for row in parent["files"]}
    rowmap[rel]["byteLength"] = len(after)
    rowmap[rel]["sha256"] = after_sha
    rows = sorted(rowmap.values(), key=lambda row: row["path"])
    projection = identity(rows)
    if projection["fileCount"] != PARENT["fileCount"] or projection["pathSetSha256"] != PARENT["pathSetSha256"]:
        raise SystemExit(f"P78R6 unexpected path identity change:{projection}")

    manifest = dict(parent)
    manifest["schemaVersion"] = "velmere.p78r6.build-relevant-projection.v1"
    manifest["classification"] = "CURRENT_PRODUCT_PROJECTION_P78R6_SYMBOL_BOUND_ERC2771_IMPORT_AUTHENTICITY"
    manifest["projection"] = dict(parent["projection"])
    manifest["projection"].update(projection)
    manifest["projection"]["purpose"] = "Bind OpenZeppelin ERC2771Context authenticity to the exact local import symbol actually used by a target-inheritance edge in the same correlated source unit; unused/aliased decoy imports cannot authenticate another local context."
    manifest["projection"]["excludedFromCredit"] = ["runtime exploitability proof", "deployed bytecode equivalence", "formal detector accuracy", "Customer FINAL", "Audit FINAL PDF", "rights expansion", "paid value", "sale eligibility", "LIVE", "world-class proof"]
    manifest["files"] = rows
    manifest["p78r6Delta"] = {
        "parent": "P78R5/V17",
        "changedBuildRelevantFiles": [{"path": rel, "beforeBytes": len(before), "beforeSha256": before_sha, "afterBytes": len(after), "afterSha256": after_sha}],
        "measuredParentFalsePositive": "real OZ ERC2771Context imported under decoy alias while target inherits unrelated local ERC2771Context",
        "importBindingForms": ["plain", "selective", "namespace", "legacy_namespace"],
        "requiredBinding": "same_source_unit_and_exact_inherited_local_symbol",
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
        "schemaVersion": "velmere.p78r6.oz-import-symbol-binding-source-patch.v1",
        "status": "PASS",
        "parentProjection": PARENT,
        "projection": projection,
        "changedFiles": manifest["p78r6Delta"]["changedBuildRelevantFiles"],
        "rootCause": "P78R5 authenticated any correlated exact-path OpenZeppelin ERC2771Context import, without proving that the imported local symbol was the symbol actually inherited by the target closure.",
        "repair": [
            "parse exact-path plain/selective/namespace Solidity imports after comment stripping",
            "derive the local symbol produced by each import, including aliases and qualified namespace symbols",
            "credit import authenticity only when a closure node in the same source unit directly inherits that exact local symbol",
            "support qualified inheritance base names without pretending imported source bodies exist",
            "preserve source-semantic authenticity as an independent fallback and retain all R4/R5 fail-closed boundaries",
        ],
        "zeroFakeCredit": {"runtimeExploitability": 0, "deployedBytecodeEquivalence": 0, "formalDetectorAccuracy": "WITHHELD", "customerFinal": "0/20", "auditFinalPdf": "0/3", "rights": "2/203", "paidValue": "0/10", "saleEligible": "0/20", "live": False},
        "truthBoundary": "P78R6 is a source-symbol-binding precision repair. It removes a measured import-decoy false positive but does not prove population accuracy, deployed equivalence, runtime exploitability or release readiness.",
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
