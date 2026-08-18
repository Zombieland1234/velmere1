from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PARENT = {
    "fileCount": 1601,
    "payloadBytes": 21037233,
    "pathSetSha256": "40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59",
    "sourceContentAggregateSha256": "354ec7229eb61dd55cccdae90c4a94576967f1c3beb9bad67909d847ccf1e032",
}

PREIMAGE = {
    "lib/security/audit-watch-post-handler.ts": {
        "bytes": 39533,
        "sha256": "2f8cfdfd7aa11bf448c2bee00398a72647137e550e52dc0e37de0f6639217c62",
    },
    "lib/security/audit-claim-ledger.ts": {
        "bytes": 15965,
        "sha256": "9f799c6322f1be59df3e3add2bb559251f41b92f296896ece6f26e142d3ad18a",
    },
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
        raise SystemExit(f"P78 replacement anchor mismatch:{label}:{count}")
    return text.replace(old, new, 1)


def patch_watch_handler(text: str) -> str:
    text = replace_once(
        text,
        'import { buildPass4820AuditCustomerReportPipeline } from "@/lib/security/audit-customer-report-pipeline";\nimport { buildAuditAccountCustomerSnapshot } from "@/lib/security/audit-account-customer-snapshot";\n',
        'import { buildPass4820AuditCustomerReportPipeline } from "@/lib/security/audit-customer-report-pipeline";\nimport { buildAuditAdjudicatedAuthorityEvidence } from "@/lib/security/audit-adjudicated-authority-evidence";\nimport { buildAuditAccountCustomerSnapshot } from "@/lib/security/audit-account-customer-snapshot";\n',
        "handler_import_authority",
    )
    text = replace_once(
        text,
        '  const pass2573AuditRuntimeConfidence = buildPass2573AuditRuntimeConfidenceReport({\n    ...normalized,\n    locale,\n    sourceQuorum: pass2570AuditSourceQuorum,\n    providerRuntime: pass2572AuditProviderRuntime,\n  });\n  const pass2574AuditClaimLedger = buildPass2574AuditClaimLedgerReport({\n',
        '  const pass2573AuditRuntimeConfidence = buildPass2573AuditRuntimeConfidenceReport({\n    ...normalized,\n    locale,\n    sourceQuorum: pass2570AuditSourceQuorum,\n    providerRuntime: pass2572AuditProviderRuntime,\n  });\n  // V17/P78: authority evidence must travel through the real customer route.\n  // Unknown targets short-circuit to not_applicable without network access.\n  const pass5001AuditAdjudicatedAuthorityEvidence = await buildAuditAdjudicatedAuthorityEvidence({\n    chain: normalized.chain,\n    contractAddress: customerContractAddress,\n  });\n  const pass2574AuditClaimLedger = buildPass2574AuditClaimLedgerReport({\n',
        "handler_build_authority",
    )
    text = replace_once(
        text,
        '    providerRuntime: pass2572AuditProviderRuntime,\n    runtimeConfidence: pass2573AuditRuntimeConfidence,\n  });\n  const pass2575AuditSourceFreshness',
        '    providerRuntime: pass2572AuditProviderRuntime,\n    runtimeConfidence: pass2573AuditRuntimeConfidence,\n    authorityEvidence: pass5001AuditAdjudicatedAuthorityEvidence,\n  });\n  const pass2575AuditSourceFreshness',
        "handler_claim_ledger_authority",
    )
    text = replace_once(
        text,
        '  const canonicalCustomerPipeline = buildPass4820AuditCustomerReportPipeline({\n    report: pass2578AuditReportAssembler,\n    providerRuntime: pass2572AuditProviderRuntime,\n    requestedTier: paidAuditDepth ?? "basic",\n',
        '  const canonicalCustomerPipeline = buildPass4820AuditCustomerReportPipeline({\n    report: pass2578AuditReportAssembler,\n    providerRuntime: pass2572AuditProviderRuntime,\n    authorityEvidence: pass5001AuditAdjudicatedAuthorityEvidence,\n    requestedTier: paidAuditDepth ?? "basic",\n',
        "handler_customer_pipeline_authority",
    )
    return text


def patch_claim_ledger(text: str) -> str:
    text = replace_once(
        text,
        '    return t(locale, "Wysłać do manualnej mapy permissions/source parser przed mocnym werdyktem.", "An manuelle Permissions/Source-Pruefung senden.", "Send to manual permissions/source parser before a strong verdict.");',
        '    return t(locale, "Uruchomić automatyczny permissions/source parser i niezależny evidence re-check przed mocnym werdyktem.", "Automatisierten Permissions-/Source-Parser und unabhaengigen Evidence-Recheck vor einem starken Urteil ausfuehren.", "Run the automated permissions/source parser and an independent evidence re-check before a strong verdict.");',
        "claim_advanced_action_automation",
    )
    text = replace_once(
        text,
        '      "Advanced kolejkuje claims wymagające manualnej weryfikacji permissions, liquidity, holderów i source freshness.",\n      "Advanced queued Claims fuer manuelle Permissions-, Liquiditaets-, Holder- und Source-Freshness-Pruefung.",\n      "Advanced queues claims that require manual permissions, liquidity, holder and source freshness verification.",',
        '      "Advanced automatycznie kolejkuje claims wymagające głębszej weryfikacji permissions, liquidity, holderów i source freshness; opcjonalny QA jest nieblokujący.",\n      "Advanced queued Claims automatisch fuer tiefere Permissions-, Liquiditaets-, Holder- und Source-Freshness-Pruefung; optionale QA ist nicht blockierend.",\n      "Advanced automatically queues claims that require deeper permissions, liquidity, holder and source freshness verification; optional QA is non-gating.",',
        "claim_advanced_rule_automation",
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
            raise SystemExit(f"P78 parent projection mismatch:{key}:{observed}:{expected}")

    rowmap = {row["path"]: dict(row) for row in parent["files"]}
    changed = []
    for rel, guard in PREIMAGE.items():
        path = root / rel
        before = path.read_bytes()
        before_sha = sha256(before)
        if len(before) != guard["bytes"] or before_sha != guard["sha256"]:
            raise SystemExit(f"P78 preimage mismatch:{rel}:{len(before)}/{guard['bytes']}:{before_sha}/{guard['sha256']}")
        text = before.decode("utf-8")
        after_text = patch_watch_handler(text) if rel.endswith("audit-watch-post-handler.ts") else patch_claim_ledger(text)
        after = after_text.encode("utf-8")
        after_sha = sha256(after)
        if after == before:
            raise SystemExit(f"P78 no-op patch:{rel}")
        path.write_bytes(after)
        rowmap[rel]["byteLength"] = len(after)
        rowmap[rel]["sha256"] = after_sha
        changed.append({
            "path": rel,
            "beforeBytes": len(before),
            "beforeSha256": before_sha,
            "afterBytes": len(after),
            "afterSha256": after_sha,
        })

    rows = sorted(rowmap.values(), key=lambda row: row["path"])
    observed = identity(rows)
    if observed["fileCount"] != PARENT["fileCount"] or observed["pathSetSha256"] != PARENT["pathSetSha256"]:
        raise SystemExit(f"P78 topology changed unexpectedly:{observed}")

    new_manifest = dict(parent)
    new_manifest["schemaVersion"] = "velmere.p78r1.build-relevant-projection.v1"
    new_manifest["classification"] = "CURRENT_PRODUCT_PROJECTION_P78R1_AUDIT_AUTHORITY_CUSTOMER_PATH"
    new_manifest["projection"] = dict(parent["projection"])
    new_manifest["projection"].update(observed)
    new_manifest["projection"]["purpose"] = "Exact current-source repair that binds adjudicated authority evidence into the real Audit claim ledger and customer report pipeline while retaining automated Advanced semantics."
    new_manifest["projection"]["excludedFromCredit"] = [
        "vulnerability/exploitability detection credit",
        "Customer FINAL",
        "Audit FINAL PDF",
        "rights expansion",
        "paid value",
        "sale eligibility",
        "LIVE",
        "world-class proof",
    ]
    new_manifest["files"] = rows
    new_manifest["p78r1Delta"] = {
        "parent": "P77R3/V17",
        "changedBuildRelevantFiles": changed,
        "repair": "Carry verified adjudicated authority evidence through the reachable Audit customer handler into both the claim ledger and canonical customer report pipeline; replace stale customer-facing manual Advanced verification semantics with automated evidence re-check wording.",
        "customerFinalOutputCredit": 0,
        "auditFinalPdfCredit": 0,
        "vulnerabilityGroundTruthCredit": 0,
        "rightsCredit": 0,
        "paidValueCredit": 0,
        "saleCredit": 0,
        "live": False,
    }
    Path(args.manifest).write_text(json.dumps(new_manifest, indent=2) + "\n", encoding="utf-8")

    receipt = {
        "schemaVersion": "velmere.p78r1.audit-authority-customer-path-source-patch.v1",
        "status": "PASS",
        "parentProjection": PARENT,
        "projection": observed,
        "changedFiles": changed,
        "semanticRepairs": [
            "reachable handler builds authority evidence from normalized chain + customer contract",
            "claim ledger receives the verified authority evidence object",
            "canonical customer report pipeline receives the same authority evidence object",
            "Advanced unresolved source/permission actions are automated; optional QA remains non-gating",
        ],
        "zeroFakeCredit": {
            "vulnerabilityExploitabilityGroundTruth": 0,
            "customerFinal": "0/20",
            "auditFinalPdf": "0/3",
            "rights": "2/203",
            "paidValue": "0/10",
            "saleEligible": "0/20",
            "live": False,
        },
        "truthBoundary": "P78R1 repairs a reachable evidence-propagation bug and stale manual semantics only. Deployment-identity authority evidence remains explicitly distinct from vulnerability/exploitability proof; no FINAL/PDF/value/rights/sale/LIVE numerator is promoted.",
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
