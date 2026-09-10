# VELMÈRE REPOSITORY FORENSIC INVENTORY
*Generated at: 2026-09-07T20:29:15.348Z*
*Total Files Analyzed:* 12523 | *Total Bytes:* 825.92 MB

## 1. Directory & Category Breakdown
| Category | File Count | Description |
| :--- | :--- | :--- |
| **artifact** | 3319 | Inspection checkpoints and past cycle outputs |
| **other** | 3211 | Miscellaneous configuration and source assets |
| **script** | 2871 | Maintenance, verification, and inspection scripts |
| **library** | 1407 | Shared TypeScript helpers and UI utilities |
| **evidence_v3** | 364 | Furnace V3 150-PDF corpus and cycle artifacts |
| **security_module** | 258 | Security guards, rate limiters, RLS, linters, digests |
| **component** | 180 | React UI components and modals |
| **fixture** | 170 | Mock and real contract test data fixtures |
| **documentation** | 154 | Markdown manuals and architecture specs |
| **test_suite** | 114 | Integration and benchmark suites |
| **api_route** | 98 | Next.js App Router API endpoints |
| **app_route** | 92 | Next.js frontend pages and layouts |
| **test_security** | 79 | Security compliance, PKI, and parity tests |
| **evidence_v2** | 61 | Legacy 50-PDF audit evidence corpus |
| **report** | 46 | Inspection outputs, audit notes, and logs |
| **state_file** | 37 | Audit furnace and pass execution state JSONs |
| **v2_engine** | 14 | V2 security analysis engines (reentrancy, access control, etc.) |
| **test_unit** | 12 | Isolated unit tests for pricing, auth, provider |
| **golden_corpus** | 11 | Golden vulnerability benchmark contracts |
| **test_adversarial** | 10 | Red-team and mutation test harnesses |
| **engine** | 5 | Specialized asset security engines (EVM, Native, Market) |
| **script_furnace** | 5 | Audit Furnace multi-tier generator and orchestrator |
| **pdf_generator** | 4 | Customer-safe PDF renderers and typography fonts |
| **corpus** | 1 | Master asset definitions and test vectors |

## 2. Sensitive & Forensic Pattern Analysis in Source Code
| Pattern | Total Occurrences | Files Affected | Sample Files |
| :--- | :--- | :--- | :--- |
| `MARKET` | 115513 | 2070 | `.aider.chat.history.md`, `2026-09-01T20-10-39.562Z-turbopack-segmented.json`, `2026-09-02T02-24-44.163Z-turbopack-segmented.json`, `2026-09-02T04-17-02.928Z-turbopack-segmented.json`, `2026-09-02T11-25-31.911Z-webpack-segmented.json`, `2026-09-02T14-05-23.959Z-webpack-segmented.json`, `2026-09-02T15-57-27.955Z-webpack-segmented.json`, `2026-09-02T15-59-42.943Z-webpack-segmented.json` |
| `EVIDENCE` | 36709 | 2503 | `stop-guard.js`, `velmere-progress.json`, `.aider.chat.history.md`, `audit-furnace-state.json`, `execution-state.json`, `build-graph-profile.json`, `provider-rights-audit.json`, `route.ts` |
| `ADMIN` | 10159 | 685 | `.aider.chat.history.md`, `2026-09-01T20-10-39.562Z-turbopack-segmented.json`, `2026-09-02T02-24-44.163Z-turbopack-segmented.json`, `2026-09-02T04-17-02.928Z-turbopack-segmented.json`, `2026-09-02T11-25-31.911Z-webpack-segmented.json`, `2026-09-02T14-05-23.959Z-webpack-segmented.json`, `2026-09-02T15-57-27.955Z-webpack-segmented.json`, `2026-09-02T15-59-42.943Z-webpack-segmented.json` |
| `FIXTURE` | 8159 | 732 | `page.tsx`, `AssetDetailModal.tsx`, `VelmereIntelligenceSearchClient.tsx`, `paid-readiness-policy.json`, `p40-candidate-field-use-case-registry.json`, `p40-fixture-profile-binding-policy.json`, `gate-policy.json`, `package-payload-manifest.json` |
| `CONFIDENCE` | 6507 | 842 | `.aider.chat.history.md`, `execution-state.json`, `build-graph-profile.json`, `route.ts`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx` |
| `VERIFIED` | 6267 | 1271 | `stop-guard.js`, `velmere-progress.json`, `.aider.chat.history.md`, `audit-furnace-state.json`, `2026-09-01T20-10-39.562Z-turbopack-segmented.json`, `2026-09-02T02-24-44.163Z-turbopack-segmented.json`, `2026-09-02T04-17-02.928Z-turbopack-segmented.json`, `2026-09-02T11-25-31.911Z-webpack-segmented.json` |
| `SAFE` | 5210 | 1088 | `.aider.chat.history.md`, `2026-09-01T20-10-39.562Z-turbopack-segmented.json`, `2026-09-02T02-24-44.163Z-turbopack-segmented.json`, `2026-09-02T04-17-02.928Z-turbopack-segmented.json`, `2026-09-02T11-25-31.911Z-webpack-segmented.json`, `2026-09-02T14-05-23.959Z-webpack-segmented.json`, `2026-09-02T15-57-27.955Z-webpack-segmented.json`, `2026-09-02T15-59-42.943Z-webpack-segmented.json` |
| `OWNER` | 4675 | 564 | `2026-09-01T20-10-39.562Z-turbopack-segmented.json`, `2026-09-02T02-24-44.163Z-turbopack-segmented.json`, `2026-09-02T04-17-02.928Z-turbopack-segmented.json`, `2026-09-02T10-39-05.014Z-turbopack-segmented.json`, `2026-09-02T10-39-26.125Z-turbopack-segmented.json`, `2026-09-02T10-39-43.067Z-turbopack-segmented.json`, `2026-09-02T10-45-08.708Z-turbopack-segmented.json`, `2026-09-02T11-25-31.911Z-webpack-segmented.json` |
| `DEPLOYMENT` | 3435 | 408 | `2026-09-01T20-10-39.562Z-turbopack-segmented.json`, `2026-09-02T02-24-44.163Z-turbopack-segmented.json`, `2026-09-02T04-17-02.928Z-turbopack-segmented.json`, `2026-09-02T10-39-05.014Z-turbopack-segmented.json`, `2026-09-02T10-39-26.125Z-turbopack-segmented.json`, `2026-09-02T10-39-43.067Z-turbopack-segmented.json`, `2026-09-02T10-45-08.708Z-turbopack-segmented.json`, `2026-09-02T11-25-31.911Z-webpack-segmented.json` |
| `FALLBACK` | 3423 | 813 | `stop-guard.js`, `.aider.chat.history.md`, `route.ts`, `route.ts`, `route.ts`, `route.ts`, `route.ts`, `route.ts` |
| `LIQUIDITY` | 3054 | 535 | `build-graph-profile.json`, `page.tsx`, `page.tsx`, `IntelligenceFlagshipSections.tsx`, `IntelligenceHero3D.tsx`, `IntelligenceInteractive.tsx`, `IntelligencePage.tsx`, `IntelligenceResearchVault.tsx` |
| `STATIC` | 2962 | 734 | `.aider.chat.history.md`, `2026-09-01T20-10-39.562Z-turbopack-segmented.json`, `2026-09-02T02-24-44.163Z-turbopack-segmented.json`, `2026-09-02T04-17-02.928Z-turbopack-segmented.json`, `2026-09-02T10-39-05.014Z-turbopack-segmented.json`, `2026-09-02T10-39-26.125Z-turbopack-segmented.json`, `2026-09-02T10-39-43.067Z-turbopack-segmented.json`, `2026-09-02T10-45-08.708Z-turbopack-segmented.json` |
| `COVERAGE` | 2881 | 891 | `.aider.chat.history.md`, `CLEAN_SAFE_README.md`, `OrderProviderFulfilmentRetryPanel.tsx`, `HomePageClient.tsx`, `RiskMethodologyModal.tsx`, `analysis-model.ts`, `chart-model.ts`, `AssetDetailModal.tsx` |
| `PROXY` | 1813 | 432 | `.aider.chat.history.md`, `2026-09-01T20-10-39.562Z-turbopack-segmented.json`, `2026-09-02T02-24-44.163Z-turbopack-segmented.json`, `2026-09-02T04-17-02.928Z-turbopack-segmented.json`, `2026-09-02T11-25-31.911Z-webpack-segmented.json`, `2026-09-02T14-05-23.959Z-webpack-segmented.json`, `2026-09-02T15-57-27.955Z-webpack-segmented.json`, `2026-09-02T15-59-42.943Z-webpack-segmented.json` |
| `COMPILER` | 1811 | 181 | `VelmereRouteTransition.tsx`, `P65_CURRENT_FREE_LEGAL_SOURCE_POLICY.json`, `audit-provider-field-rights-currentness-registry.json`, `build-profiles.json`, `data-commercialization-policy.json`, `audit-a01-a05-policy.json`, `audit-execution-envelope.json`, `current-status-register.json` |
| `ATTESTATION` | 1661 | 225 | `route.ts`, `MarketActionReportsInboxClient.tsx`, `CrossAssetCollapseRadarPanel.tsx`, `CanonicalAuditReportView.tsx`, `CustomerSupportHandoffPacketPage.tsx`, `SecurityAuditsCleanPage.tsx`, `package-payload-manifest.json`, `pass14-diff-from-pass13-clean-safe.json` |
| `CONSENSUS` | 1051 | 196 | `IntelligencePage.tsx`, `CrossAssetCollapseRadarPanel.tsx`, `VelmereProprietaryResearchSection.tsx`, `SecurityAuditsCleanPage.tsx`, `build-graph-baseline.json`, `package-payload-manifest.json`, `handler-body-equivalence.json`, `package-payload-manifest.json` |
| `GOVERNANCE` | 1002 | 272 | `.aider.chat.history.md`, `route.ts`, `CrossAssetCollapseRadarPanel.tsx`, `ShieldMapCommandClient.tsx`, `VelmereProprietaryResearchSection.tsx`, `VelmereIntelligenceSearchClient.tsx`, `CanonicalAuditReportView.tsx`, `VlmAccessGatePage.tsx` |
| `HOLDERS` | 759 | 258 | `IntelligenceInteractive.tsx`, `IntelligencePage.tsx`, `analysis-model.ts`, `AssetDetailModal.tsx`, `AssetIntelligenceTabs.tsx`, `ShieldMapCommandClient.tsx`, `package-payload-manifest.json`, `handler-body-equivalence.json` |
| `FUZZ` | 737 | 138 | `current-release.json`, `a08-foundry-invariant-plan.json`, `a26-fuzz-invariant-evidence-policy.json`, `a26-fuzz-invariant-evidence-runtime-contract.json`, `a34-deep-visual-reconciliation.json`, `a44-visual-master-engine-binding.json`, `a45-source-manifest.json`, `a46-customer-data-plane-acceptance.json` |
| `BYTECODE` | 736 | 205 | `execution-state.json`, `route.ts`, `route.ts`, `page.tsx`, `CLEAN_SAFE_README.md`, `RiskCalculationWaterfallFork.tsx`, `VelmereProprietaryResearchSection.tsx`, `SecurityAuditsCleanPage.tsx` |
| `DEFAULT` | 698 | 432 | `2026-09-01T20-10-39.562Z-turbopack-segmented.json`, `2026-09-02T02-24-44.163Z-turbopack-segmented.json`, `2026-09-02T04-17-02.928Z-turbopack-segmented.json`, `2026-09-02T11-25-31.911Z-webpack-segmented.json`, `2026-09-02T14-05-23.959Z-webpack-segmented.json`, `2026-09-02T15-57-27.955Z-webpack-segmented.json`, `2026-09-02T15-59-42.943Z-webpack-segmented.json`, `route.ts` |
| `ABI` | 614 | 198 | `IntelligencePage.tsx`, `SecurityAuditsCleanPage.tsx`, `VlmBuyAccessPanel.tsx`, `audit-provider-field-rights-currentness-registry.json`, `package-payload-manifest.json`, `handler-body-equivalence.json`, `package-payload-manifest.json`, `pass15-diff-from-pass14.json` |
| `AUDITOR` | 612 | 208 | `SecurityAuditsCleanPage.tsx`, `ShopPageClient.tsx`, `package-payload-manifest.json`, `package-payload-manifest.json`, `package-payload-manifest.json`, `package-payload-manifest.json`, `package-payload-manifest.json`, `package-payload-manifest.json` |
| `ORACLE` | 563 | 187 | `.aider.chat.history.md`, `CrossAssetCollapseRadarPanel.tsx`, `RiskCalculationWaterfallFork.tsx`, `VelmereProprietaryResearchSection.tsx`, `HowRiskIsCalculatedModal.tsx`, `package-payload-manifest.json`, `PASS16_DIFF_FROM_PASS15.json`, `package-payload-manifest.json` |
| `REENTRANCY` | 549 | 188 | `.aider.chat.history.md`, `RiskCalculationWaterfallFork.tsx`, `HowRiskIsCalculatedModal.tsx`, `SecurityAuditsCleanPage.tsx`, `package-payload-manifest.json`, `PASS16_DIFF_FROM_PASS15.json`, `package-payload-manifest.json`, `package-payload-manifest.json` |
| `HUMAN REVIEW` | 391 | 104 | `VlmServiceCheckoutSuccessClient.tsx`, `IntelligencePage.tsx`, `RiskMethodologyModal.tsx`, `SecurityAuditOperatorActionsClient.tsx`, `gate-policy.json`, `PASS18_DIFF_FROM_PASS17.json`, `brain-angel-output-adapter-policy.json`, `PASS19_DIFF_FROM_PASS18.json` |
| `PLACEHOLDER` | 342 | 130 | `.aider.chat.history.md`, `page.tsx`, `AuditCasesPortalClient.tsx`, `OrderAdminTimelineConsole.tsx`, `VlmProductBrainEditor.tsx`, `VlmProductPublishDecisionModal.tsx`, `AngelPanel.tsx`, `AuthFormClient.tsx` |
| `MULTISIG` | 310 | 53 | `CLEAN_SAFE_README.md`, `RiskCalculationWaterfallFork.tsx`, `VelmereProprietaryResearchSection.tsx`, `i18n-neutral-allowlist.json`, `i18n-final-translations.json`, `a29-upgrade-deployment-operations-policy.json`, `a29-upgrade-deployment-operations-runtime-contract.json`, `a31-privilege-control-policy.json` |
| `FORMAL` | 233 | 116 | `execution-state.json`, `route.ts`, `CLEAN_SAFE_README.md`, `RiskCalculationWaterfallFork.tsx`, `VelmereProprietaryResearchSection.tsx`, `CanonicalAuditReportView.tsx`, `HowRiskIsCalculatedModal.tsx`, `SecurityAuditsCleanPage.tsx` |
| `MOCK` | 199 | 83 | `execution-state.json`, `pass13-portable-cache-manifest.json`, `lockfile-target-manifest.json`, `a102r44p33-action-required-current-state.json`, `a102r44p33-approved-current-source-changes.json`, `a102r44p33-external-ci-attempt-ledger.json`, `a102r44p33-external-stripe-mock-policy.json`, `a102r44p5-exact-npm-lockfile-migration.json` |
| `CERTIFICATE` | 194 | 165 | `AtelierAnimationLab.tsx`, `AnalysisTab.tsx`, `VelmereIntelligenceSearchClient.tsx`, `CanonicalAuditReportView.tsx`, `SecurityAuditsCleanPage.tsx`, `P65_CURRENT_FREE_LEGAL_SOURCE_POLICY.json`, `package-payload-manifest.json`, `package-payload-manifest.json` |
| `SIMULATED` | 183 | 95 | `.aider.chat.history.md`, `CLEAN_SAFE_README.md`, `AssetDetailModal.tsx`, `CrossAssetCollapseRadarPanel.tsx`, `HowRiskIsCalculatedModal.tsx`, `audit-lens-output-adapter-policy.json`, `market-impact-whale-tier-contract.json`, `product-tier-content-contract.json` |
| `TIMELOCK` | 175 | 58 | `CLEAN_SAFE_README.md`, `RiskCalculationWaterfallFork.tsx`, `VelmereProprietaryResearchSection.tsx`, `SecurityAuditsCleanPage.tsx`, `a29-upgrade-deployment-operations-policy.json`, `a29-upgrade-deployment-operations-runtime-contract.json`, `a31-privilege-control-policy.json`, `a31-privilege-control-runtime-contract.json` |
| `CHAINLINK` | 156 | 69 | `provider-rights-audit.json`, `CrossAssetCollapseRadarPanel.tsx`, `VelmereProprietaryResearchSection.tsx`, `SecurityAuditsCleanPage.tsx`, `provider-commercial-rights-registry.json`, `local-pdf-asset-catalog.json`, `worldclass-base-corpus.json`, `market-evidence-fixtures.json` |
| `CERTIFIED` | 148 | 90 | `execution-state.json`, `route.ts`, `route.ts`, `SecurityAuditBenchmarkPage.tsx`, `SecurityAuditExportPage.tsx`, `SecurityAuditOperatorActionsClient.tsx`, `SecurityAuditPricingPage.tsx`, `SecurityAuditRegistryPage.tsx` |
| `VERIFIED SOURCE` | 86 | 54 | `page.tsx`, `ShieldProCleanTerminalClient.tsx`, `ShieldRealMarketsParityClient.tsx`, `audit-a01-a05-policy.json`, `audit-a7-execution-policy.json`, `flagship-candidate-plan.json`, `a102r30-action-required-current-state.json`, `a102r30-local-regression-receipt.json` |
| `TODO` | 54 | 24 | `.aider.chat.history.md`, `merchant-legal-intake-schema.json`, `a102r44p1-product-reality-wave1-state.json`, `sec-edgar-reference-policy.ts`, `semantic-audit-batch-rebalance.ts`, `top1-pdf-render-cleanroom-gate.ts`, `production-env-contract.ts`, `report-semantic-linter.ts` |
| `FIXME` | 42 | 15 | `a102r44p1-product-reality-wave1-state.json`, `semantic-audit-batch-rebalance.ts`, `audit-full-tree.mjs`, `audit-full-tree.mjs`, `audit-full-tree.mjs`, `audit-clean-source.mjs`, `audit-clean-source.mjs`, `audit-clean-source.mjs` |
| `SECURITY SCORE` | 2 | 2 | `forensic_repository_inventory.ts`, `VELMERE_SECURITY_ENGINE_TOOL_COMPARISON.md` |
| `MAGIC NUMBER` | 1 | 1 | `forensic_repository_inventory.ts` |

## 3. Hardcoded EVM Address Footprint
- **Total Hardcoded Address Matches:** 538
- **Files Containing Addresses:** 145

### Key Files with Address Dependencies:
- `app\[locale]\security\audits\report\[id]\page.tsx`: 0x1234567890123456789012345678901234567890
- `components\security\SecurityAuditsCleanPage.tsx`: 0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3, 0xdac17f958d2ee523a2206206994597c13d831ec7, 0xe592427a0aece92de3edee1f18e0157c05861564, 0x6b175474e89094c44da98b954eedeac495271d0f
- `lib\market-integrity\canonical-whale-evidence.ts`: 0x1111111111111111111111111111111111111111, 0x2222222222222222222222222222222222222222, 0x3333333333333333333333333333333333333333, 0x4444444444444444444444444444444444444444, 0x5555555555555555555555555555555555555555
- `lib\market-integrity\server-owned-market-intelligence-providers.ts`: 0x0000000000000000000000000000000000000000
- `lib\market-integrity\whale-watch-onchain-event-identity.ts`: 0x0000000000000000000000000000000000000000
- `lib\security\audit-adjudicated-authority-evidence.ts`: 0xca11bde05977b3631167028862be2a173976ca11
- `lib\security\audit-canonical-report.ts`: 0x1234567890123456789012345678901234567890
- `lib\security\audit-compiler-deployment-binding.mjs`: 0x360894a13ba1a3210667c828492db98dca3e2076
- `lib\security\audit-current-deployment-readonly-quorum-v2.ts`: 0x0000000000000000000000000000000000000000, 0x0000000000000000000000000000000000000001
- `lib\security\audit-current-deployment-readonly-quorum.ts`: 0x0000000000000000000000000000000000000000, 0x0000000000000000000000000000000000000001
- `lib\security\audit-historical-deployment-ground-truth.ts`: 0x363d3d373d3d3d363d73ae5be6d490c47c7417e9, 0x0dabdc92af35615443412a336344c591faed3f90, 0x4f34b914d687195a73318ccc58d56d242b4dccf6, 0x7c4717039b89d5859c4fbb85edb19a6e2ce61171, 0x1ee617cd739b1afcc673a180e60b9a32ad3ba856
- `lib\security\audit-report-queue.ts`: 0x0000000000000000000000000000000000000000, 0x1111111111111111111111111111111111111111, 0x2222222222222222222222222222222222222222
- `lib\security\audit-sample-report.ts`: 0x0000000000000000000000000000000000000000
- `lib\security\audit-watch-contract-harness.ts`: 0xa0a0000000000000000000000000000000000001, 0xb0b0000000000000000000000000000000000002, 0xc0c0000000000000000000000000000000000003, 0xd0d0000000000000000000000000000000000004, 0xe0e0000000000000000000000000000000000005
- `lib\security\audit-watch-get-handler.ts`: 0x0000000000000000000000000000000000000000

## 4. Key Architectural Modules
### Engines (`lib/security/engines/` and `lib/security/v2/`):
- `lib\security\engines\evm-contract-engine.ts`
- `lib\security\engines\index.ts`
- `lib\security\engines\market-asset-engine.ts`
- `lib\security\engines\native-chain-engine.ts`
- `lib\security\engines\types.ts`
- `lib\security\v2\contextual-access-control-engine.ts`
- `lib\security\v2\contextual-oracle-engine.ts`
- `lib\security\v2\contextual-reentrancy-engine.ts`
- `lib\security\v2\defi-economic-attack-engine.ts`
- `lib\security\v2\erc-and-nonstandard-token-engine.ts`
- `lib\security\v2\evm-cfg-dataflow-engine.ts`
- `lib\security\v2\fuzzing-and-invariant-engine.ts`
- `lib\security\v2\master-audit-orchestrator.ts`
- `lib\security\v2\patch-validation-engine.ts`
- `lib\security\v2\scoring-and-evidence-engine.ts`
- `lib\security\v2\solidity-evm-edge-case-engine.ts`
- `lib\security\v2\symbolic-formal-engine.ts`
- `lib\security\v2\types.ts`
- `lib\security\v2\upgradeability-engine.ts`

### Corpus & Mappings:
- `lib\security\corpus\master-50-assets.ts`

### PDF Rendering:
- `lib\security\pro-audit-pdf\customer-safe-renderer.ts`
- `lib\security\pro-audit-pdf\embedded-font-data.ts`
- `lib\security\pro-audit-pdf\NIMBUS_SANS_FONT_NOTICE.md`
- `lib\security\pro-audit-pdf\render-pro-audit-pdf.ts`

### Test Suites:
- `tests\accessibility\a94-focus-locale-metadata.test.ts`
- `tests\adversarial\asset-class-firewall.test.ts`
- `tests\adversarial\check-status-invariants.test.ts`
- `tests\adversarial\cross-asset-truth-and-teaser-isolation.test.ts`
- `tests\adversarial\discovered-failures-regression.test.ts`
- `tests\adversarial\extended-mutation-testing.test.ts`
- `tests\adversarial\golden-security-corpus.test.ts`
- `tests\adversarial\mutation-testing.test.ts`
- `tests\adversarial\payment-red-team.test.ts`
- `tests\adversarial\property-based-invariants.test.ts`
- `tests\adversarial\report-semantic-linter.test.ts`
- `tests\commerce\dynamic-signal-engine.test.ts`
- `tests\e2e\browser-combobox-keyboard-accessibility.spec.ts`
- `tests\e2e\campaign-100-ai-customers.spec.ts`
- `tests\e2e\customers\batch-01.spec.ts`
- `tests\e2e\customers\batch-02.spec.ts`
- `tests\e2e\customers\batch-03.spec.ts`
- `tests\e2e\customers\batch-04.spec.ts`
- `tests\e2e\customers\batch-05.spec.ts`
- `tests\e2e\customers\batch-06.spec.ts`
- `tests\e2e\customers\batch-07.spec.ts`
- `tests\e2e\customers\batch-08.spec.ts`
- `tests\e2e\customers\batch-09.spec.ts`
- `tests\e2e\customers\batch-10.spec.ts`
- `tests\e2e\deep-customers\deep-batch-01.spec.ts`
- `tests\e2e\deep-customers\deep-batch-02.spec.ts`
- `tests\e2e\deep-customers\deep-batch-03.spec.ts`
- `tests\e2e\deep-customers\deep-batch-04.spec.ts`
- `tests\e2e\deep-customers\deep-batch-05.spec.ts`
- `tests\e2e\deep-customers\deep-batch-06.spec.ts`
- `tests\e2e\deep-customers\deep-batch-07.spec.ts`
- `tests\e2e\deep-customers\deep-batch-08.spec.ts`
- `tests\e2e\deep-customers\deep-batch-09.spec.ts`
- `tests\e2e\deep-customers\deep-batch-10.spec.ts`
- `tests\e2e\giga-customers\giga-batch-01.spec.ts`
- `tests\e2e\giga-customers\giga-batch-02.spec.ts`
- `tests\e2e\giga-customers\giga-batch-03.spec.ts`
- `tests\e2e\giga-customers\giga-batch-04.spec.ts`
- `tests\e2e\giga-customers\giga-batch-05.spec.ts`
- `tests\e2e\giga-customers\giga-batch-06.spec.ts`
- `tests\e2e\giga-customers\giga-batch-07.spec.ts`
- `tests\e2e\giga-customers\giga-batch-08.spec.ts`
- `tests\e2e\giga-customers\giga-batch-09.spec.ts`
- `tests\e2e\giga-customers\giga-batch-10.spec.ts`
- `tests\e2e\pass2892-shield-realmarkets-pdf-smoke.spec.ts`
- `tests\e2e\pass2893-release-evidence-bundle.spec.ts`
- `tests\e2e\pass2894-operator-go-no-go.spec.ts`
- `tests\e2e\pass2895-receipt-freshness-quarantine.spec.ts`
- `tests\e2e\pass2896-tamper-proof-release-ledger.spec.ts`
- `tests\e2e\pass2897-release-attestation-verifier.spec.ts`
- `tests\e2e\pass2898-release-revocation-rollback-sentinel.spec.ts`
- `tests\e2e\pass2899-post-rollback-recovery-reapproval.spec.ts`
- `tests\e2e\pass2900-release-continuity-lock.spec.ts`
- `tests\e2e\pass2901-release-promotion-escrow.spec.ts`
- `tests\e2e\pass2902-production-claim-notarization.spec.ts`
- `tests\e2e\pass2903-post-claim-surveillance-probation.spec.ts`
- `tests\e2e\pass2904-claim-expiry-renewal.spec.ts`
- `tests\e2e\pass2905-public-claim-transparency.spec.ts`
- `tests\e2e\pass2906-public-status-dispute-correction.spec.ts`
- `tests\e2e\pass2907-public-status-appeal-independent-review.spec.ts`
- `tests\e2e\pass2908-public-status-final-arbitration.spec.ts`
- `tests\e2e\pass2909-post-arbitration-public-resolution-seal.spec.ts`
- `tests\e2e\pass2910-remediation-execution-closure.spec.ts`
- `tests\e2e\pass2911-post-remediation-stability-watch.spec.ts`
- `tests\e2e\pass2912-post-remediation-trust-restore-handover.spec.ts`
- `tests\e2e\pass2913-post-restore-continuity-monitor.spec.ts`
- `tests\e2e\pass2914-public-trust-evidence-decay-renewal-escrow.spec.ts`
- `tests\e2e\pass2915-renewal-escrow-promotion-quarantine.spec.ts`
- `tests\e2e\pass2916-renewal-promotion-final-seal.spec.ts`
- `tests\e2e\pass2917-scheduled-revalidation-execution-breach.spec.ts`
- `tests\e2e\pass2918-downgrade-recovery-escrow.spec.ts`
- `tests\e2e\pass2919-recovery-replay-adjudication.spec.ts`
- `tests\e2e\pass2920-recovery-restore-candidate-probation.spec.ts`
- `tests\e2e\pass2921-probation-exit-seal.spec.ts`
- `tests\e2e\pass2922-post-graduation-public-restore-seal.spec.ts`
- `tests\e2e\pass2935-mega-core-execution-batch.spec.ts`
- `tests\e2e\pass2945-2960-worldclass-full-closure.spec.ts`
- `tests\e2e\pass2961-2975-zero-skip-product-launch-closure.spec.ts`
- `tests\e2e\pass2976-3000-ultimate-zero-skip-pre-final-closure.spec.ts`
- `tests\e2e\pass3051-3100-execution-readiness-hardening.spec.ts`
- `tests\e2e\pass3101-3150-final-execution-control-plane.spec.ts`
- `tests\e2e\pass3151-3200-preflight-remediation-control-plane.spec.ts`
- `tests\e2e\pass3201-3300-100k-zero-skip-prepared.spec.ts`
- `tests\e2e\pass3301-3400-runtime-remediation-expansion.spec.ts`
- `tests\e2e\pass3401-3500-real-code-repair.spec.ts`
- `tests\e2e\pass3501-critical-runtime-repair.spec.ts`
- `tests\e2e\pass3601-3700-real-runtime-closure.spec.ts`
- `tests\e2e\pass3701-3800-real-runtime-enforcement.spec.ts`
- `tests\e2e\pass3901-4000-real-runtime-proof.spec.ts`
- `tests\e2e\pass4678-asset-detail-popup-visual-gates.spec.ts`
- `tests\e2e\pass4687-asset-popup-browser-receipt.spec.ts`
- `tests\e2e\shield-map-combobox-keyboard-accessibility.spec.ts`
- `tests\fixtures\golden-security-corpus\blacklist-freeze.json`
- `tests\fixtures\golden-security-corpus\broken-access-control.json`
- `tests\fixtures\golden-security-corpus\false-positive-traps.json`
- `tests\fixtures\golden-security-corpus\fee-manipulation.json`
- `tests\fixtures\golden-security-corpus\flash-loan-attack-pattern.json`
- `tests\fixtures\golden-security-corpus\malicious-honeypot.json`
- `tests\fixtures\golden-security-corpus\mint-authority-abuse.json`
- `tests\fixtures\golden-security-corpus\oracle-manipulation.json`
- `tests\fixtures\golden-security-corpus\owner-drain.json`
- `tests\fixtures\golden-security-corpus\pause-freeze.json`
- `tests\fixtures\golden-security-corpus\reentrancy-vulnerable.json`
- `tests\fixtures\golden-security-corpus\safe-contract.json`
- `tests\fixtures\golden-security-corpus\timelock-bypass.json`
- `tests\fixtures\golden-security-corpus\unprotected-proxy.json`
- `tests\intelligence\velmere-proprietary-algorithms.test.ts`
- `tests\live\pass4791-live-evidence-matrix.json`
- `tests\market-integrity\eight-canonical-customer-journeys.test.ts`
- `tests\market-integrity\twenty-assets-shield-and-real-markets.test.ts`
- `tests\pass36\a102r44p10-active-copy-truth.mjs`
- `tests\pass36\a102r44p10-customer-truth-normalizer.mjs`
- `tests\pass36\a102r44p10-metamorphic-generalization.mjs`
- `tests\pass36\a102r44p10-real-local-e2e.mjs`
- `tests\pass36\a102r44p11-angel-multicoin-safety.ts`
- `tests\pass36\a102r44p14-weak-category-recall-and-control-suppression.mjs`
- `tests\pass36\a102r44p15-reentrancy-recall-and-control-suppression.mjs`
- `tests\pass36\a102r44p15-reentrancy-source-parity-and-control-suppression.mjs`
- `tests\pass36\a102r44p16-current-sku-runtime.ts`
- `tests\pass36\a102r44p9-customer-truth-normalizer.mjs`
- `tests\pass36\a102r44p9-metamorphic-generalization.mjs`
- `tests\pass36\a102r44p9-real-local-e2e.mjs`
- `tests\security\a102-account-artifact-preview-download-parity.test.ts`
- `tests\security\a102-account-customer-artifact-client-contract.test.ts`
- `tests\security\a102-ai-brain-learning-claims-truth.test.ts`
- `tests\security\a102-analysis-active-surface-reachability.test.mjs`
- `tests\security\a102-analysis-confidence-calibration-truth.test.ts`
- `tests\security\a102-analysis-information-value-truth.test.ts`
- `tests\security\a102-angel-ai-disclosure-and-public-topology.test.ts`
- `tests\security\a102-angel-primary-route-safety-boundary.test.ts`
- `tests\security\a102-angel-standalone-output-truth.test.ts`
- `tests\security\a102-asset-detail-shadow-drift.test.ts`
- `tests\security\a102-audit-reachable-customer-output-truth.test.ts`
- `tests\security\a102-browser-pdf-evidence-confidence-separation.test.ts`
- `tests\security\a102-current-evidence-availability-matrix.test.ts`
- `tests\security\a102-evidence-availability-artifact-methodology-binding.test.ts`
- `tests\security\a102-evidence-availability-dynamic-tier.test.ts`
- `tests\security\a102-exact-customer-pdf-delivery.test.ts`
- `tests\security\a102-internal-ai-dual-ledger.test.mjs`
- `tests\security\a102-lens-public-source-metric-truth.test.ts`
- `tests\security\a102-lens-report-source-metric-truth.test.ts`
- `tests\security\a102-lens-source-token-transport.test.ts`
- `tests\security\a102-market-intelligence-current-output-withheld.test.ts`
- `tests\security\a102-p35-authority-handoff.test.mjs`
- `tests\security\a102-p35-internal-ai-availability-ledger.test.mjs`
- `tests\security\a102-p36-ai-final-output-revalidation.test.mjs`
- `tests\security\a102-p36-authority-deep-validation.test.mjs`
- `tests\security\a102-p36-browser-tier-runtime-profiles.test.mjs`
- `tests\security\a102-p36-current-byte-build-gates.test.mjs`
- `tests\security\a102-p36-exact-customer-pdf-integration.test.ts`
- `tests\security\a102-p36-internal-final-tier-campaign.test.mjs`
- `tests\security\a102-p36-package-current-source-cross-bindings.test.py`
- `tests\security\a102-p36-public-readiness-handler-integration.test.ts`
- `tests\security\a102-paid-account-delivery-public-contract.test.ts`
- `tests\security\a102-paid-readiness-decomposition.test.ts`
- `tests\security\a102-public-audit-asset-evidence-coverage-truth.test.ts`
- `tests\security\a102-public-tier-readiness-contract.test.ts`
- `tests\security\a102-real-markets-cross-surface-truth.test.ts`
- `tests\security\a102-risk-indicator-confidence-truth.test.ts`
- `tests\security\a102-shield-map-input-sufficiency-truth.test.ts`
- `tests\security\a102-shield-pro-customer-truth.test.ts`
- `tests\security\a85-shield-map-exact-identity.test.ts`
- `tests\security\a90-a92-runtime-boundaries.test.ts`
- `tests\security\a90-api-edge-boundary.test.ts`
- `tests\security\a91-product-image-boundary.test.ts`
- `tests\security\a91-raster-container-boundary.test.ts`
- `tests\security\a94-analysis-client-boundary.test.ts`
- `tests\security\a94-denominator-truth-boundary.test.ts`
- `tests\security\ai-clients-auditors-30-tier-matrix.test.ts`
- `tests\security\ai-clients-auditors-30-tier-matrix.ts`
- `tests\security\audit-account-message-tenant-isolation.test.ts`
- `tests\security\audit-execution-packet-release-gate.test.ts`
- `tests\security\canonical-audit-parity-and-entitlement.test.ts`
- `tests\security\canonical-audit-tri-locale.test.ts`
- `tests\security\cftc-cot-official-reference-boundary.test.ts`
- `tests\security\legacy-market-routes-boundary.test.ts`
- `tests\security\p0-privacy-incident-asset-boundary.test.ts`
- `tests\security\production-fixture-route-guard.test.ts`
- `tests\security\real-markets-rights-before-network-boundary.test.ts`
- `tests\security\sec-edgar-reference-policy.test.ts`
- `tests\security\section43-expansion-integrity.test.ts`
- `tests\security\security-admin-post-contracts.test.ts`
- `tests\security\shield-map-customer-asset-display-boundary.test.ts`
- `tests\security\shield-map-customer-confidence-boundary.test.ts`
- `tests\security\shield-map-customer-identity-boundary.test.ts`
- `tests\security\shield-pro-calibrated-confidence-boundary.test.ts`
- `tests\security\shield-pro-table-field-projection-boundary.test.ts`
- `tests\security\shield-pro-tier-topology-runtime.test.ts`
- `tests\security\stripe-webhook-proxy-route.test.ts`
- `tests\security\trusted-provider-ingress-auth.test.ts`
- `tests\security\twenty-contracts-audit-and-pdf.test.ts`
- `tests\security\v4-account-data-export-boundary.test.ts`
- `tests\security\v4-account-erasure-boundary.test.ts`
- `tests\security\v4-angel-grounding-before-provider-boundary.test.ts`
- `tests\security\v4-audit-verify-producer-runtime.test.ts`
- `tests\security\v4-shield-table-receipt-projection-boundary.test.ts`
- `tests\security\v4-verify-canonical-deployment-identity.test.ts`
- `tests\security\v4-verify-continuous-monitor-route.test.ts`
- `tests\security\v4-verify-continuous-monitor-runtime.test.ts`
- `tests\security\vlm-service-verify-preflight.test.ts`
- `tests\security\world-bank-wdi-official-reference-boundary.test.ts`
- `tests\staging\pass23\rls-policy-structural-preflight.sql`
- `tests\staging\pass36\a96-rls-19-case-replay.sql`
- `tests\unit\ai-vlm-security.test.ts`
- `tests\unit\auth-session-rls-tenant-isolation.test.ts`
- `tests\unit\canonical-market-data-normalization.test.ts`
- `tests\unit\payment-checkout-entitlement-webhooks.test.ts`
- `tests\unit\provider-pipeline-provenance-normalization.test.ts`
- `tests\unit\provider-resilience-contradiction-fallback.test.ts`
- `tests\unit\real-markets-customer-catalog.test.ts`
- `tests\unit\risk-engine-determinism-bounds-traceability.test.ts`
- `tests\unit\risk-engine-sensitivity-audit.test.ts`
- `tests\unit\security-api-edge-boundary.test.ts`
- `tests\unit\security-api-error-envelope.test.ts`
- `tests\unit\tier-gates-and-customer-value.test.ts`

### State Files:
- `.velmere\audit-furnace-state.json`
- `.velmere\deployment-builds\2026-09-01T20-10-39.562Z-turbopack-compile.log`
- `.velmere\deployment-builds\2026-09-01T20-10-39.562Z-turbopack-generate.log`
- `.velmere\deployment-builds\2026-09-01T20-10-39.562Z-turbopack-segmented.json`
- `.velmere\deployment-builds\2026-09-02T02-24-44.163Z-turbopack-compile.log`
- `.velmere\deployment-builds\2026-09-02T02-24-44.163Z-turbopack-generate.log`
- `.velmere\deployment-builds\2026-09-02T02-24-44.163Z-turbopack-segmented.json`
- `.velmere\deployment-builds\2026-09-02T04-17-02.928Z-turbopack-compile.log`
- `.velmere\deployment-builds\2026-09-02T04-17-02.928Z-turbopack-generate.log`
- `.velmere\deployment-builds\2026-09-02T04-17-02.928Z-turbopack-segmented.json`
- `.velmere\deployment-builds\2026-09-02T10-39-05.014Z-turbopack-segmented.json`
- `.velmere\deployment-builds\2026-09-02T10-39-26.125Z-turbopack-segmented.json`
- `.velmere\deployment-builds\2026-09-02T10-39-43.067Z-turbopack-segmented.json`
- `.velmere\deployment-builds\2026-09-02T10-45-08.708Z-turbopack-segmented.json`
- `.velmere\deployment-builds\2026-09-02T11-25-31.911Z-webpack-compile.log`
- `.velmere\deployment-builds\2026-09-02T11-25-31.911Z-webpack-generate.log`
- `.velmere\deployment-builds\2026-09-02T11-25-31.911Z-webpack-segmented.json`
- `.velmere\deployment-builds\2026-09-02T14-05-23.959Z-webpack-compile.log`
- `.velmere\deployment-builds\2026-09-02T14-05-23.959Z-webpack-generate.log`
- `.velmere\deployment-builds\2026-09-02T14-05-23.959Z-webpack-segmented.json`
- `.velmere\deployment-builds\2026-09-02T15-57-27.955Z-webpack-compile.log`
- `.velmere\deployment-builds\2026-09-02T15-57-27.955Z-webpack-generate.log`
- `.velmere\deployment-builds\2026-09-02T15-57-27.955Z-webpack-segmented.json`
- `.velmere\deployment-builds\2026-09-02T15-59-42.943Z-webpack-compile.log`
- `.velmere\deployment-builds\2026-09-02T15-59-42.943Z-webpack-generate.log`
- `.velmere\deployment-builds\2026-09-02T15-59-42.943Z-webpack-segmented.json`
- `.velmere\dev-runtime\cache-marker.json`
- `.velmere\dev-runtime\source-fingerprint.json`
- `.velmere\execution-state.json`
- `.velmere\pass14-diagnostics\build-graph-profile.json`
- `.velmere\pass14-diagnostics\database-contract-audit.json`
- `.velmere\pass16-diagnostics\worldclass-corpus-verification.json`
- `.velmere\pass16-diagnostics\worldclass-output-contract-verification.json`
- `.velmere\pass21-diagnostics\merchant-legal-readiness.json`
- `.velmere\pass21-diagnostics\provider-rights-audit.json`
- `.velmere\pass23-diagnostics\rls-staging-harness-verification.json`
- `.velmere\pass25-diagnostics\prebuild-readiness.json`