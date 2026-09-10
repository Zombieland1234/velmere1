/**
 * Velmère Furnace — Independent Adversarial Audit Verifier (Velmère Furnace V6)
 *
 * ZERO-TRUST INDEPENDENT VERIFIER & 40-POINT ADVERSARIAL MUTATION SUITE (MUT-01 to MUT-40)
 * This script DOES NOT import the report generator. It independently validates
 * JSON reports, PDF byte hashes, Merkle trees, evidence links, reviewer truth,
 * tier monotonicity, and includes a full 40-point mutation adversarial test suite
 * adhering to Velmère Furnace V6 Zero-Trust Protocol.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface VerificationIssue {
  readonly checkId: string;
  readonly severity: 'FATAL' | 'ERROR' | 'WARNING';
  readonly message: string;
}

export interface VerificationResult {
  readonly target: string;
  readonly isValid: boolean;
  readonly issues: VerificationIssue[];
  readonly checksPassed: number;
  readonly checksFailed: number;
}

export interface MutationTestResult {
  readonly mutationId: string;
  readonly description: string;
  readonly wasCaught: boolean;
  readonly rejectionReason?: string;
}

export function computeSha256(data: string | Uint8Array | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Deterministic JSON stringification with sorted keys (independent canonical JSON).
 */
export function canonicalJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalJson(item)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') +
    '}'
  );
}

export function isPlaceholderAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return true;
  const clean = address.trim().toLowerCase();
  if (
    clean.startsWith('fixture:') ||
    clean.startsWith('mock:') ||
    clean.startsWith('synthetic:') ||
    clean.startsWith('temp:') ||
    clean.includes('todo')
  ) {
    return true;
  }
  if (/^0x[0-9a-f]{40}$/i.test(clean)) {
    const hex = clean.slice(2);
    if (new Set(hex).size === 1) return true;
    if (hex.slice(0, 2).repeat(20) === hex) return true;
  }
  return false;
}

/**
 * Recomputes Merkle Root from sections and provenance leaves.
 */
export function verifyMerkleRoot(report: any): { root: string; matches: boolean } {
  const hasProvenance = Boolean(
    report.verdict?.snapshotProvenance ||
    report.auditScopeManifest?.cryptographicManifest?.provenanceHash
  );
  const provenance = hasProvenance ? {
    chainId: String(report.target?.chainId || "1"),
    blockNumber: report.verdict?.snapshotProvenance?.snapshotBlockNumber,
    blockHash: report.verdict?.snapshotProvenance?.snapshotBlockHash,
    contractAddress: report.target?.contractAddress,
    bytecodeHash: report.verdict?.snapshotProvenance?.runtimeBytecodeSha256,
    implementationAddress: report.verdict?.proxyDetails?.currentImplementation,
    analysisVersion: "v4.0.0-rc3",
    schemaVersion: "velmere.canonical-audit-report.v1",
  } : undefined;

  const semanticContext = {
    riskScore: report.verdict?.riskScore,
    auditQualityScore: report.verdict?.auditQualityScore,
    targetAddress: report.target?.contractAddress,
    chainId: String(report.target?.chainId || "1"),
    reportId: report.reportId,
    tier: report.clientEntitlementTier,
    locale: report.locale,
  };

  const leaves: string[] = (report.sections || []).map((s: any) => {
    const serialized = JSON.stringify({
      id: s.id,
      tier: s.requiredTier,
      title: s.title,
      sampleLines: s.sampleSummaryLines || [],
      ...(s.data ? { data: s.data } : {}),
      ...(provenance ? { provenance } : {}),
      ...(semanticContext ? { semanticContext } : {}),
    });
    return computeSha256(serialized);
  });

  if (leaves.length === 0) return { root: '', matches: false };

  let currentLayer = [...leaves];
  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
      nextLayer.push(computeSha256(`pair:${left}:${right}`));
    }
    currentLayer = nextLayer;
  }

  const computedRoot = `sha256:${currentLayer[0]}`;
  const cleanReportRoot = (report.merkleRoot || '').replace(/^sha256:/, '');
  const cleanComputedRoot = currentLayer[0];
  const matches = cleanReportRoot === cleanComputedRoot;
  return { root: computedRoot, matches };
}

/**
 * Adversarially verifies a single Canonical Audit Report JSON and accompanying PDF.
 */
export function verifyAuditArtifact(
  reportJsonPath: string,
  pdfPath?: string
): VerificationResult {
  const issues: VerificationIssue[] = [];
  let checksPassed = 0;
  let checksFailed = 0;

  if (!fs.existsSync(reportJsonPath)) {
    return {
      target: reportJsonPath,
      isValid: false,
      issues: [{ checkId: 'FILE_NOT_FOUND', severity: 'FATAL', message: `Report JSON not found: ${reportJsonPath}` }],
      checksPassed: 0,
      checksFailed: 1,
    };
  }

  const rawJson = fs.readFileSync(reportJsonPath, 'utf-8');
  let report: any;
  try {
    report = JSON.parse(rawJson);
  } catch (err: any) {
    return {
      target: reportJsonPath,
      isValid: false,
      issues: [{ checkId: 'INVALID_JSON', severity: 'FATAL', message: `Malformed JSON: ${err.message}` }],
      checksPassed: 0,
      checksFailed: 1,
    };
  }

  // CHECK 1: PDF byte hash validation if PDF is provided
  if (pdfPath && fs.existsSync(pdfPath)) {
    const pdfBytes = fs.readFileSync(pdfPath);
    const actualPdfHash = computeSha256(pdfBytes);
    if (pdfBytes.byteLength < 1000) {
      issues.push({ checkId: 'PDF_TOO_SMALL', severity: 'FATAL', message: `PDF byteLength too small (${pdfBytes.byteLength})` });
      checksFailed++;
    } else if (pdfBytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
      issues.push({ checkId: 'INVALID_PDF_CONTENT', severity: 'FATAL', message: 'PDF file is corrupted, too small, or missing %PDF- magic header' });
      checksFailed++;
    } else {
      checksPassed++;
    }

    if (report.integrityProof?.pdfSha256) {
      if (actualPdfHash !== report.integrityProof.pdfSha256) {
        issues.push({
          checkId: 'PDF_HASH_MISMATCH',
          severity: 'FATAL',
          message: `PDF byte hash (${actualPdfHash}) does not match integrityProof.pdfSha256 (${report.integrityProof.pdfSha256})`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }
  }

  // CHECK 2: Merkle Root & Leaf Consistency
  if (report.merkleRoot) {
    const merkleCheck = verifyMerkleRoot(report);
    if (!merkleCheck.matches) {
      issues.push({ checkId: 'MERKLE_ROOT_MISMATCH', severity: 'FATAL', message: `Report merkleRoot ${report.merkleRoot} does not match computed root ${merkleCheck.root}` });
      checksFailed++;
    } else {
      checksPassed++;
    }
  }

  // CHECK 3: Reviewer Truth Model (NO SYNTHETIC REVIEWERS)
  const reviewerState = report.humanReviewSignOff;
  if (reviewerState) {
    const identity = (reviewerState.auditorIdentity || '').toLowerCase();
    const clearance = (reviewerState.clearanceLevel || '').toLowerCase();
    const forbidden = ['principal auditor', 'lead auditor', 'automation council', 'independent reviewer'];
    if (forbidden.some((f) => identity.includes(f) || clearance.includes(f))) {
      issues.push({
        checkId: 'SYNTHETIC_REVIEWER_DETECTED',
        severity: 'FATAL',
        message: `Forbidden synthetic reviewer claim found: "${reviewerState.auditorIdentity}"`,
      });
      checksFailed++;
    } else {
      checksPassed++;
    }

    if (reviewerState.signOffStatus === 'HUMAN_REVIEWED' && (!reviewerState.signatureDigest || reviewerState.signatureDigest === 'NONE')) {
      issues.push({
        checkId: 'UNLINKED_HUMAN_REVIEW',
        severity: 'FATAL',
        message: 'Claimed HUMAN_REVIEWED without cryptographic signature digest.',
      });
      checksFailed++;
    } else {
      checksPassed++;
    }
  }

  // CHECK 4: Zero Mock & Template Leakage
  const fullText = rawJson;
  const forbiddenPatterns = [
    /Velm[èe]re Guard/i,
    /Level-3 Lead Cryptographic/i,
    /Lorem ipsum/i,
    /SAMPLE_PLACEHOLDER/i,
    /TODO:\s*replace/i,
  ];
  for (const pat of forbiddenPatterns) {
    if (pat.test(fullText)) {
      issues.push({
        checkId: 'FORBIDDEN_SYNTHETIC_PATTERN',
        severity: 'FATAL',
        message: `Report contains forbidden synthetic pattern: ${pat.source}`,
      });
      checksFailed++;
    } else {
      checksPassed++;
    }
  }

  // CHECK 5: Generic Attack Path Reachability
  const isRouter =
    (report.target?.contractName || '').toLowerCase().includes('router') ||
    (report.target?.tokenSymbol || '').toLowerCase().includes('router');
  const isProxy = Boolean(
    report.verdict?.proxyDetails ||
    (report.target?.proxyPattern && report.target.proxyPattern.toLowerCase().includes('proxy')) ||
    (report.auditScopeManifest?.targetSpec?.proxyType &&
      report.auditScopeManifest.targetSpec.proxyType.toLowerCase().includes('proxy') &&
      !report.auditScopeManifest.targetSpec.proxyType.toLowerCase().includes('non-proxy'))
  );
  if (report.attackPathAnalysis?.synthesizedAttackPaths) {
    for (const p of report.attackPathAnalysis.synthesizedAttackPaths) {
      if (p.id === 'VLM-PATH-01' && !isRouter) {
        issues.push({
          checkId: 'GENERIC_ATTACK_PATH_AMM',
          severity: 'FATAL',
          message: 'Mempool Sandwich attack path emitted on non-router/non-AMM contract.',
        });
        checksFailed++;
      } else if (p.id === 'VLM-PATH-02' && !isProxy) {
        issues.push({
          checkId: 'GENERIC_ATTACK_PATH_PROXY',
          severity: 'FATAL',
          message: 'Proxy implementation rollback attack path emitted on non-proxy contract.',
        });
        checksFailed++;
      } else if (typeof p.exploitabilityScore === 'number' && (p.exploitabilityScore < 0 || p.exploitabilityScore > 100)) {
        issues.push({
          checkId: 'INVALID_ATTACK_PATH_SCORE',
          severity: 'FATAL',
          message: `Attack path ${p.id} has out of bounds exploitabilityScore: ${p.exploitabilityScore}`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }
  }

  // CHECK 6: Stop-Sell Gate Enforcement
  const findings = report.sections?.flatMap((s: any) => s.data?.findings || []) || [];
  const hasCriticalOpen = findings.some((f: any) => f.severity === 'critical' && f.remediationState !== 'verified');
  if (hasCriticalOpen && !report.verdict?.stopSellActive) {
    issues.push({
      checkId: 'STOP_SELL_GATE_VIOLATION',
      severity: 'FATAL',
      message: 'Critical finding is active, but stopSellActive is false!',
    });
    checksFailed++;
  } else {
    checksPassed++;
  }

  // CHECK 7: Locked Section & Rights-State Integrity
  if (Array.isArray(report.sections)) {
    for (const sec of report.sections) {
      if (sec.isLocked && sec.data !== null && Object.keys(sec.data).length > 0) {
        issues.push({
          checkId: 'LOCKED_SECTION_DATA_LEAK',
          severity: 'FATAL',
          message: `Locked section ${sec.id} leaked data payload!`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }
  }

  // CHECK 8: Findings Structure, Severity, Evidence & Remediation
  if (Array.isArray(report.sections)) {
    for (const sec of report.sections) {
      if (sec.data?.findings) {
        for (const finding of sec.data.findings) {
          if (!finding.id || !finding.title || !finding.description) {
            issues.push({
              checkId: 'FINDING_STRUCTURE_CORRUPTED',
              severity: 'FATAL',
              message: `Finding ${finding.id || 'UNKNOWN'} is missing required title or description.`,
            });
            checksFailed++;
          } else {
            checksPassed++;
          }

          const validSeverities = ['critical', 'high', 'medium', 'low', 'informational'];
          if (!finding.severity || !validSeverities.includes(finding.severity)) {
            issues.push({
              checkId: 'INVALID_SEVERITY_LEVEL',
              severity: 'FATAL',
              message: `Invalid finding severity: "${finding.severity}". Allowed: ${validSeverities.join(', ')}`,
            });
            checksFailed++;
          } else {
            checksPassed++;
          }

          if (!finding.evidenceId || finding.evidenceId.trim().length === 0 || finding.evidenceId.startsWith('mock:')) {
            issues.push({
              checkId: 'MISSING_EVIDENCE_ID',
              severity: 'FATAL',
              message: `Finding ${finding.id} missing traceable evidenceId.`,
            });
            checksFailed++;
          } else {
            checksPassed++;
          }

          if (
            !finding.evidence ||
            finding.evidence.trim().length === 0 ||
            /^(TODO|mock|synthetic|fixture)/i.test(finding.evidence.trim())
          ) {
            issues.push({
              checkId: 'EMPTY_EVIDENCE_PAYLOAD',
              severity: 'FATAL',
              message: `Finding ${finding.id} lacks concrete evidence payload.`,
            });
            checksFailed++;
          } else {
            checksPassed++;
          }

          if (finding.remediationState) {
            const validRemediations = ['verified', 'recommended', 'unresolved', 'applied', 'mitigated', 'open'];
            if (!validRemediations.includes(finding.remediationState)) {
              issues.push({
                checkId: 'INVALID_REMEDIATION_STATE',
                severity: 'FATAL',
                message: `Finding ${finding.id} has invalid remediation state: ${finding.remediationState}`,
              });
              checksFailed++;
            } else {
              checksPassed++;
            }
          }

          // Cross-target evidence verification
          if (finding.evidenceId && report.reportId) {
            const match = finding.evidenceId.match(/EVD-(?:FIND-)?(rep_[a-zA-Z0-9_]+)-/);
            if (match && match[1] && match[1] !== report.reportId) {
              issues.push({
                checkId: 'CROSS_TARGET_EVIDENCE_LEAKAGE',
                severity: 'FATAL',
                message: `Finding ${finding.id} references foreign evidence ID '${finding.evidenceId}' from another report.`,
              });
              checksFailed++;
            }
          }
        }
      }
    }
  }

  // CHECK 9: Risk, Confidence & Formal Coverage Numeric Bounds
  if (report.verdict) {
    if (
      typeof report.verdict.riskScore !== 'number' ||
      report.verdict.riskScore < 0 ||
      report.verdict.riskScore > 100 ||
      isNaN(report.verdict.riskScore)
    ) {
      issues.push({
        checkId: 'INVALID_RISK_SCORE',
        severity: 'FATAL',
        message: `Risk score must be between 0 and 100, got ${report.verdict.riskScore}.`,
      });
      checksFailed++;
    } else {
      checksPassed++;
    }

    if (report.verdict.confidenceScore !== undefined) {
      if (
        typeof report.verdict.confidenceScore !== 'number' ||
        report.verdict.confidenceScore < 0 ||
        report.verdict.confidenceScore > 100 ||
        isNaN(report.verdict.confidenceScore)
      ) {
        issues.push({
          checkId: 'INVALID_CONFIDENCE_SCORE',
          severity: 'FATAL',
          message: `Confidence score must be between 0 and 100, got ${report.verdict.confidenceScore}.`,
        });
        checksFailed++;
      } else if (report.verdict.confidenceScore > 80 && report.verdict.evidenceCoverage < 50) {
        issues.push({
          checkId: 'CONTRADICTORY_CONFIDENCE_COVERAGE',
          severity: 'FATAL',
          message: `Confidence (${report.verdict.confidenceScore}) cannot exceed 80 when evidence coverage is low (${report.verdict.evidenceCoverage}%).`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }

    if (report.verdict.formalProofCoveragePct !== undefined) {
      if (
        typeof report.verdict.formalProofCoveragePct !== 'number' ||
        report.verdict.formalProofCoveragePct < 0 ||
        report.verdict.formalProofCoveragePct > 100 ||
        isNaN(report.verdict.formalProofCoveragePct)
      ) {
        issues.push({
          checkId: 'INVALID_FORMAL_COVERAGE',
          severity: 'FATAL',
          message: `Formal proof coverage must be between 0 and 100, got ${report.verdict.formalProofCoveragePct}.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }

    if (report.verdict.coverageTuple) {
      for (const [key, val] of Object.entries(report.verdict.coverageTuple)) {
        if (typeof val === 'number' && (val < 0 || val > 100 || isNaN(val))) {
          issues.push({
            checkId: 'INVALID_COVERAGE_TUPLE_METRIC',
            severity: 'FATAL',
            message: `Coverage tuple metric ${key} is out of bounds [0, 100]: ${val}`,
          });
          checksFailed++;
        } else {
          checksPassed++;
        }
      }
    }
  }

  // CHECK 10: Snapshot Provenance (Block Number, Block Hash, Bytecode Hash, Engine Version, Execution State)
  if (report.verdict?.snapshotProvenance) {
    const prov = report.verdict.snapshotProvenance;
    if (prov.snapshotBlockNumber !== undefined) {
      if (
        typeof prov.snapshotBlockNumber !== 'number' ||
        prov.snapshotBlockNumber <= 0 ||
        !Number.isInteger(prov.snapshotBlockNumber)
      ) {
        issues.push({
          checkId: 'INVALID_SNAPSHOT_BLOCK_NUMBER',
          severity: 'FATAL',
          message: `Snapshot block number must be a positive integer, got ${prov.snapshotBlockNumber}.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }

    if (prov.snapshotBlockHash !== undefined) {
      const isHexHash = /^(?:0x)?[0-9a-fA-F]{64}$/.test(prov.snapshotBlockHash);
      const isNativeHash = /^[0-9a-zA-Z]{32,64}$/.test(prov.snapshotBlockHash);
      if (typeof prov.snapshotBlockHash !== 'string' || (!isHexHash && !isNativeHash)) {
        issues.push({
          checkId: 'INVALID_BLOCK_HASH_FORMAT',
          severity: 'FATAL',
          message: `Snapshot block hash must be 32-byte hex or native blockchain block hash, got ${prov.snapshotBlockHash}.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }

    if (prov.runtimeBytecodeSha256 !== undefined) {
      const cleanHash = prov.runtimeBytecodeSha256.replace(/^sha256:/, '').replace(/^0x/, '');
      if (!/^[0-9a-fA-F]{64}$/.test(cleanHash)) {
        issues.push({
          checkId: 'INVALID_BYTECODE_HASH',
          severity: 'FATAL',
          message: `Runtime bytecode hash must be valid SHA256 hex digest, got '${prov.runtimeBytecodeSha256}'.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }

    if (prov.reproducibilityStatus !== undefined) {
      if (prov.reproducibilityStatus !== 'DETERMINISTIC_REPRODUCIBLE') {
        issues.push({
          checkId: 'INVALID_EXECUTION_STATE',
          severity: 'FATAL',
          message: `Invalid reproducibility status: '${prov.reproducibilityStatus}'. Must be DETERMINISTIC_REPRODUCIBLE.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }

    if (prov.analysisEngineVersion !== undefined) {
      if (typeof prov.analysisEngineVersion !== 'string' || !/^v?\d+\.\d+\.\d+/.test(prov.analysisEngineVersion)) {
        issues.push({
          checkId: 'INVALID_DETECTOR_VERSION',
          severity: 'FATAL',
          message: `Analysis engine version '${prov.analysisEngineVersion}' must follow release semantic versioning.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }
  }

  // CHECK 11: Target Address & Target Name Substitution
  if (report.target?.contractAddress) {
    const addr = report.target.contractAddress;
    if (addr.startsWith('0x')) {
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr) || isPlaceholderAddress(addr)) {
        issues.push({
          checkId: 'INVALID_TARGET_ADDRESS',
          severity: 'FATAL',
          message: `Synthetic placeholder target address '${addr}' is prohibited in verified reports.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }

    const addrLower = addr.toLowerCase();
    const name = report.target.contractName || '';
    const sym = report.target.tokenSymbol || '';

    if (addrLower === '0xdac17f958d2ee523a2206206994597c13d831ec7') {
      if (
        (name && !name.toLowerCase().includes('tether') && !name.toLowerCase().includes('usdt')) ||
        (sym && sym.toUpperCase() !== 'USDT')
      ) {
        issues.push({
          checkId: 'TARGET_NAME_SUBSTITUTION',
          severity: 'FATAL',
          message: `Target contract name '${name}' / symbol '${sym}' does not match USDT address '${report.target.contractAddress}'.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    } else if (addrLower === '0x6b175474e89094c44da98b954eedeac495271d0f') {
      if ((name && !name.toLowerCase().includes('dai')) || (sym && sym.toUpperCase() !== 'DAI')) {
        issues.push({
          checkId: 'TARGET_NAME_SUBSTITUTION',
          severity: 'FATAL',
          message: `Target contract name '${name}' / symbol '${sym}' does not match DAI address '${report.target.contractAddress}'.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }
  }

  // CHECK 12: Scope Manifest Consistency
  if (report.auditScopeManifest?.targetSpec && report.target) {
    const manifestSpec = report.auditScopeManifest.targetSpec;
    if (manifestSpec.contractAddress && report.target.contractAddress) {
      if (manifestSpec.contractAddress.toLowerCase() !== report.target.contractAddress.toLowerCase()) {
        issues.push({
          checkId: 'AUDIT_SCOPE_MISMATCH',
          severity: 'FATAL',
          message: 'Scope manifest contractAddress does not match report target address.',
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }
  }

  // CHECK 13: Tier Entitlement Monotonicity
  const validTiers = ['basic', 'pro', 'advanced'];
  const tierOrder: Record<string, number> = { basic: 1, pro: 2, advanced: 3 };
  if (report.clientEntitlementTier && !validTiers.includes(report.clientEntitlementTier)) {
    issues.push({
      checkId: 'INVALID_ENTITLEMENT_TIER',
      severity: 'FATAL',
      message: `Invalid clientEntitlementTier: '${report.clientEntitlementTier}'. Allowed: ${validTiers.join(', ')}`,
    });
    checksFailed++;
  } else if (report.clientEntitlementTier) {
    const userRank = tierOrder[report.clientEntitlementTier];
    for (const sec of report.sections || []) {
      const requiredRank = tierOrder[sec.requiredTier];
      if (requiredRank && requiredRank > userRank && !sec.isLocked) {
        issues.push({
          checkId: 'TIER_ENTITLEMENT_VIOLATION',
          severity: 'FATAL',
          message: `Section '${sec.id}' requires tier '${sec.requiredTier}' but was unlocked for user tier '${report.clientEntitlementTier}'.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }
  }

  // CHECK 14: Locale Integrity & Contamination
  const validLocales = ['en', 'pl', 'de'];
  if (report.locale && !validLocales.includes(report.locale)) {
    issues.push({
      checkId: 'INVALID_LOCALE',
      severity: 'FATAL',
      message: `Invalid locale '${report.locale}'. Allowed: ${validLocales.join(', ')}`,
    });
    checksFailed++;
  } else if (report.locale === 'en') {
    const polishCharOrWordRegex =
      /[ąćęłńóśźż]|\b(Podsumowanie|Przegląd|Ustalenia|Ryzyko|Weryfikacja|Zgodność|Raport)\b/i;
    for (const sec of report.sections || []) {
      if (polishCharOrWordRegex.test(sec.title || '')) {
        issues.push({
          checkId: 'LOCALE_CONTAMINATION',
          severity: 'FATAL',
          message: `Report marked as 'en' contains localized text from another language: '${sec.title}'`,
        });
        checksFailed++;
        break;
      }
    }
  }

  // CHECK 15: Timestamp Plausibility
  if (report.createdAt) {
    const reportTime = new Date(report.createdAt).getTime();
    const now = Date.now();
    if (isNaN(reportTime) || reportTime > now + 5 * 60 * 1000) {
      issues.push({
        checkId: 'INVALID_TIMESTAMP',
        severity: 'FATAL',
        message: `Report timestamp is in the future: ${report.createdAt}`,
      });
      checksFailed++;
    } else {
      checksPassed++;
    }
  }

  // CHECK 16: Provider / Source Consistency
  if (report.target) {
    const chainId = String(report.target.chainId || '');
    const network = (report.target.network || '').toLowerCase();
    if (
      chainId === '1' &&
      (network.includes('binance') ||
        network.includes('bsc') ||
        network.includes('polygon') ||
        network.includes('solana'))
    ) {
      issues.push({
        checkId: 'UNTRUSTED_PROVIDER_SOURCE',
        severity: 'FATAL',
        message: `Target network '${report.target.network}' is contradictory to chainId '${report.target.chainId}'.`,
      });
      checksFailed++;
    } else {
      checksPassed++;
    }
  }

  // CHECK 17: Fuzz Count & Dynamic Iteration Bounds
  if (report.dynamicExecutionRecord?.fuzzIterationCount !== undefined) {
    const runs = report.dynamicExecutionRecord.fuzzIterationCount;
    if (typeof runs !== 'number' || runs < 0 || runs > 10000000 || !Number.isInteger(runs)) {
      issues.push({
        checkId: 'INVALID_FUZZ_ITERATION_COUNT',
        severity: 'FATAL',
        message: `Fuzz iteration count must be non-negative integer <= 10,000,000, got: ${runs}`,
      });
      checksFailed++;
    } else {
      checksPassed++;
    }
  }

  // CHECK 18: Formal SMT Solver Result Consistency
  if (Array.isArray(report.formalProofProperties)) {
    for (const prop of report.formalProofProperties) {
      if ((prop.result === 'PROVEN' || prop.result === 'UNSAT') && prop.counterexample) {
        issues.push({
          checkId: 'FORMAL_SOLVER_RESULT_CONTRADICTION',
          severity: 'FATAL',
          message: `Formal property '${prop.propertyId}' claims PROVEN/UNSAT but contains a counterexample model.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }
  }

  // CHECK 19: Formal Proof Hash Integrity
  if (Array.isArray(report.formalProofProperties)) {
    const hex64Regex = /^(0x)?[0-9a-fA-F]{64}$/;
    for (const prop of report.formalProofProperties) {
      if (prop.proofHash && !hex64Regex.test(prop.proofHash.replace(/^sha256:/, ''))) {
        issues.push({
          checkId: 'INVALID_FORMAL_PROOF_HASH',
          severity: 'FATAL',
          message: `Formal proof hash for property '${prop.propertyId}' must be valid 64-hex SHA-256 digest, got: '${prop.proofHash}'`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }
  }

  // CHECK 20: Source Code Hash & Bytecode Binding
  if (report.snapshotProvenance?.sourceCodeSha256) {
    const hex64Regex = /^(0x)?[0-9a-fA-F]{64}$/;
    const srcHash = report.snapshotProvenance.sourceCodeSha256.replace(/^sha256:/, '');
    if (!hex64Regex.test(srcHash)) {
      issues.push({
        checkId: 'INVALID_SOURCE_CODE_HASH',
        severity: 'FATAL',
        message: `Source code hash must be valid 64-hex SHA-256 digest, got: '${report.snapshotProvenance.sourceCodeSha256}'`,
      });
      checksFailed++;
    } else {
      checksPassed++;
    }
  }

  // CHECK 21: System Deployment Graph Integrity
  if (report.systemDeploymentGraph) {
    const g = report.systemDeploymentGraph;
    if (g.rootAddress && report.target?.contractAddress) {
      if (g.rootAddress.toLowerCase() !== report.target.contractAddress.toLowerCase()) {
        issues.push({
          checkId: 'SYSTEM_GRAPH_ROOT_MISMATCH',
          severity: 'FATAL',
          message: `SystemDeploymentGraph rootAddress '${g.rootAddress}' does not match target address '${report.target.contractAddress}'.`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }
  }

  // CHECK 22: Dependency Address Integrity
  if (Array.isArray(report.auditScopeManifest?.peripheralDependencies)) {
    const zeroAddr = '0x0000000000000000000000000000000000000000';
    for (const dep of report.auditScopeManifest.peripheralDependencies) {
      const addr = typeof dep === 'string' ? dep : dep.address;
      if (addr === zeroAddr || (addr && !/^0x[0-9a-fA-F]{40}$/.test(addr))) {
        issues.push({
          checkId: 'MALFORMED_DEPENDENCY_ADDRESS',
          severity: 'FATAL',
          message: `Peripheral dependency address is zero-address or malformed: '${addr}'`,
        });
        checksFailed++;
      } else {
        checksPassed++;
      }
    }
  }

  // CHECK 23: Canonical Semantic Artifact Binding
  if (report.integrityProof?.canonicalArtifactSha256) {
    const hex64Regex = /^(0x)?[0-9a-fA-F]{64}$/;
    const cHash = report.integrityProof.canonicalArtifactSha256.replace(/^sha256:/, '');
    if (!hex64Regex.test(cHash)) {
      issues.push({
        checkId: 'CANONICAL_ARTIFACT_HASH_MISMATCH',
        severity: 'FATAL',
        message: `Canonical semantic artifact hash must be valid 64-hex digest, got: '${report.integrityProof.canonicalArtifactSha256}'`,
      });
      checksFailed++;
    } else {
      checksPassed++;
    }
  }

  // CHECK 24: Provider Rights Enforcement
  if (report.dataRights?.rightsStatus === 'BLOCKED' && report.dataRights?.exportPermitted === true) {
    issues.push({
      checkId: 'UNLAWFUL_RIGHTS_EXPORT',
      severity: 'FATAL',
      message: 'Provider rights status is BLOCKED but exportPermitted is true.',
    });
    checksFailed++;
  } else {
    checksPassed++;
  }

  // CHECK 25: Domain Model Strict Firewall (No EVM in TradFi / BTC)
  const isTradFi = report.target?.domain === 'real_markets' || report.target?.targetType === 'TRADFI_INSTRUMENT';
  if (isTradFi) {
    if (report.auditScopeManifest?.compilerSpec !== undefined || report.verdict?.snapshotProvenance?.runtimeBytecodeSha256 !== undefined) {
      issues.push({
        checkId: 'DOMAIN_FIREWALL_EVM_CONTAMINATION',
        severity: 'FATAL',
        message: 'TradFi instrument record contaminated with EVM compiler or runtime bytecode specifications.',
      });
      checksFailed++;
    } else {
      checksPassed++;
    }
  }

  // CHECK 26: Timestamp Monotonicity & Snapshot Skew
  if (report.snapshotProvenance?.blockTimestamp && report.createdAt) {
    const snapTime = new Date(report.snapshotProvenance.blockTimestamp).getTime();
    const createTime = new Date(report.createdAt).getTime();
    if (!isNaN(snapTime) && !isNaN(createTime) && snapTime > createTime + 60 * 1000) {
      issues.push({
        checkId: 'SNAPSHOT_TIMESTAMP_SKEW',
        severity: 'FATAL',
        message: `Snapshot block timestamp (${report.snapshotProvenance.blockTimestamp}) is later than report createdAt (${report.createdAt}).`,
      });
      checksFailed++;
    } else {
      checksPassed++;
    }
  }

  const isValid = issues.filter((i) => i.severity === 'FATAL').length === 0;
  return {
    target: report.reportId || reportJsonPath,
    isValid,
    issues,
    checksPassed,
    checksFailed,
  };
}

/**
 * 40-Point Adversarial Mutation Suite (MUT-01 to MUT-40, Velmère Furnace V6)
 */
export function runMutationSuite(): MutationTestResult[] {
  const baseFixture = {
    schemaVersion: 'velmere.canonical-audit-report.v1',
    reportId: 'rep_mutation_fixture',
    locale: 'en',
    clientEntitlementTier: 'advanced',
    createdAt: new Date().toISOString(),
    target: {
      contractName: 'Tether USD (USDT)',
      contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      network: 'Ethereum Mainnet',
      chainId: '1',
      tokenSymbol: 'USDT',
    },
    verdict: {
      riskScore: 32,
      riskLabel: 'MODERATE_RISK',
      confidenceScore: 90,
      evidenceCoverage: 88,
      verificationStatus: 'FORMALLY_VERIFIED',
      releaseDecision: 'PASS',
      stopSellActive: false,
      formalProofCoveragePct: 86.4,
      coverageTuple: {
        bytecodeInstructionsPct: 96,
        reachableCFGEdgesPct: 94,
        functionsPct: 100,
        detectorsExecutedPct: 100,
        stateVariablesPct: 95,
        formalPropertiesPct: 86,
      },
      snapshotProvenance: {
        snapshotBlockNumber: 4634748,
        snapshotBlockHash: '0x4e3a3754410177e6937ef1f84bba68ea139e8d1a2258c5f85db9f3b722760b7f',
        runtimeBytecodeSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        analysisEngineVersion: 'v4.0.0-rc3',
        reproducibilityStatus: 'DETERMINISTIC_REPRODUCIBLE',
      },
    },
    sections: [
      {
        id: 'overview',
        title: 'Executive Summary',
        subtitle: 'Overview',
        requiredTier: 'basic',
        isLocked: false,
        sampleSummaryLines: ['Valid contract audit.'],
        data: {
          paragraphs: ['Valid contract audit.'],
          findings: [
            {
              id: 'VLM-USDT-01',
              title: 'Legacy Solidity Compiler',
              description: 'Contract compiled with legacy version.',
              severity: 'low',
              category: 'Compiler',
              evidence: 'pragma solidity ^0.4.17;',
              evidenceId: 'EVD-FIND-rep_mutation_fixture-VLM-USDT-01',
              claimId: 'CLM-FIND-rep_mutation_fixture-VLM-USDT-01',
              remediationState: 'recommended',
              requiredTier: 'basic',
            },
          ],
        },
      },
    ],
    auditScopeManifest: {
      targetSpec: {
        chainId: '1',
        blockNumber: 4634748,
        contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        network: 'Ethereum Mainnet',
      },
      analysisDimensions: {
        staticGraph: true,
        dynamicSimulation: true,
        formalVerification: true,
        economicMevInspection: false,
      },
    },
    attackPathAnalysis: { synthesizedAttackPaths: [] },
    humanReviewSignOff: {
      auditorIdentity: 'NONE (Automated Security Engine)',
      clearanceLevel: 'AUTOMATED_ONLY',
      inspectionDate: '—',
      signOffStatus: 'AUTOMATED_ONLY',
      signatureDigest: 'NONE',
    },
    integrityProof: {
      pdfSha256: '',
      pdfByteLength: 2048,
      pageCount: 3,
      verifiedAt: new Date().toISOString(),
    },
    merkleRoot: '',
  };

  const tempJsonPath = path.join(process.cwd(), 'artifacts', 'temp_mutation_fixture.json');
  const tempPdfPath = path.join(process.cwd(), 'artifacts', 'temp_mutation_fixture.pdf');
  const validPdfBytes = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(2039, 0x25)]);
  fs.writeFileSync(tempPdfPath, validPdfBytes);

  baseFixture.integrityProof.pdfSha256 = computeSha256(validPdfBytes);
  baseFixture.merkleRoot = verifyMerkleRoot(baseFixture).root;

  const runTestOnMutation = (mutated: any, mutatePdf?: boolean): { caught: boolean; reason?: string } => {
    fs.writeFileSync(tempJsonPath, JSON.stringify(mutated, null, 2));
    const result = verifyAuditArtifact(tempJsonPath, mutatePdf ? undefined : tempPdfPath);
    if (!result.isValid) {
      return { caught: true, reason: result.issues[0]?.message };
    }
    return { caught: false };
  };

  const suite: Array<{ id: string; desc: string; mutate: () => { caught: boolean; reason?: string } }> = [
    // 1 finding mutation
    {
      id: 'MUT-01',
      desc: '1 finding mutation: omit required finding title or structure',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        delete c.sections[0].data.findings[0].title;
        return runTestOnMutation(c);
      },
    },
    // 2 risk mutation
    {
      id: 'MUT-02',
      desc: '2 risk mutation: risk score out of bounds',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.verdict.riskScore = 150;
        return runTestOnMutation(c);
      },
    },
    // 3 severity mutation
    {
      id: 'MUT-03',
      desc: '3 severity mutation: invalid finding severity level',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.sections[0].data.findings[0].severity = 'catastrophic';
        return runTestOnMutation(c);
      },
    },
    // 4 confidence mutation
    {
      id: 'MUT-04',
      desc: '4 confidence mutation: contradictory high confidence with low evidence coverage',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.verdict.confidenceScore = 95;
        c.verdict.evidenceCoverage = 20;
        return runTestOnMutation(c);
      },
    },
    // 5 formal coverage mutation
    {
      id: 'MUT-05',
      desc: '5 formal coverage mutation: formal proof coverage out of bounds',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.verdict.formalProofCoveragePct = 120;
        return runTestOnMutation(c);
      },
    },
    // 6 property result mutation
    {
      id: 'MUT-06',
      desc: '6 property result mutation: coverage tuple metric out of bounds',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.verdict.coverageTuple.functionsPct = 150;
        return runTestOnMutation(c);
      },
    },
    // 7 evidence ID mutation
    {
      id: 'MUT-07',
      desc: '7 evidence ID mutation: missing traceable evidence ID',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.sections[0].data.findings[0].evidenceId = '';
        return runTestOnMutation(c);
      },
    },
    // 8 evidence payload mutation
    {
      id: 'MUT-08',
      desc: '8 evidence payload mutation: empty or placeholder evidence payload',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.sections[0].data.findings[0].evidence = 'TODO: add evidence payload';
        return runTestOnMutation(c);
      },
    },
    // 9 block number mutation
    {
      id: 'MUT-09',
      desc: '9 block number mutation: non-positive snapshot block number',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.verdict.snapshotProvenance.snapshotBlockNumber = -100;
        c.merkleRoot = verifyMerkleRoot(c).root;
        return runTestOnMutation(c);
      },
    },
    // 10 block hash mutation
    {
      id: 'MUT-10',
      desc: '10 block hash mutation: malformed snapshot block hash',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.verdict.snapshotProvenance.snapshotBlockHash = '0xinvalid_block_hash';
        c.merkleRoot = verifyMerkleRoot(c).root;
        return runTestOnMutation(c);
      },
    },
    // 11 address mutation
    {
      id: 'MUT-11',
      desc: '11 address mutation: synthetic placeholder contract address',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.target.contractAddress = '0x1111111111111111111111111111111111111111';
        c.merkleRoot = verifyMerkleRoot(c).root;
        return runTestOnMutation(c);
      },
    },
    // 12 bytecode hash mutation
    {
      id: 'MUT-12',
      desc: '12 bytecode hash mutation: malformed runtime bytecode hash',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.verdict.snapshotProvenance.runtimeBytecodeSha256 = '0xmutated_hash';
        c.merkleRoot = verifyMerkleRoot(c).root;
        return runTestOnMutation(c);
      },
    },
    // 13 execution state mutation
    {
      id: 'MUT-13',
      desc: '13 execution state mutation: invalid reproducibility status',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.verdict.snapshotProvenance.reproducibilityStatus = 'NON_DETERMINISTIC';
        return runTestOnMutation(c);
      },
    },
    // 14 detector version mutation
    {
      id: 'MUT-14',
      desc: '14 detector version mutation: unversioned detector/engine release tag',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.verdict.snapshotProvenance.analysisEngineVersion = 'unversioned_dev';
        return runTestOnMutation(c);
      },
    },
    // 15 timestamp mutation
    {
      id: 'MUT-15',
      desc: '15 timestamp mutation: future createdAt timestamp',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.createdAt = '2099-01-01T00:00:00.000Z';
        return runTestOnMutation(c);
      },
    },
    // 16 scope mutation
    {
      id: 'MUT-16',
      desc: '16 scope mutation: target specification address mismatch in audit scope manifest',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.auditScopeManifest.targetSpec.contractAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
        return runTestOnMutation(c);
      },
    },
    // 17 tier mutation
    {
      id: 'MUT-17',
      desc: '17 tier mutation: tier entitlement violation with unlocked higher-tier section',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.clientEntitlementTier = 'basic';
        c.sections.push({
          id: 'adv_formal',
          title: 'Formal Invariants',
          subtitle: 'Formal',
          requiredTier: 'advanced',
          isLocked: false,
          sampleSummaryLines: ['sample'],
          data: null,
        });
        c.merkleRoot = verifyMerkleRoot(c).root;
        return runTestOnMutation(c);
      },
    },
    // 18 locale contamination
    {
      id: 'MUT-18',
      desc: '18 locale contamination: Polish language text leaking into English report',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.locale = 'en';
        c.sections[0].title = 'Podsumowanie wykonawcze z załącznikami';
        c.merkleRoot = verifyMerkleRoot(c).root;
        return runTestOnMutation(c);
      },
    },
    // 19 PDF content mutation
    {
      id: 'MUT-19',
      desc: '19 PDF content mutation: truncated PDF byte stream or missing %PDF- header',
      mutate: () => {
        const tinyPdfPath = path.join(process.cwd(), 'artifacts', 'temp_tiny.pdf');
        fs.writeFileSync(tinyPdfPath, Buffer.alloc(100, 0x25));
        const c = JSON.parse(JSON.stringify(baseFixture));
        fs.writeFileSync(tempJsonPath, JSON.stringify(c, null, 2));
        const res = verifyAuditArtifact(tempJsonPath, tinyPdfPath);
        if (fs.existsSync(tinyPdfPath)) fs.unlinkSync(tinyPdfPath);
        return { caught: !res.isValid, reason: res.issues[0]?.message };
      },
    },
    // 20 JSON/PDF mismatch
    {
      id: 'MUT-20',
      desc: '20 JSON/PDF mismatch: PDF byte hash does not match integrityProof.pdfSha256',
      mutate: () => {
        const mismatchPdfPath = path.join(process.cwd(), 'artifacts', 'temp_mismatch.pdf');
        fs.writeFileSync(mismatchPdfPath, Buffer.concat([Buffer.from('%PDF-1.7\nTAMPERED_PDF_PAYLOAD'), Buffer.alloc(2000, 0x41)]));
        const c = JSON.parse(JSON.stringify(baseFixture));
        fs.writeFileSync(tempJsonPath, JSON.stringify(c, null, 2));
        const res = verifyAuditArtifact(tempJsonPath, mismatchPdfPath);
        if (fs.existsSync(mismatchPdfPath)) fs.unlinkSync(mismatchPdfPath);
        return { caught: !res.isValid, reason: res.issues[0]?.message };
      },
    },
    // 21 Merkle leaf mutation
    {
      id: 'MUT-21',
      desc: '21 Merkle leaf mutation: tampered section contents without root recomputation',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.sections[0].sampleSummaryLines = ['Tampered summary line'];
        return runTestOnMutation(c);
      },
    },
    // 22 Merkle root manipulation
    {
      id: 'MUT-22',
      desc: '22 Merkle root manipulation: corrupted Merkle root hash',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.merkleRoot = '0xbad_merkle_root_hash';
        return runTestOnMutation(c);
      },
    },
    // 23 reviewer claim mutation
    {
      id: 'MUT-23',
      desc: '23 reviewer claim mutation: synthetic auditor identity injected',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.humanReviewSignOff.auditorIdentity = 'Velmère Institutional Principal Auditor';
        return runTestOnMutation(c);
      },
    },
    // 24 attack-path node mutation
    {
      id: 'MUT-24',
      desc: '24 attack-path node mutation: Mempool Sandwich vector on non-router/non-AMM target',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.target.contractName = 'DAI Stablecoin';
        c.target.tokenSymbol = 'DAI';
        c.attackPathAnalysis.synthesizedAttackPaths = [{ id: 'VLM-PATH-01', vectorTitle: 'Mempool Sandwich' }];
        return runTestOnMutation(c);
      },
    },
    // 25 remediation mutation
    {
      id: 'MUT-25',
      desc: '25 remediation mutation: critical finding active without stop-sell enforcement',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.sections[0].data.findings = [{
          id: 'VLM-CRIT-01',
          title: 'Critical Vault Drain',
          description: 'Reentrancy drain',
          severity: 'critical',
          evidence: 'raw exploit trace',
          evidenceId: 'EVD-FIND-rep_mutation_fixture-VLM-CRIT-01',
          remediationState: 'open',
          requiredTier: 'basic',
        }];
        c.verdict.stopSellActive = false;
        return runTestOnMutation(c);
      },
    },
    // 26 provider/source mutation
    {
      id: 'MUT-26',
      desc: '26 provider/source mutation: contradictory network and chain ID provider specification',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.target.chainId = '1';
        c.target.network = 'Binance Smart Chain Mainnet';
        return runTestOnMutation(c);
      },
    },
    // 27 rights-state mutation
    {
      id: 'MUT-27',
      desc: '27 rights-state mutation: confidential data payload leaked inside locked section',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.sections.push({
          id: 'pro_mev',
          title: 'MEV Analysis',
          subtitle: 'MEV',
          requiredTier: 'pro',
          isLocked: true,
          sampleSummaryLines: ['sample'],
          data: { leakedSecret: 'paid_finding_content' },
        });
        c.merkleRoot = verifyMerkleRoot(c).root;
        return runTestOnMutation(c);
      },
    },
    // 28 target-name substitution
    {
      id: 'MUT-28',
      desc: '28 target-name substitution: substituted contract name and symbol for target address',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.target.contractAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';
        c.target.contractName = 'Wrapped BTC (WBTC)';
        c.target.tokenSymbol = 'WBTC';
        return runTestOnMutation(c);
      },
    },
    // 29 cross-target evidence injection
    {
      id: 'MUT-29',
      desc: '29 cross-target evidence injection: foreign report evidence ID injected into target finding',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.sections[0].data.findings[0].evidenceId = 'EVD-FIND-rep_dai_advanced_001-VLM-DAI-01';
        return runTestOnMutation(c);
      },
    },
    // 30 generic template injection
    {
      id: 'MUT-30',
      desc: '30 generic template injection: forbidden synthetic boilerplate brand "Velmère Guard"',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.sections[0].data.paragraphs.push('Hardened with Velmère Guard');
        return runTestOnMutation(c);
      },
    },
    // 31 fuzz count mutation
    {
      id: 'MUT-31',
      desc: '31 fuzz count mutation: negative or inflated fuzz count (-1000 runs)',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.dynamicExecutionRecord = { fuzzIterationCount: -1000 };
        return runTestOnMutation(c);
      },
    },
    // 32 solver result corruption
    {
      id: 'MUT-32',
      desc: '32 solver result corruption: property marked PROVEN/UNSAT but contains counterexample model',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.formalProofProperties = [
          {
            propertyId: 'VLM-FORMAL-01',
            result: 'PROVEN',
            proofHash: '0x1111222233334444555566667777888899990000111122223333444455556666',
            counterexample: { state: 'attacker_balance_inflated' },
          },
        ];
        return runTestOnMutation(c);
      },
    },
    // 33 proof hash mutation
    {
      id: 'MUT-33',
      desc: '33 proof hash mutation: corrupted non-hex formal proof hash string',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.formalProofProperties = [
          {
            propertyId: 'VLM-FORMAL-01',
            result: 'PROVEN',
            proofHash: 'corrupted-non-hex-proof-hash',
          },
        ];
        return runTestOnMutation(c);
      },
    },
    // 34 source code hash mutation
    {
      id: 'MUT-34',
      desc: '34 source code hash mutation: corrupted source code SHA-256 digest',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.snapshotProvenance = {
          ...c.snapshotProvenance,
          sourceCodeSha256: 'corrupted_source_hash_invalid_length',
        };
        return runTestOnMutation(c);
      },
    },
    // 35 system deployment graph mutation
    {
      id: 'MUT-35',
      desc: '35 system deployment graph mutation: rootAddress mismatches target address',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.systemDeploymentGraph = {
          rootAddress: '0x000000000000000000000000000000000000dead',
          edges: [],
        };
        return runTestOnMutation(c);
      },
    },
    // 36 dependency address mutation
    {
      id: 'MUT-36',
      desc: '36 dependency address mutation: peripheral dependency has zero-address',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.auditScopeManifest = {
          ...c.auditScopeManifest,
          peripheralDependencies: ['0x0000000000000000000000000000000000000000'],
        };
        return runTestOnMutation(c);
      },
    },
    // 37 canonical artifact mutation
    {
      id: 'MUT-37',
      desc: '37 canonical artifact mutation: invalid canonical semantic artifact hash format',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.integrityProof = {
          ...c.integrityProof,
          canonicalArtifactSha256: 'invalid_canonical_hash_length',
        };
        return runTestOnMutation(c);
      },
    },
    // 38 rights state violation
    {
      id: 'MUT-38',
      desc: '38 rights state violation: provider rights status is BLOCKED but exportPermitted is true',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.dataRights = {
          rightsStatus: 'BLOCKED',
          exportPermitted: true,
        };
        return runTestOnMutation(c);
      },
    },
    // 39 domain model contamination
    {
      id: 'MUT-39',
      desc: '39 domain model contamination: TradFi equity target contaminated with EVM compilerSpec',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.target.domain = 'real_markets';
        c.target.targetType = 'TRADFI_INSTRUMENT';
        c.auditScopeManifest = { compilerSpec: { solcVersion: '0.8.20' } };
        return runTestOnMutation(c);
      },
    },
    // 40 timestamp skew mutation
    {
      id: 'MUT-40',
      desc: '40 timestamp skew mutation: snapshot block timestamp post-dates report creation date',
      mutate: () => {
        const c = JSON.parse(JSON.stringify(baseFixture));
        c.createdAt = '2026-09-01T12:00:00.000Z';
        c.snapshotProvenance = {
          ...c.snapshotProvenance,
          blockTimestamp: '2026-10-01T12:00:00.000Z',
        };
        return runTestOnMutation(c);
      },
    },
  ];

  const results: MutationTestResult[] = [];
  for (const test of suite) {
    const outcome = test.mutate();
    results.push({
      mutationId: test.id,
      description: test.desc,
      wasCaught: outcome.caught,
      rejectionReason: outcome.reason,
    });
  }

  // Cleanup temporary test files
  if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
  if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);

  return results;
}

// CLI Execution Entry Point
if (process.argv[1] && process.argv[1].endsWith('verify-audit-artifact.ts')) {
  const args = process.argv.slice(2);
  if (args.includes('--mutation-suite')) {
    console.log('Running 40-Point Adversarial Mutation Suite (Section 29 Master Orchestrator V6)...');
    const results = runMutationSuite();
    const caught = results.filter((r) => r.wasCaught).length;
    console.log(`Mutation Suite Finished: ${caught}/${results.length} mutations successfully caught.`);

    const payload = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalMutations: results.length,
        caughtMutations: caught,
        mutationCatchRatePct: (caught / results.length) * 100,
        results,
      },
      null,
      2
    );

    const outPath = path.join(process.cwd(), 'artifacts', 'mutation_suite_results.json');
    fs.writeFileSync(outPath, payload);
    const finalOutPath = path.join(process.cwd(), 'artifacts', 'FINAL_MUTATION_RESULTS.json');
    fs.writeFileSync(finalOutPath, payload);
    const agent19Path = path.join(process.cwd(), 'artifacts', 'agent19_mutation_results.json');
    fs.writeFileSync(agent19Path, payload);
    console.log(`Saved results to ${outPath}, ${finalOutPath}, and ${agent19Path}`);
    if (caught < results.length) process.exit(1);
  } else if (args.includes('--dir')) {
    const dirIdx = args.indexOf('--dir') + 1;
    const dir = args[dirIdx];
    if (!dir || !fs.existsSync(dir)) {
      console.error(`Directory not found: ${dir}`);
      process.exit(1);
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    console.log(`Verifying ${files.length} JSON artifacts in ${dir}...`);
    let passCount = 0;
    for (const f of files) {
      const full = path.join(dir, f);
      const res = verifyAuditArtifact(full);
      if (res.isValid) {
        passCount++;
      } else {
        console.error(`FAIL: ${f} -> ${res.issues.map((i) => i.message).join('; ')}`);
      }
    }
    console.log(`Verification Complete: ${passCount}/${files.length} artifacts passed independent checks.`);
  }
}
