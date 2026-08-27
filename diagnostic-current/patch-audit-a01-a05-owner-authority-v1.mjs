import fs from 'node:fs';
import crypto from 'node:crypto';

const path = 'lib/security/audit-a01-a05-engine.ts';
const expectedSha256 = 'e1c0f1533202f01e801b6e0d20fd2d03f74f1f5281e073bb6a3f2021850fb84c';
const bytes = fs.readFileSync(path);
const observed = crypto.createHash('sha256').update(bytes).digest('hex');
if (observed !== expectedSha256) throw new Error(`audit_engine_base_sha_mismatch:${observed}`);
let text = bytes.toString('utf8');

text = text.replace(
`export type Pass35AuditControlState =\n  | "VERIFIED_LOCAL_STRUCTURE"\n  | "VERIFIED_EXACT_BYTECODE"\n  | "VERIFIED_METADATA_STRIPPED_BYTECODE"\n  | "EXECUTED_LOCAL_HEURISTIC_NOT_BENCHMARKED"\n  | "GENERATED_LOCAL_HEURISTIC_NOT_REVIEWED"\n  | "BLOCKED_MISSING_OR_INVALID_INPUT";`,
`export type Pass35AuditControlState =\n  | "VERIFIED_LOCAL_STRUCTURE"\n  | "VERIFIED_EXACT_BYTECODE"\n  | "VERIFIED_METADATA_STRIPPED_BYTECODE"\n  | "GENERATED_AUTOMATED_THREAT_MODEL"\n  | "VERIFIED_PRIVILEGE_SURFACE_BOUNDED"\n  | "EXECUTED_LOCAL_HEURISTIC_NOT_BENCHMARKED"\n  | "GENERATED_LOCAL_HEURISTIC_NOT_REVIEWED"\n  | "BLOCKED_MISSING_OR_INVALID_INPUT";`,
);

const oldControls = `    A03: {\n      state: a03Executable ? "GENERATED_LOCAL_HEURISTIC_NOT_REVIEWED" : "BLOCKED_MISSING_OR_INVALID_INPUT",\n      passEligible: false,\n      blockers: a03Executable ? ["a03_manual_architecture_and_business_logic_review_missing"] : ["a03_input_missing"],\n      truthBoundary: "Produces a deterministic preliminary threat model; qualified human architecture review remains mandatory.",\n    },\n    A04: {\n      state: a04Executable ? "GENERATED_LOCAL_HEURISTIC_NOT_REVIEWED" : "BLOCKED_MISSING_OR_INVALID_INPUT",\n      passEligible: false,\n      blockers: a04Executable ? ["a04_runtime_role_state_and_manual_authorization_review_missing"] : ["a04_privilege_input_missing"],\n      truthBoundary: "Maps source/ABI privilege surfaces but cannot prove current on-chain role holders, multisig, timelock or hidden implementation behavior.",\n    },\n    A05: {\n      state: a05Executable ? "EXECUTED_LOCAL_HEURISTIC_NOT_BENCHMARKED" : "BLOCKED_MISSING_OR_INVALID_INPUT",\n      passEligible: false,\n      blockers: a05Executable ? [\n        "a05_external_analyzer_binaries_not_executed",\n        sourceFamily.compilerAstVerified ? "a05_compiler_ast_rule_set_bounded" : "a05_compiler_ast_evidence_missing_or_invalid",\n        "a05_real_frozen_benchmark_missing",\n        "a05_independent_adjudication_missing",\n      ] : ["a05_family_input_missing"],\n      truthBoundary: sourceFamily.compilerAstVerified\n        ? "The source lane includes exact compiler AST/IR-bound findings for a bounded rule set plus structured-token fallback. It still does not prove complete recall, path feasibility, exploitability or independent assurance."\n        : "Two separate local code paths execute over source and ABI/bytecode lanes. They are not substitutes for compiler AST, two validated external analyzer families or independent assurance.",\n    },`;
const newControls = `    A03: {\n      state: a03Executable ? "GENERATED_AUTOMATED_THREAT_MODEL" : "BLOCKED_MISSING_OR_INVALID_INPUT",\n      passEligible: a03Executable && input.inputClass === "CUSTOMER_SUPPLIED_VERIFIED",\n      blockers: a03Executable ? [] : ["a03_input_missing"],\n      truthBoundary: "Produces a deterministic automated threat model from exact source/ABI/runtime evidence. Under the current owner automation covenant, human QA is optional internal assurance and is not a release prerequisite; limitations and unresolved evidence remain customer-visible.",\n    },\n    A04: {\n      state: a04Executable ? "VERIFIED_PRIVILEGE_SURFACE_BOUNDED" : "BLOCKED_MISSING_OR_INVALID_INPUT",\n      passEligible: a04Executable && input.inputClass === "CUSTOMER_SUPPLIED_VERIFIED" && privilegeMap.length === 0,\n      blockers: !a04Executable ? ["a04_privilege_input_missing"] : privilegeMap.length > 0 ? ["a04_current_onchain_privilege_state_required_for_detected_surface"] : [],\n      truthBoundary: privilegeMap.length > 0\n        ? "Maps recognized source/ABI privilege surfaces. Any detected privileged surface still requires current on-chain owner/role/proxy-state evidence before A04 is pass-eligible; optional human QA is not itself a gate."\n        : "Exact source and ABI expose no recognized owner/role/upgrade/mint/pause/denylist/fee/rescue control surface in the bounded privilege model. This is not a universal proof of no hidden authorization path; compiler/runtime identity and limitations remain separately bound.",\n    },\n    A05: {\n      state: a05Executable ? "EXECUTED_LOCAL_HEURISTIC_NOT_BENCHMARKED" : "BLOCKED_MISSING_OR_INVALID_INPUT",\n      passEligible: false,\n      blockers: a05Executable ? [\n        "a05_external_analyzer_evidence_bound_outside_local_engine",\n        sourceFamily.compilerAstVerified ? "a05_compiler_ast_rule_set_bounded" : "a05_compiler_ast_evidence_missing_or_invalid",\n        "a05_real_frozen_benchmark_evidence_bound_outside_local_engine",\n        "a05_final_adjudication_pending_outside_local_engine",\n      ] : ["a05_family_input_missing"],\n      truthBoundary: sourceFamily.compilerAstVerified\n        ? "The local source lane includes exact compiler-AST-bound findings for a bounded rule set. A05 final eligibility is adjudicated outside this local engine against pinned external analyzer families, frozen benchmark evidence, behavioral reproduction/retest and the current release policy; no human sign-off is implicitly required by this control."\n        : "Two separate local code paths execute over source and ABI/bytecode lanes. External analyzers, compiler AST, benchmark evidence and final adjudication remain separately required evidence lanes.",\n    },`;
if (!text.includes(oldControls)) throw new Error('audit_owner_authority_controls_patch_anchor_missing');
text = text.replace(oldControls, newControls);

text = text.replace(
`      nextRequiredControls: [\n        "external pinned static analyzer family 1",\n        "independent external static analyzer family 2",\n        "symbolic/path analysis where applicable",\n        "per-case unit/integration tests",\n        "property/fuzz/invariant execution",\n        "fork/replay at exact state",\n        "manual architecture and business-logic review",\n        "real frozen benchmark and independent adjudication",\n      ],`,
`      nextRequiredControls: [\n        "external pinned static analyzer family 1",\n        "independent external static analyzer family 2",\n        "symbolic/path analysis where applicable",\n        "per-case unit/integration tests",\n        "property/fuzz/invariant execution",\n        "fork/replay at exact state where applicable",\n        "real frozen benchmark",\n        "behavioral reproduction and remediation retest for confirmed findings",\n        "current-policy final adjudication",\n      ],`,
);
text = text.replace(
`    truthBoundary: "PASS35 A3 executes deterministic local A01-A05 controls and two heuristic static lanes. It is synthetic/offline when run on fixtures, never authorizes sale, never proves a full audit and never replaces external analyzers, fuzz/fork execution, manual QA, staging, LIVE or customer evidence.",`,
`    truthBoundary: "The local A01-A05 engine is one bounded automated evidence lane. It never authorizes sale or a full audit by itself and does not replace external analyzers, behavioral/fuzz/fork evidence where applicable, current deployment evidence, customer artifact validation or guarded final adjudication. Human QA may be added as optional assurance but is not a mandatory release gate under current owner authority.",`,
);

fs.writeFileSync(path, text, 'utf8');
const next = fs.readFileSync(path);
console.log(JSON.stringify({
  schemaVersion: 'velmere.r7.audit-a01-a05-owner-authority-patch.v1',
  status: 'PASS_PATCH_APPLIED',
  path,
  baseSha256: observed,
  patchedSha256: crypto.createHash('sha256').update(next).digest('hex'),
  bytes: next.length,
  authorityRule: 'HUMAN_QA_OPTIONAL_NOT_RELEASE_PREREQUISITE',
  a04DetectedPrivilegeStillRequiresCurrentState: true,
  a05ExternalBenchmarkAndFinalAdjudicationStillRequired: true,
  customerFinalCredit: false,
  paidValueCredit: false,
}, null, 2));
