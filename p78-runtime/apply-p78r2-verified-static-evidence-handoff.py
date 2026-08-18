from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PARENT = {
    "fileCount": 1601,
    "payloadBytes": 21038083,
    "pathSetSha256": "40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59",
    "sourceContentAggregateSha256": "ea3c19a193d44055e00c3ca952d279f15b4df1813f977789e6ebcea203870a08",
}

PREIMAGE = {
    "lib/security/audit-provider-runtime-client.ts": {
        "bytes": 39628,
        "sha256": "090c7377c7a963395adbd7446339d1a4ef91e68fc59dcee7ab8dc068db107bcd",
    },
    "lib/security/audit-watch-post-handler.ts": {
        "bytes": 40110,
        "sha256": "fec48e652df63f6aa0505c7f43d2dce2170461f1a38777d3139c1732035ed383",
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
        raise SystemExit(f"P78R2 replacement anchor mismatch:{label}:{count}")
    return text.replace(old, new, 1)


def replace_between(text: str, start: str, end: str, replacement: str, label: str) -> str:
    start_count = text.count(start)
    end_count = text.count(end)
    if start_count != 1 or end_count != 1:
        raise SystemExit(f"P78R2 boundary mismatch:{label}:start={start_count}:end={end_count}")
    i = text.index(start)
    j = text.index(end, i)
    return text[:i] + replacement.rstrip() + "\n\n" + text[j:]


EXPLORER_FUNCTION = r'''async function explorerLane(contractAddress: string | undefined, chain: string, chainId: string, locale: string): Promise<Pass2572ExplorerExecution> {
  const timeoutMs = 3000;
  const key = env(["ETHERSCAN_API_KEY"]);
  if (!isEvmAddress(contractAddress)) {
    return {
      lane: lane({
        id: "runtime-explorer-source",
        label: "Explorer source / ABI",
        provider: "Etherscan V2",
        providerFamily: "block_explorer",
        identity: { verification: "unverified", matched: false },
        state: "missing",
        tier: ["basic", "pro", "advanced"],
        claim: t(locale, "Nie podano poprawnego adresu EVM.", "Keine gueltige EVM Adresse angegeben.", "No valid EVM address was provided."),
        evidence: [],
        missing: [t(locale, "Explorer source wymaga adresu 0x.", "Explorer Source braucht eine 0x Adresse.", "Explorer source requires a 0x address.")],
        timeoutMs,
        boundary: "No verified-source claim without explorer response identity binding.",
      }),
    };
  }
  if (!key) {
    return {
      lane: lane({
        id: "runtime-explorer-source",
        label: "Explorer source / ABI",
        provider: "Etherscan V2",
        providerFamily: "block_explorer",
        identity: { verification: "request_bound", requestedAddress: contractAddress.toLowerCase(), requestedChainId: chainId, matched: false },
        state: "blocked",
        tier: ["basic", "pro", "advanced"],
        claim: t(locale, "Explorer gotowy, ale brakuje klucza API.", "Explorer bereit, aber API Key fehlt.", "Explorer runtime is ready, but API key is missing."),
        evidence: [`chainId ${chainId}`, "contract format valid"],
        missing: ["ETHERSCAN_API_KEY"],
        timeoutMs,
        boundary: "No source/ABI certainty until API key confirms it.",
      }),
    };
  }
  const sourceUrl = `https://api.etherscan.io/v2/api?chainid=${encodeURIComponent(chainId)}&module=contract&action=getsourcecode&address=${encodeURIComponent(contractAddress)}&apikey=${encodeURIComponent(key.value)}`;
  const identityUrl = `https://api.etherscan.io/v2/api?chainid=${encodeURIComponent(chainId)}&module=contract&action=getcontractcreation&contractaddresses=${encodeURIComponent(contractAddress)}&apikey=${encodeURIComponent(key.value)}`;
  const [sourceResult, identityResult] = await Promise.all([
    safeFetchJson(sourceUrl, timeoutMs),
    safeFetchJson(identityUrl, timeoutMs),
  ]);
  const data = asRecord(sourceResult.data);
  const rows = Array.isArray(data?.result) ? data.result : [];
  const first = asRecord(rows[0]);
  const sourceCode = typeof first?.SourceCode === "string" ? first.SourceCode.trim() : "";
  const abi = typeof first?.ABI === "string" ? first.ABI.trim() : "";
  const usableAbi = abi && abi !== "Contract source code not verified" ? abi : "";
  const sourcePositive = Boolean(first && (sourceCode || usableAbi));
  const identityData = asRecord(identityResult.data);
  const identityRows = Array.isArray(identityData?.result) ? identityData.result : [];
  const identityFirst = asRecord(identityRows[0]);
  const resolvedAddress = normalizedAddress(identityFirst?.contractAddress ?? identityFirst?.contract_address);
  const identityMatched = resolvedAddress === contractAddress.toLowerCase();
  const state: Pass2572RuntimeState = sourceResult.timedOut || identityResult.timedOut
    ? "timeout"
    : !sourceResult.ok
      ? sourceResult.status === 404 ? "missing" : "error"
      : sourcePositive && identityMatched
        ? "confirmed"
        : sourcePositive ? "partial" : "missing";
  const responseReceipt = receiptFromFetch(sourceResult, [identityResult]);
  const verifiedStaticEvidence: Pass2572VerifiedStaticEvidence | undefined = sourcePositive && identityMatched && responseReceipt?.bodyDigest
    ? {
        contractAddress: contractAddress.toLowerCase(),
        chain,
        provider: "Etherscan V2",
        observedAt: responseReceipt.observedAt,
        responseDigest: responseReceipt.bodyDigest,
        sourceText: sourceCode || undefined,
        abiText: usableAbi || undefined,
      }
    : undefined;
  return {
    lane: lane({
      id: "runtime-explorer-source",
      label: "Explorer source / ABI",
      provider: "Etherscan V2",
      providerFamily: "block_explorer",
      receipt: responseReceipt,
      identity: {
        verification: identityMatched ? "exact_response" : "request_bound",
        requestedAddress: contractAddress.toLowerCase(),
        resolvedAddress,
        requestedChainId: chainId,
        resolvedChainId: identityMatched ? chainId : undefined,
        matched: identityMatched,
      },
      state,
      tier: ["basic", "pro", "advanced"],
      claim: sourcePositive && identityMatched
        ? "Explorer returned content-bound source/ABI evidence and echoed the exact contract identity through the same upstream."
        : sourcePositive
          ? "Explorer returned source/ABI, but exact contract identity was not independently echoed by the response."
          : "Explorer lane could not confirm source/ABI yet.",
      sourceUrl: "https://api.etherscan.io/v2/api",
      evidence: compactEvidenceRows([
        sourcePositive ? "source/ABI response received" : "",
        identityMatched ? `resolvedAddress: ${resolvedAddress}` : "",
        first?.ContractName ? `contractName: ${String(first.ContractName).slice(0, 80)}` : "",
        first?.CompilerVersion ? `compiler: ${String(first.CompilerVersion).slice(0, 80)}` : "",
        first?.Proxy ? `proxy: ${String(first.Proxy).slice(0, 20)}` : "",
        first?.Implementation ? `implementation: ${String(first.Implementation).slice(0, 96)}` : "",
        sourceResult.bodyDigest ? `responseDigest: ${sourceResult.bodyDigest}` : "",
      ]),
      missing: compactEvidenceRows([
        !sourcePositive ? "verified source / ABI unavailable" : "",
        !identityMatched ? "exact contract identity not echoed by explorer response" : "",
        !identityResult.ok ? `identity endpoint status ${identityResult.status || "network_error"}` : "",
      ]),
      latencyMs: Math.max(sourceResult.latencyMs, identityResult.latencyMs),
      timeoutMs,
      boundary: "Verified/source claims require content plus exact response identity; request binding alone cannot enter paid quorum.",
    }),
    verifiedStaticEvidence,
  };
}'''

BOTTOM_BUILDERS = r'''export async function buildPass2572AuditProviderRuntimeExecution(input: RuntimeInput): Promise<Pass2572AuditProviderRuntimeExecution> {
  const key = pass4824ProviderReportCacheKey(input);
  const now = Date.now();
  const cached = pass4824ProviderReportCache.get(key);
  if (cached && cached.expiresAt > now) return structuredClone(cached.value);
  const existing = pass4824ProviderReportInFlight.get(key);
  if (existing) return structuredClone(await existing);

  prunePass4824ProviderReportCache(now);
  const operation = buildUncachedPass2572AuditProviderRuntimeExecution(input);
  pass4824ProviderReportInFlight.set(key, operation);
  try {
    const value = await operation;
    pass4824ProviderReportCache.set(key, {
      expiresAt: Date.now() + PASS4824_PROVIDER_REPORT_CACHE_TTL_MS,
      value: structuredClone(value),
    });
    prunePass4824ProviderReportCache(Date.now());
    return structuredClone(value);
  } finally {
    if (pass4824ProviderReportInFlight.get(key) === operation) {
      pass4824ProviderReportInFlight.delete(key);
    }
  }
}

export async function buildPass2572AuditProviderRuntimeReport(input: RuntimeInput): Promise<Pass2572AuditProviderRuntimeReport> {
  const execution = await buildPass2572AuditProviderRuntimeExecution(input);
  return structuredClone(execution.report);
}'''


def patch_provider_runtime(text: str) -> str:
    text = replace_once(
        text,
        'type RuntimeInput = Partial<AuditReviewSubmission> & {\n',
        'export type Pass2572VerifiedStaticEvidence = {\n'
        '  contractAddress: string;\n'
        '  chain: string;\n'
        '  provider: string;\n'
        '  observedAt: string;\n'
        '  responseDigest: string;\n'
        '  sourceText?: string;\n'
        '  abiText?: string;\n'
        '  bytecodeText?: string;\n'
        '};\n\n'
        'export type Pass2572AuditProviderRuntimeExecution = {\n'
        '  report: Pass2572AuditProviderRuntimeReport;\n'
        '  /** Private server-side evidence. Never spread into a customer/public envelope. */\n'
        '  verifiedStaticEvidence?: Pass2572VerifiedStaticEvidence;\n'
        '};\n\n'
        'type Pass2572ExplorerExecution = {\n'
        '  lane: Pass2572RuntimeLane;\n'
        '  verifiedStaticEvidence?: Pass2572VerifiedStaticEvidence;\n'
        '};\n\n'
        'type RuntimeInput = Partial<AuditReviewSubmission> & {\n',
        "provider_private_execution_types",
    )
    text = replace_once(
        text,
        'const pass4824ProviderReportCache = new Map<string, {\n  expiresAt: number;\n  value: Pass2572AuditProviderRuntimeReport;\n}>();\nconst pass4824ProviderReportInFlight = new Map<string, Promise<Pass2572AuditProviderRuntimeReport>>();',
        'const pass4824ProviderReportCache = new Map<string, {\n  expiresAt: number;\n  value: Pass2572AuditProviderRuntimeExecution;\n}>();\nconst pass4824ProviderReportInFlight = new Map<string, Promise<Pass2572AuditProviderRuntimeExecution>>();',
        "provider_execution_cache_type",
    )
    text = replace_between(text, 'async function explorerLane(', 'async function dexScreenerLane(', EXPLORER_FUNCTION, "provider_explorer_execution")
    text = replace_once(
        text,
        'async function buildUncachedPass2572AuditProviderRuntimeReport(input: RuntimeInput): Promise<Pass2572AuditProviderRuntimeReport> {',
        'async function buildUncachedPass2572AuditProviderRuntimeExecution(input: RuntimeInput): Promise<Pass2572AuditProviderRuntimeExecution> {',
        "provider_uncached_execution_signature",
    )
    text = replace_once(
        text,
        '  const [explorer, dex, goplus, honeypot, coingecko] = await Promise.all([\n    explorerLane(contractAddress, chainId, locale),\n    dexScreenerLane(contractAddress, chainId, locale),\n    goPlusLane(contractAddress, chainId),\n    honeypotLane(contractAddress, chainId),\n    coinGeckoLane(projectName, contractAddress),\n  ]);\n\n  const lanes = [explorer, dex, goplus, honeypot, coingecko, docsLane(input, locale), advancedLane(locale)];',
        '  const [explorerExecution, dex, goplus, honeypot, coingecko] = await Promise.all([\n    explorerLane(contractAddress, chain, chainId, locale),\n    dexScreenerLane(contractAddress, chainId, locale),\n    goPlusLane(contractAddress, chainId),\n    honeypotLane(contractAddress, chainId),\n    coinGeckoLane(projectName, contractAddress),\n  ]);\n  const explorer = explorerExecution.lane;\n\n  const lanes = [explorer, dex, goplus, honeypot, coingecko, docsLane(input, locale), advancedLane(locale)];',
        "provider_build_execution_destructure",
    )
    text = replace_once(
        text,
        '  return {\n    passId: PASS2572_AUDIT_PROVIDER_RUNTIME_CLIENT_ID,',
        '  const report: Pass2572AuditProviderRuntimeReport = {\n    passId: PASS2572_AUDIT_PROVIDER_RUNTIME_CLIENT_ID,',
        "provider_report_local_variable",
    )
    text = replace_once(
        text,
        '    ],\n  };\n}\n\nfunction pass4824ProviderReportCacheKey',
        '    ],\n  };\n  return { report, verifiedStaticEvidence: explorerExecution.verifiedStaticEvidence };\n}\n\nfunction pass4824ProviderReportCacheKey',
        "provider_uncached_execution_return",
    )
    text = replace_between(text, 'export async function buildPass2572AuditProviderRuntimeReport(', '\n', BOTTOM_BUILDERS, "provider_cached_execution_builders") if False else text
    # The exported report builder is the final declaration in the file; replace through EOF deterministically.
    marker = 'export async function buildPass2572AuditProviderRuntimeReport(input: RuntimeInput): Promise<Pass2572AuditProviderRuntimeReport> {'
    if text.count(marker) != 1:
        raise SystemExit(f"P78R2 final builder marker mismatch:{text.count(marker)}")
    i = text.index(marker)
    text = text[:i] + BOTTOM_BUILDERS + "\n"
    return text


def patch_handler(text: str) -> str:
    text = replace_once(
        text,
        'import { buildPass2572AuditProviderRuntimeReport } from "@/lib/security/audit-provider-runtime-client";',
        'import { buildPass2572AuditProviderRuntimeExecution } from "@/lib/security/audit-provider-runtime-client";',
        "handler_provider_execution_import",
    )
    text = replace_once(
        text,
        '  const pass2572AuditProviderRuntime = await buildPass2572AuditProviderRuntimeReport({\n    ...normalized,\n    locale,\n    providerIntelligence: pass2571AuditProviderIntelligence,\n  });\n  const pass2573AuditRuntimeConfidence',
        '  const pass2572AuditProviderRuntimeExecution = await buildPass2572AuditProviderRuntimeExecution({\n    ...normalized,\n    locale,\n    providerIntelligence: pass2571AuditProviderIntelligence,\n  });\n  const pass2572AuditProviderRuntime = pass2572AuditProviderRuntimeExecution.report;\n  const pass2572VerifiedStaticEvidence = pass2572AuditProviderRuntimeExecution.verifiedStaticEvidence ?? null;\n  const pass2573AuditRuntimeConfidence',
        "handler_private_evidence_execution",
    )
    text = replace_once(
        text,
        '    claimLedger: pass2574AuditClaimLedger,\n    sourceFreshness: pass2575AuditSourceFreshness,\n  });\n  const pass2577AuditLiquidityHolderLockRisk',
        '    claimLedger: pass2574AuditClaimLedger,\n    sourceFreshness: pass2575AuditSourceFreshness,\n    verifiedStaticEvidence: pass2572VerifiedStaticEvidence,\n  });\n  const pass2577AuditLiquidityHolderLockRisk',
        "handler_permission_parser_private_evidence",
    )
    text = replace_once(
        text,
        '    permissionParser: pass2576AuditPermissionParser,\n    realProviderAdapterHardening: pass2582RealProviderAdapterHardening,\n  });\n  const pass2584HolderLiquidityDepthEvidence',
        '    permissionParser: pass2576AuditPermissionParser,\n    realProviderAdapterHardening: pass2582RealProviderAdapterHardening,\n    verifiedStaticEvidence: pass2572VerifiedStaticEvidence,\n  });\n  const pass2584HolderLiquidityDepthEvidence',
        "handler_source_abi_private_evidence",
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
            raise SystemExit(f"P78R2 parent projection mismatch:{key}:{observed}:{expected}")

    rowmap = {row["path"]: dict(row) for row in parent["files"]}
    changed = []
    for rel, guard in PREIMAGE.items():
        path = root / rel
        before = path.read_bytes()
        before_sha = sha256(before)
        if len(before) != guard["bytes"] or before_sha != guard["sha256"]:
            raise SystemExit(f"P78R2 preimage mismatch:{rel}:{len(before)}/{guard['bytes']}:{before_sha}/{guard['sha256']}")
        text = before.decode("utf-8")
        after_text = patch_provider_runtime(text) if rel.endswith("audit-provider-runtime-client.ts") else patch_handler(text)
        after = after_text.encode("utf-8")
        after_sha = sha256(after)
        if after == before:
            raise SystemExit(f"P78R2 no-op patch:{rel}")
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
        raise SystemExit(f"P78R2 topology changed unexpectedly:{observed}")

    new_manifest = dict(parent)
    new_manifest["schemaVersion"] = "velmere.p78r2.build-relevant-projection.v1"
    new_manifest["classification"] = "CURRENT_PRODUCT_PROJECTION_P78R2_VERIFIED_STATIC_EVIDENCE_HANDOFF"
    new_manifest["projection"] = dict(parent["projection"])
    new_manifest["projection"].update(observed)
    new_manifest["projection"]["purpose"] = "Preserve exact Etherscan source/ABI as private content+identity-bound static evidence during the same provider execution, then hand it to PASS2576/PASS2583 without exposing raw source in public provider reports."
    new_manifest["projection"]["excludedFromCredit"] = [
        "new vulnerability detector credit",
        "runtime exploitability proof",
        "Customer FINAL",
        "Audit FINAL PDF",
        "rights expansion",
        "paid value",
        "sale eligibility",
        "LIVE",
        "world-class proof",
    ]
    new_manifest["files"] = rows
    new_manifest["p78r2Delta"] = {
        "parent": "P78R1/V17",
        "changedBuildRelevantFiles": changed,
        "repair": "Replace the dead verifiedStaticEvidence contract with a private single-fetch execution handoff from Etherscan provider runtime into the current permission parser and source/ABI extraction path. Public runtime report remains source-code-free.",
        "doubleFetchAdded": False,
        "rawSourcePubliclyExposed": False,
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
        "schemaVersion": "velmere.p78r2.verified-static-evidence-handoff-source-patch.v1",
        "status": "PASS",
        "parentProjection": PARENT,
        "projection": observed,
        "changedFiles": changed,
        "semanticRepairs": [
            "Etherscan source and ABI survive the exact provider fetch only as private verified static evidence",
            "static evidence is bound to exact contract identity, chain, provider, observation time and combined response digest",
            "public Pass2572AuditProviderRuntimeReport remains raw-source-free",
            "same cached/single-flight provider execution carries report and private evidence together",
            "reachable Audit handler passes private evidence to PASS2576 permission parser and PASS2583 source/ABI extraction",
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
        "truthBoundary": "P78R2 activates an existing trusted static-evidence path. It does not itself assert any vulnerability, exploitability, customer FINAL or commercial readiness.",
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
