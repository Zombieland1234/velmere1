import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { detectP78Erc2771MulticallContext } from "../../lib/security/erc2771-multicall-context-detector.ts";
import { executePass35AuditA01A05 } from "../../lib/security/audit-a01-a05-engine.ts";
import { buildPass2574AuditClaimLedgerReport } from "../../lib/security/audit-claim-ledger.ts";
import { buildPass2576AuditPermissionParserReport } from "../../lib/security/audit-permission-parser.ts";
import { buildPass2578AuditReportAssemblerReport } from "../../lib/security/audit-report-assembler.ts";
import { projectAuditReportForCustomer } from "../../lib/security/audit-report-customer-projection.ts";

const OBSERVED_AT = "2026-08-18T13:30:00.000Z";
const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");

const OLD_MULTICALL = `// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;
contract Multicall is IMulticall {
    function multicall(bytes[] calldata data) external virtual override returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            results[i] = TWAddress.functionDelegateCall(address(this), data[i]);
        }
        return results;
    }
}`;

const OLD_HELPER = `library TWAddress {
    function functionDelegateCall(address target, bytes memory data, string memory errorMessage) internal returns (bytes memory) {
        require(isContract(target), "Address: delegate call to non-contract");
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }
}`;

const OPEN_EDITION_VULNERABLE = `contract OpenEditionERC721 is
    Initializable,
    ContractMetadata,
    ERC2771ContextUpgradeable,
    Multicall,
    ERC721AQueryableUpgradeable
{
    function initialize(address _defaultAdmin, address[] memory _trustedForwarders) external initializer {
        __ERC2771Context_init(_trustedForwarders);
    }
    function _canSetOwner() internal view override returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }
}`;

const LOYALTY_VULNERABLE = `contract LoyaltyCard is
    ILoyaltyCard,
    ContractMetadata,
    Multicall,
    PermissionsEnumerable,
    ERC2771ContextUpgradeable,
    NFTMetadata
{
    function initialize(address _defaultAdmin, address[] memory _trustedForwarders) external initializer {
        __ERC2771Context_init(_trustedForwarders);
    }
    function _canSetOwner() internal view override returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }
}`;

const DIRECT_FIXED_MULTICALL = `contract Multicall is IMulticall {
    function multicall(bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        address sender = _msgSender();
        bool isForwarder = msg.sender != sender;
        for (uint256 i = 0; i < data.length; i++) {
            if (isForwarder) {
                results[i] = Address.functionDelegateCall(address(this), abi.encodePacked(data[i], sender));
            } else {
                results[i] = Address.functionDelegateCall(address(this), data[i]);
            }
        }
        return results;
    }
    function _msgSender() internal view virtual returns (address) { return msg.sender; }
}`;

const OPEN_EDITION_DIRECT_FIXED = `contract OpenEditionERC721 is
    Initializable,
    ContractMetadata,
    ERC2771ContextUpgradeable,
    Multicall,
    ERC721AQueryableUpgradeable
{
    function initialize(address _defaultAdmin, address[] memory _trustedForwarders) external initializer {
        __ERC2771Context_init(_trustedForwarders);
    }
    function _msgSender() internal view virtual override(ERC2771ContextUpgradeable, Multicall) returns (address sender) {
        return ERC2771ContextUpgradeable._msgSender();
    }
}`;

const INTERIM_GUARD = `library Address {
    function functionDelegateCall(address target, bytes memory data, string memory errorMessage) internal returns (bytes memory) {
        require(isContract(target) && !isContract(msg.sender), "Address: invalid delegate call");
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }
}`;

const OPEN_EDITION_INTERIM = `contract OpenEditionERC721 is
    Initializable,
    ContractMetadata,
    ERC2771ContextUpgradeable,
    Multicall,
    ERC721AQueryableUpgradeable
{
    function initialize(address _defaultAdmin, address[] memory _trustedForwarders) external initializer {
        __ERC2771Context_init(_trustedForwarders);
    }
}`;

const ERC2771_ONLY = `abstract contract ERC2771ContextUpgradeable is Initializable, ContextUpgradeable {
    mapping(address => bool) private _trustedForwarder;
    function __ERC2771Context_init(address[] memory trustedForwarder) internal onlyInitializing {
        for (uint256 i = 0; i < trustedForwarder.length; i++) _trustedForwarder[trustedForwarder[i]] = true;
    }
    function isTrustedForwarder(address forwarder) public view virtual returns (bool) {
        return _trustedForwarder[forwarder];
    }
}`;

const CASES = [
  {
    id: "THIRDWEB-VULN-OPENEDITION-2BB75ADA",
    truth: "positive",
    evidenceClass: "REAL_UPSTREAM_EXCERPT",
    upstream: {
      repository: "thirdweb-dev/contracts",
      commit: "2bb75ada065b2a301149a859bb1f807b0c99fe71",
      anchors: [
        ["contracts/OpenEditionERC721.sol", "48d93408c8b95024bb09180fba721565a31decab"],
        ["contracts/extension/Multicall.sol", "dc9dd76d255f057f89dbdfdf3702f4ca6798153f"],
      ],
      incidentGroundTruth: "thirdweb Security Vulnerability Incident Report 12/8",
    },
    expected: "SOURCE_PATTERN_RISK_SIGNAL",
    files: [
      { path: "contracts/OpenEditionERC721.sol", content: OPEN_EDITION_VULNERABLE },
      { path: "contracts/extension/Multicall.sol", content: OLD_MULTICALL },
      { path: "contracts/lib/TWAddress.sol", content: OLD_HELPER },
    ],
  },
  {
    id: "THIRDWEB-VULN-LOYALTY-2BB75ADA",
    truth: "positive",
    evidenceClass: "REAL_UPSTREAM_EXCERPT",
    upstream: {
      repository: "thirdweb-dev/contracts",
      commit: "2bb75ada065b2a301149a859bb1f807b0c99fe71",
      anchors: [
        ["contracts/LoyaltyCard.sol", "2f286b9bdb853a89c33b2815f7e0cd757a3e8d8b"],
        ["contracts/extension/Multicall.sol", "dc9dd76d255f057f89dbdfdf3702f4ca6798153f"],
      ],
      incidentGroundTruth: "thirdweb Security Vulnerability Incident Report 12/8",
    },
    expected: "SOURCE_PATTERN_RISK_SIGNAL",
    files: [
      { path: "contracts/LoyaltyCard.sol", content: LOYALTY_VULNERABLE },
      { path: "contracts/extension/Multicall.sol", content: OLD_MULTICALL },
      { path: "contracts/lib/TWAddress.sol", content: OLD_HELPER },
    ],
  },
  {
    id: "THIRDWEB-TN-DIRECT-FIX-EFD2218F",
    truth: "negative",
    evidenceClass: "REAL_UPSTREAM_EXCERPT",
    upstream: {
      repository: "thirdweb-dev/contracts",
      commit: "efd2218ff9cbbfe326c33ce661042d7c19c17317",
      anchors: [
        ["contracts/prebuilts/open-edition/OpenEditionERC721.sol", "f802b2f149ae35582966865d60b37e2f11513d5c"],
        ["contracts/extension/Multicall.sol", "043d6c3c02610294236945e0abeb8c60c3319b22"],
      ],
      mitigation: "FORWARDED_SENDER_PROPAGATION",
    },
    expected: "MITIGATED_SOURCE_PATTERN",
    files: [
      { path: "contracts/prebuilts/open-edition/OpenEditionERC721.sol", content: OPEN_EDITION_DIRECT_FIXED },
      { path: "contracts/extension/Multicall.sol", content: DIRECT_FIXED_MULTICALL },
    ],
  },
  {
    id: "THIRDWEB-TN-INTERIM-GUARD-745AFA85",
    truth: "negative",
    evidenceClass: "REAL_UPSTREAM_EXCERPT",
    upstream: {
      repository: "thirdweb-dev/contracts",
      commit: "745afa8537dbc577f72bfa75a718a2b781d0379d",
      anchors: [
        ["contracts/prebuilts/open-edition/OpenEditionERC721.sol", "3b7287ab8d799266530a100f9ff9933093b9f2dd"],
        ["contracts/extension/Multicall.sol", "parent-of-efd2218f"],
        ["contracts/lib/Address.sol", "indirect-remediation-helper"],
      ],
      mitigation: "CONTRACT_CALLER_GUARD",
    },
    expected: "MITIGATED_SOURCE_PATTERN",
    files: [
      { path: "contracts/prebuilts/open-edition/OpenEditionERC721.sol", content: OPEN_EDITION_INTERIM },
      { path: "contracts/extension/Multicall.sol", content: OLD_MULTICALL.replaceAll("TWAddress", "Address") },
      { path: "contracts/lib/Address.sol", content: INTERIM_GUARD },
    ],
  },
  {
    id: "THIRDWEB-TN-MULTICALL-ONLY",
    truth: "negative",
    evidenceClass: "REAL_UPSTREAM_LOOKALIKE_SUBSET",
    upstream: {
      repository: "thirdweb-dev/contracts",
      commit: "2bb75ada065b2a301149a859bb1f807b0c99fe71",
      anchors: [["contracts/extension/Multicall.sol", "dc9dd76d255f057f89dbdfdf3702f4ca6798153f"]],
    },
    expected: "NO_MATCH",
    files: [{ path: "contracts/extension/Multicall.sol", content: OLD_MULTICALL }],
  },
  {
    id: "THIRDWEB-TN-ERC2771-ONLY",
    truth: "negative",
    evidenceClass: "REAL_UPSTREAM_LOOKALIKE_SUBSET",
    upstream: {
      repository: "thirdweb-dev/contracts",
      commit: "2bb75ada065b2a301149a859bb1f807b0c99fe71",
      anchors: [["contracts/openzeppelin-presets/metatx/ERC2771ContextUpgradeable.sol", "d0d8039614eb6b48ca2a20dac78823bbb17977d5"]],
    },
    expected: "NO_MATCH",
    files: [{ path: "contracts/openzeppelin-presets/metatx/ERC2771ContextUpgradeable.sol", content: ERC2771_ONLY }],
  },
];

function engineInput(testCase, index) {
  const provenanceDigest = sha256(JSON.stringify({ id: testCase.id, upstream: testCase.upstream, files: testCase.files }));
  return {
    schemaVersion: "velmere.pass35.audit-a01-a05-input.v1",
    inputClass: "SYNTHETIC_OFFLINE",
    caseRef: `AUD-P78-TW-${String(index + 1).padStart(2, "0")}`,
    observedAt: OBSERVED_AT,
    chainId: "1",
    chainName: "ethereum-development-ground-truth",
    contractAddress: `0x${String(index + 1).padStart(40, "0")}`,
    projectName: testCase.id,
    sourceFiles: testCase.files,
    abi: [{ type: "function", name: "initialize", stateMutability: "nonpayable", inputs: [], outputs: [] }],
    sourceProvenance: {
      provider: "github-upstream-development-ground-truth",
      sourceReference: `${testCase.upstream.repository}@${testCase.upstream.commit}`,
      verifiedSource: true,
      observedAt: OBSERVED_AT,
      responseSha256: provenanceDigest,
    },
    compiler: {
      family: "solc",
      version: "0.8.11",
      optimizerEnabled: null,
      optimizerRuns: null,
      evmVersion: null,
      viaIR: null,
      settings: {},
    },
    compiledRuntimeBytecode: "0x6000",
    deployedRuntimeBytecode: "0x6000",
  };
}

const results = [];
let tp = 0, tn = 0, fp = 0, fn = 0;
let passed = 0;
const checks = [];
function check(id, condition, detail = null) {
  checks.push({ id, pass: Boolean(condition), detail });
  if (condition) passed += 1;
}

for (const [index, testCase] of CASES.entries()) {
  const detector = detectP78Erc2771MulticallContext(testCase.files);
  const engine = engineInput(testCase, index);
  const report = executePass35AuditA01A05(engine);
  const engineFinding = report.findings.filter((finding) => finding.title === "ERC2771 + Multicall forwarded-context spoofing risk pattern");
  const sourceText = JSON.stringify({
    language: "Solidity",
    sources: Object.fromEntries(testCase.files.map((file) => [file.path, { content: file.content }])),
  });
  const abiText = JSON.stringify([{ type: "function", name: "initialize", stateMutability: "nonpayable", inputs: [], outputs: [] }]);
  const claimLedger = buildPass2574AuditClaimLedgerReport({
    chain: engine.chainName,
    contractAddress: engine.contractAddress,
    locale: "en",
    sourceContextIntegrity: detector,
  });
  const permissionParser = buildPass2576AuditPermissionParserReport({
    chain: engine.chainName,
    contractAddress: engine.contractAddress,
    locale: "en",
    claimLedger,
    verifiedStaticEvidence: {
      contractAddress: engine.contractAddress,
      chain: engine.chainName,
      provider: "github-upstream-development-ground-truth",
      observedAt: OBSERVED_AT,
      responseDigest: sha256(sourceText),
      sourceText,
      abiText,
    },
  });
  const assembler = buildPass2578AuditReportAssemblerReport({
    chain: engine.chainName,
    contractAddress: engine.contractAddress,
    locale: "en",
    claimLedger,
    permissionParser,
  });
  const projection = projectAuditReportForCustomer({
    report: assembler,
    requestedTier: "pro",
    deliveredTier: "pro",
    manualReviewVerified: false,
  });
  const sourceClaim = claimLedger.claims.find((claim) => claim.id === "p78-erc2771-multicall-context-source-signal");
  const contextSignal = permissionParser.signals.find((signal) => signal.id === "erc2771-multicall-context-integrity");
  const contextFinding = assembler.topFindings.find((finding) => finding.id === "finding-permission-signal-erc2771-multicall-context-integrity");
  const projectedContextFinding = projection.report.topFindings.find((finding) => finding.id === "finding-permission-signal-erc2771-multicall-context-integrity");
  const predictedPositive = detector.classification === "SOURCE_PATTERN_RISK_SIGNAL";
  if (testCase.truth === "positive" && predictedPositive) tp += 1;
  else if (testCase.truth === "negative" && !predictedPositive) tn += 1;
  else if (testCase.truth === "negative" && predictedPositive) fp += 1;
  else fn += 1;

  check(`${testCase.id}:classification`, detector.classification === testCase.expected, detector.classification);
  check(`${testCase.id}:exploitability_not_overclaimed`, detector.exploitabilityProven === false);
  check(`${testCase.id}:customer_final_not_authorized`, detector.customerFinalEligibleFromDetector === false);
  check(
    `${testCase.id}:engine_binding`,
    testCase.truth === "positive" ? engineFinding.length === 1 : engineFinding.length === 0,
    { engineFindingCount: engineFinding.length },
  );
  if (testCase.truth === "positive") {
    check(`${testCase.id}:engine_confidence_not_calibrated`, engineFinding[0]?.confidenceState === "NOT_CALIBRATED");
    check(`${testCase.id}:engine_high_source_risk`, engineFinding[0]?.severity === "high");
    check(`${testCase.id}:customer_claim_partial`, sourceClaim?.grade === "partial" && sourceClaim?.canShowAsFact === false);
    check(`${testCase.id}:permission_context_signal`, contextSignal?.state === "detected" && contextSignal?.severity === "elevated");
    check(`${testCase.id}:assembler_specific_finding`, contextFinding?.severity === "elevated" && assembler.finalVerdict.riskScore === null);
    check(`${testCase.id}:projection_specific_finding`, Boolean(projectedContextFinding));
    check(`${testCase.id}:customer_path_no_raw_source`, !JSON.stringify({ claimLedger, permissionParser, assembler, projection }).includes(sourceText));
  } else {
    check(`${testCase.id}:customer_claim_absent`, sourceClaim === undefined);
    check(`${testCase.id}:permission_context_signal_absent`, contextSignal === undefined);
    check(`${testCase.id}:assembler_specific_finding_absent`, contextFinding === undefined);
    check(`${testCase.id}:projection_specific_finding_absent`, projectedContextFinding === undefined);
  }
  if (testCase.expected === "MITIGATED_SOURCE_PATTERN") {
    check(`${testCase.id}:mitigation_classified`, detector.mitigation !== null, detector.mitigation);
  }

  results.push({
    id: testCase.id,
    truth: testCase.truth,
    evidenceClass: testCase.evidenceClass,
    upstream: testCase.upstream,
    detector: {
      classification: detector.classification,
      mitigation: detector.mitigation,
      compositionContracts: detector.compositionContracts,
      trustedForwarderConfigurationObserved: detector.trustedForwarderConfigurationObserved,
      trustedForwarderRuntimeState: detector.trustedForwarderRuntimeState,
      exploitabilityProven: detector.exploitabilityProven,
      customerFinalEligibleFromDetector: detector.customerFinalEligibleFromDetector,
      evidence: detector.evidence,
    },
    engine: {
      findingCount: engineFinding.length,
      findingId: engineFinding[0]?.findingId ?? null,
      severity: engineFinding[0]?.severity ?? null,
      confidenceState: engineFinding[0]?.confidenceState ?? null,
      reportSha256: report.reportSha256,
    },
    customerPath: {
      sourceClaimGrade: sourceClaim?.grade ?? null,
      sourceClaimFactSafe: sourceClaim?.canShowAsFact ?? null,
      permissionContextSignal: contextSignal?.state ?? null,
      assemblerSpecificFinding: Boolean(contextFinding),
      projectedSpecificFinding: Boolean(projectedContextFinding),
      globalRiskScore: assembler.finalVerdict.riskScore,
    },
  });
}

check("micro_corpus:exact_confusion_matrix", tp === 2 && tn === 4 && fp === 0 && fn === 0, { tp, tn, fp, fn });
check("micro_corpus:not_accuracy_claim", true, "Six development cases demonstrate behavior only; they do not establish world-wide detector accuracy.");

const receipt = {
  schemaVersion: "velmere.p78.thirdweb-development-micro-corpus-runtime.v1",
  status: checks.every((entry) => entry.pass) ? "PASS" : "FAIL",
  observedAt: OBSERVED_AT,
  runtime: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    exactWindowsCredit: false,
  },
  corpus: {
    total: CASES.length,
    positives: 2,
    negatives: 4,
    evidenceClasses: [...new Set(CASES.map((entry) => entry.evidenceClass))],
    scope: "DEVELOPMENT_MICRO_CORPUS_NOT_FINAL_HOLDOUT",
  },
  confusionMatrix: { tp, tn, fp, fn },
  checks: { total: checks.length, passed, failed: checks.length - passed, rows: checks },
  results,
  truthBoundary: {
    detectorAccuracyClaimAllowed: false,
    deploymentExploitabilityClaimAllowed: false,
    customerFinalCredit: "0/20_UNCHANGED",
    auditFinalPdfCredit: "0/3_UNCHANGED",
    exactWindows: "WITHHELD_NOT_EXECUTED_HERE",
    finalHoldout: "WITHHELD_DEVELOPMENT_CORPUS_ONLY",
  },
};

await mkdir("receipts/p78", { recursive: true });
await writeFile("receipts/p78/P78_THIRDWEB_DEVELOPMENT_MICRO_CORPUS_RUNTIME.json", `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: receipt.status, confusionMatrix: receipt.confusionMatrix, checks: receipt.checks }, null, 2));
if (receipt.status !== "PASS") process.exitCode = 1;
