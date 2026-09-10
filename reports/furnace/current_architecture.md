# VELMÈRE COMPREHENSIVE ARCHITECTURE DIAGRAM (FURNACE v2)

*System Version: 2.4.0-worldclass*  
*Standard: OWASP-SC-TOP10 + ERC-STANDARDS + FAIL-CLOSED-EVIDENCE-V3*

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayers[Client Interfaces & Surfaces]
        UI_B[Surface 1: Browser\n/en/browser\nProduct & Token Intelligence]
        UI_S[Surface 2: Shield\n/en/shield\nSecurity Telemetry & Map]
        UI_SP[Surface 3: Shield Pro\n/en/shield-pro\nDeep Contract Forensics]
        UI_RM[Surface 4: Real Markets\n/en/real-markets\nTradFi & Cross-Asset Intelligence]
    end

    subgraph IngressSecurity[Edge & Ingress Security Boundary]
        API_G[API Guard & Rate Limiter\nlib/security/api-guard.ts]
        SEC_HDR[Security Headers & CSP\nlib/security/http-security.mjs]
        AUTH_RLS[Auth & Supabase RLS Gate\nlib/security/cookie-session-boundary.ts]
    end

    subgraph AssetFirewall[Asset Class Firewall\nlib/security/asset-class-firewall.ts]
        FW{Validate Asset Class}
        FW -->|EVM_CONTRACT| RT_EVM[EVM Analyzer Pipeline]
        FW -->|NATIVE_BLOCKCHAIN| RT_L1[L1 Validator & Telemetry Pipeline]
        FW -->|EQUITY / ETF / FX| RT_MK[Market & TradFi Engine]
        FW -->|FIXTURE| RT_FIX[Isolated Fixture Sandbox\nLabel: SIMULATED_FIXTURE]
        FW -->|Cross-Class Contamination| REJ_FAIL[REJECT / FAIL-CLOSED]
    end

    subgraph SecurityEngines[Core Analysis & Security Engines]
        ENG_BC[Malformed Bytecode Guard\nlib/security/bytecode/malformed-bytecode-guard.ts]
        ENG_PRX[Proxy & Upgradeability Engine\nlib/security/proxy/proxy-analysis-engine.ts]
        ENG_ORC[Oracle & Flash-Loan Engine\nlib/security/oracle/oracle-risk-engine.ts]
        ENG_ATK[Attack Surface Engine\nlib/security/attack-surface/attack-surface-model.ts]
        ENG_FRS[Data Freshness Engine\nlib/security/freshness/data-freshness-engine.ts]
        ENG_REM[Remediation Lifecycle Machine\nlib/security/remediation/remediation-lifecycle.ts]
    end

    subgraph EvidenceGraphSystem[Evidence Graph & Provenance System]
        EV_GRAPH[Evidence Graph Engine\nlib/security/evidence/evidence-graph.ts]
        EV_STORE[Immutable Evidence Vault\n/evidence/]
        CLM_LEDGER[Class A-F Claim Model\nlib/security/evidence/claim-evidence-model.ts]
        MRK_TREE[Merkle Commitment Tree\nlib/security/audit-merkle-commitment.ts]
    end

    subgraph StripeCommerce[Stripe Commerce & Server-Side Entitlement]
        ST_SRV[Stripe Server Client\nlib/stripe/server.ts\nSecret: sk_...REDACTED]
        ST_WH[Stripe Webhook Ingress\napp/api/stripe/webhook/route.ts]
        ST_RECON[Webhook Reconciler & Idempotency\nlib/payments/stripe-webhook-effect-ledger.ts]
        ENT_GATE[Server Entitlement Gate\nlib/security/audit-tier-contract.ts]
    end

    subgraph CertificationOutput[Certified Output & Verification]
        PDF_ENG[PDF-1.7 Vector Renderer\nlib/security/audit-report-exact-pdf-artifact.ts]
        PKI_SIGN[Ed25519 PKI Attestation\nlib/security/audit-pki-signature.ts]
        CLI_VERIFY[Velmère Verification CLI\nscripts/velmere-cli.ts]
    end

    UI_B & UI_S & UI_SP & UI_RM --> API_G --> SEC_HDR --> AUTH_RLS --> FW
    RT_EVM --> ENG_BC --> ENG_PRX & ENG_ORC & ENG_ATK
    RT_L1 & RT_MK --> ENG_FRS
    ENG_BC & ENG_PRX & ENG_ORC & ENG_ATK & ENG_FRS --> EV_GRAPH
    EV_GRAPH --> CLM_LEDGER --> MRK_TREE --> EV_STORE
    
    UI_SP & UI_RM -->|Locked Tier Action| ST_SRV --> ST_WH --> ST_RECON --> ENT_GATE
    ENT_GATE -->|Tier Gating Filter| PDF_ENG
    
    EV_GRAPH & MRK_TREE --> PDF_ENG --> PKI_SIGN --> CLI_VERIFY
```

---

## 2. Invariant Enforcement & Fail-Closed Boundaries

### 2.1 Bytecode Integrity Invariant
$$\text{bytecode} \in \{\emptyset, \text{invalid\_hex}, < 8\text{ bytes}\} \implies \begin{cases} \text{claims}_{\text{bytecode}} = 0 \\ \text{riskScore} = \text{null (NOT SCORED)} \\ \text{status} = \text{missing} \end{cases}$$

### 2.2 Asset Class Isolation Boundary
Each analysis pipeline declares an immutable whitelist:
$$\text{Analyzer}(A) \implies A.\text{class} \in \text{Analyzer}.\text{supportedClasses}$$
If $A.\text{class} \notin \text{Analyzer}.\text{supportedClasses}$, the request is rejected with `[FAIL-CLOSED FIREWALL]` and zero downstream execution occurs.

### 2.3 Entitlement & Webhook Invariant
No client state (`localStorage`, query parameter, or cookie) can grant entitlement. Entitlement is granted strictly upon:
1. Server-side verification of `Stripe-Signature` header via HMAC-SHA256.
2. Verified event status `checkout.session.completed` or `customer.subscription.created`.
3. Idempotent insertion into `stripe-webhook-effect-ledger.ts` preventing duplicate fulfillment.
4. Cryptographic attestation binding the user ID to the subscription period.

---

## 3. Data Flow Across the 4 Application Surfaces

### Surface 1: Browser (`/[locale]/browser`)
- **Primary Function:** Public search, real-time token telemetry, overview risk grades.
- **Data Pathways:**
  - Ingests tickers and contract addresses via `/api/search`.
  - Displays verified token metrics, DEX liquidity, and basic risk classification.
  - Generates Basic Tier PDF on request.

### Surface 2: Shield (`/[locale]/shield`)
- **Primary Function:** Systemic on-chain security monitoring, vulnerability map, threat telemetry.
- **Data Pathways:**
  - Queries real-time whale watch and contract anomaly feeds.
  - Renders threat radar across verified protocols.
  - Rejects unverified synthetic data.

### Surface 3: Shield Pro (`/[locale]/shield-pro`)
- **Primary Function:** Institutional smart contract audit, bytecode disassembly, selector collision analysis.
- **Data Pathways:**
  - Disassembles runtime bytecodes via `evm-bytecode-analyzer.ts`.
  - Validates EIP-1167, EIP-1967, and EIP-2535 proxy implementations.
  - Requires active Pro or Advanced server-side entitlement to unlock remediation diffs.

### Surface 4: Real Markets (`/[locale]/real-markets`)
- **Primary Function:** Traditional financial intelligence, equities, ETFs, FX, commodity futures.
- **Data Pathways:**
  - Queries multi-source financial oracles with staleness monitoring.
  - Prohibits blockchain-specific terminology (Solidity, delegatecall) on equities.
  - Executes cross-asset volatility and liquidity depth assessments.
