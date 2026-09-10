# VELMÈRE WORLD-CLASS GAP MATRIX & REMEDIATION ROADMAP (FURNACE v2)

*Standard: ISO/IEC 25010 Quality Model & OWASP ASVS Level 3*  
*Cycles Assigned: 01 through 10*

---

## 1. Comprehensive Capability Gap Analysis

| # | Capability Area | Current Local State | Best-in-Class Benchmark (Certora / Slither / OpenZeppelin / Stripe) | Evidence Required for Parity | Exact Missing Pieces in Legacy State | Remediation Action Plan | Assigned Cycle | Closure Criteria |
|---|---|---|---|---|---|---|---|---|
| **01** | **Bytecode Ingestion & Validation** | Returns synthetic pass on empty/malformed bytecode | Slither / Mythril fail-closed parser | Proof of zero claims generated and "NOT SCORED" status on invalid hex | Malformed hex defaulted to "Zero Destructive Opcodes: verified" | Implement \`malformed-bytecode-guard.ts\` with strict byte length & hex validation | **Cycle 01** | Empty hex -> claims=0, riskScore=null, status="missing" |
| **02** | **Evidence Lineage & Provenance** | Findings had loose text descriptions | RFC 6962 Merkle Trees, W3C PROV-O | Unique Claim IDs (CLM-xxx) tied to Evidence IDs (EVD-xxx) with input hash | No claim-evidence relational model; no Merkle root commitments | Implement \`claim-evidence-model.ts\` and \`evidence-graph.ts\` | **Cycle 02** | 100% of findings linked to verifiable evidence with Merkle root |
| **03** | **Provider Redundancy & Quorum** | Single-provider failure led to generic crash or empty state | Chainlink DON 3-of-4 quorum, Infura/Alchemy auto-switch | Primary/Secondary/Tertiary failover logs with latency metrics | No multi-provider fallback; no delta-tolerance check | Implement 3-rank provider matrix with consensus validation | **Cycle 03** | Simulated primary failure smoothly transitions to secondary within 1500ms |
| **04** | **Asset Class Firewall** | Basic symbol check; potential EVM leak to equities | Chainalysis multi-asset separation | Strict firewall rejection of cross-class attributes | Equities could theoretically receive contract audit fields | Build \`asset-class-firewall.ts\` with 8 canonical asset classes | **Cycle 04** | Zero EVM terms on equities; Zero stock metrics on contracts |
| **05** | **Real Browser Visual QA & Parity** | Headless unit tests without visual rendering proof | Playwright screenshot pixel diffing + typography validation | Viewport captures (Desktop/Mobile) + PDF extracted text parity | PDF and UI could diverge in typography or data points | Full Playwright capture across all 4 surfaces (600 captures) | **Cycle 05** | Exact data parity between UI screen, backend JSON, and PDF text |
| **06** | **Stripe Commerce & Entitlement** | Basic mock entitlement flags in local storage | Stripe Billing, Radar, Webhook Event Ledgers | Webhook HMAC validation logs + duplicate replay rejection | Local storage could bypass paywall in demo mode | Server-only Stripe key isolation + idempotent effect ledger | **Cycle 06** | Replayed webhook rejected; unverified client denied advanced PDF |
| **07** | **Performance & Concurrency** | Synchronous heavy calculations blocked API responses | Cloudflare Workers / Fastify rate limiting | Route latency < 500ms under 50 concurrent requests | Unbounded recursion in AST decompilation | Introduce bounded path analysis & route concurrency budget | **Cycle 07** | P95 latency < 350ms across all 4 surfaces |
| **08** | **World-Class UX & Product Polish** | Technical text without clear risk taxonomy | OpenZeppelin Defender / Linear design language | Multi-locale responsive UI (1440px / 375px) with dark mode | Polish translation gaps and dense unformatted JSON dumps | Tri-locale typography polish, responsive modals, clear risk badges | **Cycle 08** | WCAG 2.1 AA compliant; Polish/German complete; zero layout shift |
| **09** | **Adversarial Red Team Corpus** | Standard happy-path unit test coverage | Crytic golden test suites, Trail of Bits CTF | 42 passing adversarial test vectors | No test coverage for odd hex, storage clashing, or spoofed webhooks | Build \`world-class-adversarial-corpus.test.ts\` | **Cycle 09** | 42/42 adversarial tests pass (0 failures) |
| **10** | **Independent Release Audit** | Self-reported manual readiness checklist | Third-party SOC2 / ISO audit dossier | Ed25519 digitally signed release manifest + checksum validation | No machine-verifiable final release seal | Build \`velmere-cli.ts\` and generate signed release manifest | **Cycle 10** | CLI verifies 100% of PDFs and manifest signatures match |

---

## 2. Closure Criteria & Verification Protocols

Each gap is considered closed ONLY when:
1. The corresponding unit/integration test vector passes deterministically.
2. The change is recorded in the cycle's `findings.json` and `fixes.json`.
3. An audit artifact confirms no regressions across the existing 42-vector corpus.
4. Machine-readable logs document the exact execution timestamp, duration, and output hash.
