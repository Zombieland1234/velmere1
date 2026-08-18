from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PARENT = {
    "fileCount": 1602,
    "payloadBytes": 21059203,
    "pathSetSha256": "214c0ad793a36a61c5290baeb104d2e671387df5c07e42862143861aa13ef66f",
    "sourceContentAggregateSha256": "6570f1ef462dcc2d84daf30576a84b2acc518d6ec16f6030b7f670280780b79f",
}

PREIMAGE = {
    "lib/security/audit-provider-runtime-client.ts": {"bytes": 41486, "sha256": "4fcea40b07d60cf2f7535e8e0da8779fd5da0f3d8c3b5c137c40087575a7847e"},
    "lib/security/erc2771-multicall-source-detector.ts": {"bytes": 16053, "sha256": "1ddc6c380edc01e73b5d36394c6f659aa9c37711c408607a5b4bfac38397e6be"},
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
        raise SystemExit(f"P78R4 replacement anchor mismatch:{label}:{count}")
    return text.replace(old, new, 1)


def replace_between(text: str, start: str, end: str, replacement: str, label: str) -> str:
    if text.count(start) != 1:
        raise SystemExit(f"P78R4 start anchor mismatch:{label}:{text.count(start)}")
    i = text.index(start)
    j = text.index(end, i)
    return text[:i] + replacement.rstrip() + "\n" + text[j:]


def patch_provider(text: str) -> str:
    text = replace_once(
        text,
        "  responseDigest: string;\n  sourceText?: string;",
        "  responseDigest: string;\n  contractName?: string;\n  sourceText?: string;",
        "provider_private_contract_name_type",
    )
    text = replace_once(
        text,
        "        responseDigest: responseReceipt.bodyDigest,\n        sourceText: sourceCode || undefined,",
        "        responseDigest: responseReceipt.bodyDigest,\n        contractName: typeof first?.ContractName === \"string\" && /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(first.ContractName.trim()) ? first.ContractName.trim() : undefined,\n        sourceText: sourceCode || undefined,",
        "provider_private_contract_name_value",
    )
    return text


CORRELATION_HELPERS = r'''type ContractNode = {
  name: string;
  abstract: boolean;
  bases: string[];
  unitId: string;
  text: string;
};

type ContractCorrelation = {
  targetSelection: "etherscan_contract_name" | "single_concrete_contract" | "ambiguous_or_missing";
  targetContractName?: string;
  analyzedContractNames: string[];
  sourceUnitIds: string[];
};

function baseNames(raw: string | undefined) {
  if (!raw) return [];
  return raw.split(",").flatMap((entry) => {
    const match = entry.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)/);
    return match ? [match[1]] : [];
  });
}

function extractContractNodes(units: SourceUnit[]): ContractNode[] {
  const nodes: ContractNode[] = [];
  for (const unit of units) {
    const clean = stripSolidityProse(unit.content);
    const pattern = /\b(abstract\s+)?contract\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:is\s+([^{}]+?))?\s*\{/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(clean)) !== null) {
      const openBrace = match.index + match[0].lastIndexOf("{");
      let depth = 0;
      let closeBrace = -1;
      for (let index = openBrace; index < clean.length; index += 1) {
        const char = clean[index];
        if (char === "{") depth += 1;
        else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            closeBrace = index;
            break;
          }
        }
      }
      if (closeBrace < 0) break;
      nodes.push({
        name: match[2],
        abstract: Boolean(match[1]),
        bases: baseNames(match[3]),
        unitId: unit.id,
        text: clean.slice(match.index, closeBrace + 1),
      });
      pattern.lastIndex = closeBrace + 1;
    }
  }
  return nodes;
}

function selectTargetContract(nodes: ContractNode[], requestedContractName: unknown) {
  const contractName = typeof requestedContractName === "string" && /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(requestedContractName.trim())
    ? requestedContractName.trim()
    : undefined;
  if (contractName) {
    const exact = nodes.filter((node) => node.name === contractName);
    if (exact.length === 1) return { node: exact[0], selection: "etherscan_contract_name" as const, requested: contractName };
    return { node: null, selection: "ambiguous_or_missing" as const, requested: contractName };
  }
  const concrete = nodes.filter((node) => !node.abstract);
  if (concrete.length === 1) return { node: concrete[0], selection: "single_concrete_contract" as const, requested: undefined };
  return { node: null, selection: "ambiguous_or_missing" as const, requested: undefined };
}

function inheritanceClosure(target: ContractNode, nodes: ContractNode[]) {
  const byName = new Map<string, ContractNode | null>();
  for (const node of nodes) {
    if (!byName.has(node.name)) byName.set(node.name, node);
    else byName.set(node.name, null);
  }
  const result: ContractNode[] = [];
  const inheritedNames = new Set<string>();
  const seen = new Set<string>();
  function visit(node: ContractNode) {
    const key = `${node.unitId}:${node.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(node);
    for (const base of node.bases) {
      inheritedNames.add(base);
      const inherited = byName.get(base);
      if (inherited) visit(inherited);
    }
  }
  visit(target);
  return { nodes: result, inheritedNames };
}

function correlationFor(selection: ReturnType<typeof selectTargetContract>, closure: ReturnType<typeof inheritanceClosure> | null): ContractCorrelation {
  return {
    targetSelection: selection.selection,
    targetContractName: selection.node?.name ?? selection.requested,
    analyzedContractNames: closure?.nodes.map((node) => node.name).slice(0, 32) ?? [],
    sourceUnitIds: Array.from(new Set(closure?.nodes.map((node) => node.unitId) ?? [])).slice(0, 16),
  };
}
'''


def patch_detector(text: str) -> str:
    text = replace_once(
        text,
        "  sourceDigest?: string;\n  sourceUnitCount: number;\n  signals: {",
        "  sourceDigest?: string;\n  sourceUnitCount: number;\n  correlation: {\n    targetSelection: \"etherscan_contract_name\" | \"single_concrete_contract\" | \"ambiguous_or_missing\";\n    targetContractName?: string;\n    analyzedContractNames: string[];\n    sourceUnitIds: string[];\n  };\n  signals: {",
        "detector_report_correlation",
    )
    text = replace_once(
        text,
        "type SourceUnit = { id: string; content: string };\n",
        "type SourceUnit = { id: string; content: string };\n\n" + CORRELATION_HELPERS + "\n",
        "detector_contract_graph_helpers",
    )
    text = replace_once(
        text,
        "  sourceUnitCount?: number;\n  signals?: Pass5002Erc2771MulticallSourceDetectorReport[\"signals\"];",
        "  sourceUnitCount?: number;\n  correlation?: ContractCorrelation;\n  signals?: Pass5002Erc2771MulticallSourceDetectorReport[\"signals\"];",
        "base_report_correlation_arg",
    )
    text = replace_once(
        text,
        "    sourceUnitCount: args.sourceUnitCount ?? 0,\n    signals: args.signals ?? ZERO_SIGNALS,",
        "    sourceUnitCount: args.sourceUnitCount ?? 0,\n    correlation: args.correlation ?? { targetSelection: \"ambiguous_or_missing\", analyzedContractNames: [], sourceUnitIds: [] },\n    signals: args.signals ?? ZERO_SIGNALS,",
        "base_report_correlation_value",
    )

    old_start = "  const clean = units.map((unit) => stripSolidityProse(unit.content)).join(\"\\n\");"
    old_end = "  const responseDigest = `sha256:${digest}`;"
    replacement = r'''  const sourceDigest = sha256(evidence.sourceText);
  const nodes = extractContractNodes(units);
  const selection = selectTargetContract(nodes, evidence.contractName);
  if (!selection.node) {
    const correlation = correlationFor(selection, null);
    return baseReport({
      locale, chain, contractAddress, state: "blocked", provider: evidence.provider,
      responseDigest: `sha256:${digest}`,
      sourceDigest,
      sourceUnitCount: units.length,
      correlation,
      customerLine: t(locale,
        "Zweryfikowany source bundle nie pozwala jednoznacznie wskazać docelowego kontraktu; detector fail-closed nie zgłasza findingu.",
        "Im verifizierten Source-Bundle ist der Zielvertrag nicht eindeutig bestimmbar; der Detector bleibt fail-closed und meldet kein Finding.",
        "The verified source bundle does not identify one target contract unambiguously; the detector fails closed and asserts no finding."),
      proPdfLine: `ERC2771_MULTICALL state=blocked; targetSelection=${correlation.targetSelection}; contractName=${correlation.targetContractName ?? "unavailable"}`,
      advancedAction: t(locale,
        "Powiązać exact explorer ContractName z verified source albo zredukować bundle do jednego concrete target i uruchomić detector ponownie.",
        "Exakten Explorer-ContractName mit verifiziertem Source binden oder Bundle auf ein eindeutiges Concrete Target reduzieren und Detector erneut ausfuehren.",
        "Bind the exact explorer ContractName to verified source or reduce the bundle to one unambiguous concrete target, then rerun the detector."),
      blockers: ["verified_source_target_contract_ambiguous_or_missing"],
    });
  }

  const closure = inheritanceClosure(selection.node, nodes);
  const correlation = correlationFor(selection, closure);
  const clean = closure.nodes.map((node) => node.text).join("\n");
  const metaContext = (closure.inheritedNames.has("ERC2771Context") || closure.nodes.some((node) => node.name === "ERC2771Context"))
    && /\b_msgSender\s*\(\s*\)/.test(clean);
  const selfDelegatecall = /(?:functionDelegateCall\s*\(\s*address\s*\(\s*this\s*\)|address\s*\(\s*this\s*\)\s*\.\s*delegatecall\s*\()/.test(clean);
  const batchedUserCalldata = /bytes\s*\[\s*\]\s+calldata\s+[A-Za-z_][A-Za-z0-9_]*/.test(clean);
  const authUsesLogicalSender = /(?:hasRole|require|revert|owner|authorized|isAuthorized)[^;{}]{0,220}_msgSender\s*\(\s*\)/i.test(clean);
  const preservation = /address\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*_msgSender\s*\(\s*\)\s*;/.test(clean)
    && /abi\s*\.\s*encodePacked\s*\([^;]{0,260},\s*[A-Za-z_][A-Za-z0-9_]*\s*\)/.test(clean)
    && /msg\s*\.\s*sender\s*!=/.test(clean);
  const signals = {
    erc2771LogicalSenderContext: metaContext,
    arbitrarySelfDelegatecallBatch: selfDelegatecall && batchedUserCalldata,
    authorizationUsesLogicalSender: authUsesLogicalSender,
    logicalSenderPreservedAcrossDelegatecall: preservation,
  };
  const vulnerablePattern = metaContext && selfDelegatecall && batchedUserCalldata && authUsesLogicalSender && !preservation;
  const mitigatedPattern = metaContext && selfDelegatecall && batchedUserCalldata && preservation;
  const state: Pass5002SourcePatternState = vulnerablePattern ? "confirmed_source_pattern" : mitigatedPattern ? "mitigated_source_pattern" : "not_detected";
  const correlatedUnits = units.filter((unit) => correlation.sourceUnitIds.includes(unit.id));
'''
    text = replace_between(text, old_start, old_end, replacement, "detector_global_to_correlated_analysis")
    text = replace_once(
        text,
        "  const refs = evidenceRefs(units, responseDigest, sourceDigest, signals);",
        "  const refs = evidenceRefs(correlatedUnits, responseDigest, sourceDigest, signals);",
        "detector_correlated_evidence_refs",
    )
    text = replace_once(
        text,
        "      sourceUnitCount: units.length, signals, confidence: 92, severityCandidate: \"elevated\",",
        "      sourceUnitCount: units.length, correlation, signals, confidence: 92, severityCandidate: \"elevated\",",
        "detector_vulnerable_correlation_output",
    )
    text = replace_once(
        text,
        "    sourceUnitCount: units.length, signals, confidence: mitigatedPattern ? 88 : 70,",
        "    sourceUnitCount: units.length, correlation, signals, confidence: mitigatedPattern ? 88 : 70,",
        "detector_nonvulnerable_correlation_output",
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
            raise SystemExit(f"P78R4 parent projection mismatch:{key}:{observed}:{expected}")

    rowmap = {row["path"]: dict(row) for row in parent["files"]}
    changed = []
    for rel, guard in PREIMAGE.items():
        path = root / rel
        before = path.read_bytes()
        before_sha = sha256(before)
        if len(before) != guard["bytes"] or before_sha != guard["sha256"]:
            raise SystemExit(f"P78R4 preimage mismatch:{rel}:{len(before)}/{guard['bytes']}:{before_sha}/{guard['sha256']}")
        text = before.decode("utf-8")
        after_text = patch_provider(text) if rel.endswith("audit-provider-runtime-client.ts") else patch_detector(text)
        after = after_text.encode("utf-8")
        if after == before:
            raise SystemExit(f"P78R4 no-op patch:{rel}")
        after_sha = sha256(after)
        path.write_bytes(after)
        rowmap[rel]["byteLength"] = len(after)
        rowmap[rel]["sha256"] = after_sha
        changed.append({"path": rel, "beforeBytes": len(before), "beforeSha256": before_sha, "afterBytes": len(after), "afterSha256": after_sha})

    rows = sorted(rowmap.values(), key=lambda row: row["path"])
    observed = identity(rows)
    if observed["fileCount"] != PARENT["fileCount"] or observed["pathSetSha256"] != PARENT["pathSetSha256"]:
        raise SystemExit(f"P78R4 path identity changed unexpectedly:{observed}")

    new_manifest = dict(parent)
    new_manifest["schemaVersion"] = "velmere.p78r4.build-relevant-projection.v1"
    new_manifest["classification"] = "CURRENT_PRODUCT_PROJECTION_P78R4_TARGET_CORRELATED_ERC2771_MULTICALL"
    new_manifest["projection"] = dict(parent["projection"])
    new_manifest["projection"].update(observed)
    new_manifest["projection"]["purpose"] = "Bind verified source-pattern detection to the exact explorer ContractName or one unambiguous concrete contract and analyze only its inheritance closure, preventing cross-unit signal composition."
    new_manifest["projection"]["excludedFromCredit"] = ["runtime exploitability proof", "deployed bytecode equivalence", "formal detector accuracy", "Customer FINAL", "Audit FINAL PDF", "rights expansion", "paid value", "sale eligibility", "LIVE", "world-class proof"]
    new_manifest["files"] = rows
    new_manifest["p78r4Delta"] = {"parent": "P78R3/V17", "changedBuildRelevantFiles": changed, "crossUnitFalsePositiveRepair": True, "targetContractNameReceiptBound": True, "riskFloorPromotion": False, "runtimeExploitabilityPromotion": False, "customerFinalOutputCredit": 0, "auditFinalPdfCredit": 0, "rightsCredit": 0, "paidValueCredit": 0, "saleCredit": 0, "live": False}
    Path(args.manifest).write_text(json.dumps(new_manifest, indent=2) + "\n", encoding="utf-8")

    receipt = {
        "schemaVersion": "velmere.p78r4.target-contract-correlation-source-patch.v1",
        "status": "PASS",
        "parentProjection": PARENT,
        "projection": observed,
        "changedFiles": changed,
        "rootCause": "P78R3 aggregated pattern signals across all verified source units, allowing unrelated contracts in one explorer bundle to compose a false positive.",
        "repair": [
            "carry exact Etherscan ContractName inside the existing digest-bound private verified-static-evidence envelope",
            "parse bounded Solidity contract declarations and inheritance edges after prose stripping",
            "select exact ContractName when present; otherwise require exactly one concrete contract",
            "analyze pattern signals only inside the selected target contract inheritance closure",
            "fail closed on ambiguous/missing target selection and bind evidence refs only to correlated source units",
        ],
        "zeroFakeCredit": {"runtimeExploitability": 0, "deployedBytecodeEquivalence": 0, "formalDetectorAccuracy": "WITHHELD", "customerFinal": "0/20", "auditFinalPdf": "0/3", "rights": "2/203", "paidValue": "0/10", "saleEligible": "0/20", "live": False},
        "truthBoundary": "P78R4 is a precision/correlation repair. It may reduce false positives but does not establish formal accuracy or runtime exploitability and does not promote customer/commercial release numerators.",
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
