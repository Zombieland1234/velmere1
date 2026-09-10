Tak — po zestawieniu waszego obecnego Furnace 3.0 z aktualnymi wzorcami OpenZeppelin, EIP-712/EIP-2612, Chainlink i publicznie opisanymi przypadkami read-only reentrancy, te 5 klas traktowałbym jako najwyższy priorytet.

Najważniejsze jest jednak to, że nie powinny być dodane jako kolejne regexy. Powinny wejść jako semantic/data-flow detector layer, bo np. latestRoundData() samo w sobie nie oznacza bezpiecznego oracle’a, a safeTransferFrom() nie oznacza, że vault poprawnie rozlicza fee-on-transfer.

1. ERC-4626 Inflation / Share Inflation

Rule: VLM-DEFI-4626-01 — P0/Critical

Wykrywaj:
deposit/mint/withdraw/redeem, totalAssets, totalSupply, convertToShares, convertToAssets oraz ręczne wzory typu:

solidity
shares = assets * totalSupply() / totalAssets();
assets = shares * totalAssets() / totalSupply();

Najgroźniejszy pattern to:

asset transfer
      ↓
amount użyty bezpośrednio do księgowania
      ↓
shares = f(amount, totalAssets, totalSupply)
      ↓
brak virtual assets/shares
      ↓
brak slippage / minShares / minAssets

OpenZeppelin opisuje właśnie możliwość inflowania kursu przez bezpośrednią donację aktywów do pustego lub prawie pustego vaulta; obecna implementacja ERC-4626 stosuje virtual values i decimalsOffset. 
OpenZeppelin Docs
+1

2. Read-Only Reentrancy

Rule: VLM-DEFI-REENT-RO-01 — P0/Critical

To jest moim zdaniem najważniejsza rzecz, której typowy AST scanner nie może traktować jako zwykłej reentrancy.

Szukaj:

mutating function
  → external call / callback
  → accounting jeszcze nie zatwierdzony
  → attacker wywołuje view
  → view czyta ten sam stan
  → price/rate/quote/invariant/liquidation value

Balancer opisał dokładnie klasę problemów, w której balances i supply mogły być chwilowo niespójne, a read-only call podczas callbacku prowadził do błędnych rate'ów i potencjalnej ekstrakcji wartości. 
Balancer

Bardzo ważna rzecz dla Furnace: zwykłe nonReentrant na mutatorze nie wystarcza jako evidence of safety. Aktualny OpenZeppelin ma nonReentrantView, który służy właśnie do blokowania odczytu niespójnego stanu. 
GitHub
+1

3. EIP-712 / Replay / Domain / Nonce / Signature Safety

Rule: VLM-AUTH-EIP712-01 — P0/Critical

Silnik powinien rekonstruować signed payload, a nie tylko szukać ecrecover.

Sprawdzaj równocześnie:

digest
 ├─ EIP-712 domain
 │   ├─ chainId
 │   └─ verifyingContract
 ├─ struct hash
 ├─ signer
 ├─ nonce / unique authorization id
 └─ validity window / deadline, jeśli flow go deklaruje

EIP-712 definiuje mechanizm typed-data/domain binding, a EIP-2612 wymaga nonce, deadline i unikalnego domainu dla permit. OpenZeppelin dostarcza do tego EIP712, Nonces, ECDSA i SignatureChecker. 
Ethereum Improvement Proposals
+2
Ethereum Improvement Proposals
+2

W praktyce Furnace powinien wykrywać np.:

solidity
ecrecover(...)

ale również:

solidity
ECDSA.recover(...)
SignatureChecker.isValidSignatureNow(...)
permit(...)
executeWithSig(...)
authorization(...)

i następnie odpowiadać:

Czy nonce jest konsumowany?
Czy signed message jest związany z contractem?
Czy jest związany z chainem?
Czy deadline jest rzeczywiście egzekwowany?
Czy low-s / signature validation jest bezpieczne?
Czy nonce może zostać wykorzystany drugi raz?
4. Fee-on-Transfer / Rebasing / ERC-20 Semantic Mismatch

Rule: VLM-ERC20-SEM-01 — P0/P1

To jest szczególnie ważne, bo tutaj obowiązuje wasze NO EVIDENCE = NO CLAIM.

Nie wolno robić:

transferFrom(token, user, vault, amount)
→ "token jest fee-on-transfer"

To jest tylko hipoteza.

Natomiast można bardzo mocno udowodnić:

solidity
token.safeTransferFrom(user, address(this), amount);
credit[user] += amount;
totalAssets += amount;
_mint(user, sharesFor(amount));

bez:

solidity
before = token.balanceOf(address(this));
...
after = token.balanceOf(address(this));
received = after - before;

Wtedy Furnace wykrywa accounting assumption, a nie zmyśla, że token na pewno pobiera fee.

OpenZeppelin w swoim audycie z 2026 wskazał fee-on-transfer i rebasing jako token classes mogące powodować accounting errors, gdy vault zakłada „normalny” ERC-20. SafeERC20 rozwiązuje problemy z return values, ale nie rozwiązuje różnicy amount vs amount actually received. 
OpenZeppelin
+1

Powinniście więc wprowadzić:

TypeScript
type TokenBehaviorProfile =
  | 'STANDARD'
  | 'FEE_ON_TRANSFER'
  | 'REBASING'
  | 'HOOKED'
  | 'BLACKLISTABLE'
  | 'UNKNOWN';

i osobno:

TypeScript
CONFIRMED
STRONG_SIGNAL
ASSUMPTION_RISK
REQUIRES_RUNTIME_EVIDENCE
5. Chainlink Oracle Staleness + L2 Sequencer

Rule: VLM-ORACLE-LINK-01 — P0/Critical

To powinno być znacznie bardziej rygorystyczne niż:

"uses Chainlink" → PASS

Wymagaj:

latestRoundData()
    ↓
answer > 0
updatedAt != 0
block.timestamp - updatedAt <= maxStaleness
    ↓
network context
    ↓
jeżeli L2:
    sequencer uptime feed
    ↓
sequencer == UP
    ↓
grace period expired

Chainlink wprost wskazuje, że latestAnswer nie zawiera timestampu do walidacji świeżości, natomiast latestRoundData zawiera updatedAt. 
Chainlink Documentation

Dla L2 Chainlink opisuje wykorzystanie Sequencer Uptime Feed oraz grace period po powrocie sequencera; ich przykład konsumenta sprawdza status i czas od startedAt przed użyciem ceny. 
Chainlink Documentation

Najważniejsza zmiana architektoniczna dla Furnace 3.0

Wasze reguły powinny zwracać nie tylko:

TypeScript
{
  ruleId,
  severity,
  confidence
}

ale coś w rodzaju:

TypeScript
type Evidence = {
  kind:
    | 'AST_PATTERN'
    | 'DATA_FLOW'
    | 'CALL_GRAPH'
    | 'STORAGE_DEPENDENCY'
    | 'LIBRARY_PROVENANCE'
    | 'RUNTIME_PROBE'
    | 'NETWORK_CONTEXT';

  nodeIds: string[];
  claim: string;
  strength: 0 | 1 | 2 | 3;
};

type CanonicalFinding = {
  ruleId: string;
  severity: 'P0' | 'P1' | 'P2' | 'INFO';

  status:
    | 'CONFIRMED'
    | 'STRONG_SIGNAL'
    | 'ASSUMPTION_RISK'
    | 'REQUIRES_EVIDENCE';

  confidence: number;
  evidence: Evidence[];
};

Wtedy dopiero naprawdę realizujecie:

NO EVIDENCE = NO CLAIM.

Przykład:

ERC4626 inflation
├─ AST: conversion formula                 ✓
├─ storage dependency: totalAssets         ✓
├─ virtual offset                          ✗
├─ user slippage protection                ✗
└─ reproduction fixture                    ✓
→ CONFIRMED / P0

versus:

Token may be rebasing
├─ token source                            ✗
├─ runtime probe                           ✗
└─ vault uses cached accounting             ✓
→ ASSUMPTION_RISK / P1

To jest różnica między „scannerem z dużą liczbą findings” a dowodowym silnikiem audytowym.

Przygotowałem pełny materiał z dokładnymi kryteriami AST, wektorami ataku, rekomendacjami OpenZeppelin, gotowymi wzorcami TypeScript oraz regression fixtures:

Pobierz: VELMÈRE Furnace 3.0 — Top-5 Detection Gap Analysis

W raporcie zawarłem też wspólny model evidence graph i zestaw testów VLM-RG-*, które warto od razu włączyć do waszego regression suite.