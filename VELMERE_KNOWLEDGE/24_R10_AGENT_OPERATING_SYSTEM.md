# VELMÈRE R10 — AGENT OPERATING SYSTEM

Status: CURRENT_GIT_PROVEN_PROCESS_GUIDE  
Purpose: long-horizon engineering, audit and release work.  
Release authority: this process guide never overrides an exact release ZIP, fresh execution evidence, or external authority records.

## 1. Manager / worker / evaluator separation

Use one manager to maintain the task graph and release truth. Delegate bounded work to isolated workers. A worker that writes a change does not grant itself release credit. A separate evaluator/verifier must test the changed state.

Default worker tracks:
- BUILD_RUNTIME — exact runtime, clean install, direct typecheck, release-source lint, production build, start/smoke.
- SECURITY_ENGINE — regressions, local benchmark, external frozen benchmark when available, detector evidence.
- PDF_REPORT_QA — generation, structural verification, raster QA, layout/safe-zone, product-quality truth.
- AUTH_DATA — RLS/authz/session/payment negative paths; staging credit only from real staging evidence.
- PROVIDERS — technical access, rights evidence, freshness, fallback/quorum, receipts; keys are never evidence of legal rights.
- SUPPLY_CHAIN — workflow inventory, pinned actions, dependency audit, secret scanning, SBOM/provenance when available.
- CLAIMS_GOVERNANCE — customer wording, evidence freshness, authority chain and stale-document detection.
- INDEPENDENT_EVALUATOR — skeptical audit of outputs from all other tracks.

## 2. Exit conditions

Do not stop because a single test is green. A pass ends only when:
1. all planned internal tracks reached DONE or a precisely evidenced PARTIAL/BLOCKED state;
2. every code change has a verifier result on the changed SHA;
3. failed tests are root-caused, not reclassified merely to obtain green;
4. stale evidence cannot receive current-release production credit;
5. release claims are capped by the weakest required evidence;
6. new discoveries are written to the living master plan;
7. the exact release source identity is bound to the final artifact.

External blockers do not stop internal engineering. They remain explicit and fail-closed.

## 3. Evidence classes

Use these classes consistently:
- CURRENT_RELEASE_PROVEN — executed or inspected on the exact release authority.
- CURRENT_GIT_PROVEN — verified on a named Git SHA; not automatically release credit.
- PROVEN_PRODUCTION — requires production/staging evidence appropriate to the claim.
- LOCAL_ONLY — deterministic local evidence only.
- HISTORICAL_USEFUL — useful design/history, no current credit.
- HISTORICAL_FAIL — historical failure remains part of the record.
- EXTERNAL_BLOCKER — requires evidence outside the repository/runtime available to the agent.
- UNKNOWN — not yet resolved.
- DISPROVEN — contradicted by current evidence.

## 4. Freshness and identity

Every meaningful receipt should bind, when applicable:
- source/release SHA or archive SHA-256;
- workflow/run identity;
- runtime versions;
- generated timestamp;
- environment class (local/CI/staging/production);
- evidence scope and explicit non-credit boundaries.

A PASS without source identity, environment scope or freshness may remain historical/local, but cannot silently become production proof.

## 5. Evaluator–optimizer loop

For each failing track:
1. evaluator emits a machine-readable failure with root symptom and scope;
2. worker makes the smallest defensible fix;
3. verifier reruns on the new SHA;
4. independent evaluator checks for weakened gates, changed denominators or semantic overclaim;
5. only then may the manager merge the change.

Never solve a failing gate by lowering the denominator or weakening a rule unless the old denominator/rule is demonstrably incorrect. If scope changes, preserve the previous metric as debt/history and document the reason.

## 6. Parallel work policy

Parallelize work when tracks have independent write sets or isolated branches. Typical safe parallelism:
- dependency remediation vs PDF QA vs benchmark wording vs lint remediation;
- static audit vs build vs render QA;
- research/knowledge extraction vs isolated code remediation.

Before merging parallel branches, run an integration pass on one exact SHA. Green branch-local tests are necessary but insufficient after integration.

## 7. Research policy

Use external research to improve methods, not to manufacture Velmère evidence. Prefer primary/official sources for agent architecture, security standards, provider terms and framework behavior. Record useful process learnings separately from release evidence.

Current process inspirations reviewed for R10:
- OpenAI: practical agent design — clear instructions, manager/delegation patterns, guardrails, evals and human/high-risk boundaries.
- OpenAI: long-horizon agent/sandbox model — controlled execution and auditable actions.
- Anthropic: simple composable workflows, parallelization and evaluator–optimizer patterns.
- Anthropic: long-running harness design — persistent handoffs and separating author from evaluator.
- Google DeepMind Project Astra: context-aware tool use, action intelligence and persistent contextual assistance.

These references guide orchestration only; they do not certify Velmère.

## 8. Context and learning persistence

Do not rely on chat context as the sole memory. Persist:
- source authority and hashes;
- current blockers and scores;
- verified fixes and regressions;
- failed approaches and why they failed;
- external evidence still required;
- next-pass dependency graph;
- reviewed source ledger.

When context is refreshed, reconstruct execution from these artifacts rather than from optimistic summaries.

## 9. Truth-first benchmark rule

Local corpora may prove regression stability only. Never label an in-repository holdout as independent/blind unless the selection, freeze and access controls actually support that claim. Historical external false negatives remain historical false negatives after a detector fix. New performance credit requires a new engine identity and a genuinely frozen comparable evaluation set.

## 10. Merge contract

A worker branch is merge-eligible only when:
- its intended files are the only material write set;
- direct tests for that change pass;
- relevant security/regression tests pass;
- the evaluator confirms no gate weakening or claim inflation;
- the integration manager can identify the exact source and target SHAs.

After merge, rerun the full parallel pass. No branch-local result is final release evidence until integrated and rebound to the exact release source.
