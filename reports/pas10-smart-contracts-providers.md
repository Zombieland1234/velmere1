# PAS 10 — SMART CONTRACTS + CHAINLINK/PYTH/COINGECKO EVALUATION — RAPORT
Data: 2026-09-02 | Mode: SCRIPT INSPECTION + REGISTRY CHECK

## STATUS: PARTIAL ✓ (smart contract harness exists, providers documented)

---

## 1. Smart contract audit harness

Scripts present (all in `scripts/pass35/`):

| Script | Purpose |
|---|---|
| run-audit-a4-slither-case.mjs | Slither static analysis adapter |
| run-audit-a4-solc-case.ts | Solc compiler test |
| run-audit-a5-a06-case.ts | A05 → A06 transition |
| run-audit-a5-semgrep-case.mjs | Semgrep static analysis |
| run-audit-a6-a08-case.ts | A06 → A08 transition |
| run-audit-a6-forge-case.mjs | Foundry/Forge test |
| run-audit-a7-fork-replay-case.mjs | Fork replay |
| run-audit-a8-synthetic-receipts.mjs | Synthetic receipts |

The A04→A08 sequence maps to:
- A04: Solidity source compilation
- A05: A05 specific tests
- A06: Slither static analysis
- A07: Semgrep static analysis
- A08: Forge / Foundry tests

These are SYNTHETIC FIXTURE-BASED scripts (per the script comment
`if (caseInput.inputClass === "SYNTHETIC_OFFLINE" && !outputRelative.startsWith("fixtures/...")`).

## 2. Provider evaluation (from Pas 9 registry + code)

### Chainlink
- Status: **NOT_INTEGRATED** (not in registry, no adapter file)
- Strategic candidate per master mission §3
- Use cases: crypto, FX, commodities, indices, equities, RWA/PoR
- Pas 0 note: positive brand/logo permission received, but NOT
  commercial redistribution license. PAS continues to flag this.

### Pyth
- Status: **CODE_PRESENT, rightsState UNVERIFIED**
- Adapter: `lib/market-integrity/pyth-price-provider.ts`
- Per Pas 1: added in unstaged diff
- Hermes post-26.08.2026 requires API key (B-002)
- Confidence interval + publisher count + freshness available

### CoinGecko
- Status: **CODE_PRESENT, rightsState UNVERIFIED**
- Adapter: `lib/market-integrity/coingecko.ts`
- Keyless mode for dev/prototype
- Demo/Pro for production (per master mission §5)
- B-001: missing key in .env.local

### DeFiLlama
- Status: **CODE_PRESENT, rightsState UNVERIFIED**
- Adapters: `defillama-adapter.ts`, `defillama-expansion.ts`
- ToS restricts commercial reuse — RESTRICTED per master mission §6

### Etherscan / explorers
- Status: **CODE_PRESENT, rightsState UNVERIFIED**
- Adapter: registry entry present
- Master mission §8: prefer direct RPC over explorer families

### OpenAI
- Status: **CODE_PRESENT, rightsState UNVERIFIED**
- Adapter exists for AI draft generation
- For server-side cleanup of imports

### Gemini
- Status: **CODE_PRESENT, rightsState UNVERIFIED**
- Key present in .env.local (B-004 cleared for Gemini)
- Used by Angel AI

### Stripe
- Status: **CODE_PRESENT, rightsState UNVERIFIED**
- Stripe library installed
- Keys MISSING (B-003)
- Webhook handler code exists (per Pas 3 inspection)

### Supabase
- Status: **CODE_PRESENT, rightsState UNVERIFIED**
- URL + keys present in .env.local
- Database migrations present (135 SQL files)

### Printful / Tapstitch / Contrado
- Status: **CODE_PRESENT, rightsState UNVERIFIED**
- All fulfilment providers
- Printful uses PRINTFUL_API_TOKEN (missing)

## 3. Honest limitations

- NO real smart contract compilation tested (synthetic fixtures only)
- NO live provider API calls tested (no keys)
- Chainlink not in registry — major gap
- DexScreener, Blockaid, Arkham, RWA.xyz not in registry

## 4. Self-challenge

| Question | Answer |
|---|---|
| Are smart contracts compilable? | NOT_TESTED live (fixtures only) |
| Are Slither/Semgrep results real? | Synthetic fixtures (admitted in code) |
| Is CoinGecko provider integrated? | YES (code), NO (rights) |
| Is Pyth provider integrated? | YES (code), NO (rights), NO (key) |
| Is Chainlink integrated? | NO |

## 5. Exit criteria check

Exit-criteria: "każdy provider ma status rights + fallback chain"

**PARTIAL PASS**:
- 23 providers tracked in registry (Pas 9)
- All UNVERIFIED rights
- 5 providers missing from registry (Chainlink, DexScreener, Blockaid, Arkham, RWA.xyz)
- Smart contract harness exists but only synthetic fixtures run

The provider matrix is operational but gaps remain for the
Chainlink/DexScreener/Blockaid/Arkham/RWA.xyz additions.