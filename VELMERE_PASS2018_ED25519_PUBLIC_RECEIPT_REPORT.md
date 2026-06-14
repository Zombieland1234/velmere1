# Velmère PASS2018 - Ed25519 Public Receipt

## Co działa realnie

PASS2018 zmienia receipt na `velmere.vlm.receipt.v2` i dodaje prawdziwy podpis asymetryczny Ed25519.

`private key -> podpisuje receipt`

`public key -> weryfikuje receipt, ale nie może tworzyć podpisów`

## Hierarchia podpisu

1. Ed25519, gdy ustawiono poprawny klucz prywatny.
2. HMAC-SHA256 jako kompatybilny fallback serwerowy.
3. `unsigned`, gdy nie ma żadnego poprawnego klucza.

System nie udaje podpisu, jeśli konfiguracja jest niepełna.

## Rotacja kluczy

- `VELMERE_VLM_RECEIPT_ACTIVE_KEY_ID` identyfikuje aktywny klucz.
- `VELMERE_VLM_RECEIPT_PREVIOUS_PUBLIC_KEYS_JSON` przechowuje poprzednie klucze publiczne.
- Nowe analizy są podpisywane aktywnym kluczem.
- Stare receipt mogą być nadal zweryfikowane poprzednim kluczem publicznym.
- Prywatny klucz nigdy nie trafia do endpointu publicznego.

## Publiczny endpoint kluczy

`GET /api/market-integrity/vlm/keys`

Zwraca tylko:

- `keyId`,
- algorytm,
- publiczny PEM,
- fingerprint,
- status `active` albo `previous`.

## Generator kluczy

`node scripts/generate-vlm-receipt-ed25519-keys.mjs`

Generuje dopasowaną parę PKCS8/SPKI, fingerprint oraz losowy `keyId`. Niczego nie zapisuje do repozytorium. Klucz prywatny należy wkleić wyłącznie do serwerowego secret managera.

## Freshness i replay

Każdy receipt ma `createdAt` i `expiresAt`.

- receipt po terminie: `receipt_expired`,
- data z przyszłości: `receipt_from_future`,
- błędny zakres czasu: `invalid_receipt_time`.

Endpoint weryfikacji obsługuje opcjonalne `consume: true`. Pierwsze użycie przechodzi, a kolejne zwraca `409` z `receipt_replay_detected`.

## Uczciwe ograniczenia

1. Rejestr jednokrotnego użycia jest obecnie pamięciowy i resetuje się przy restarcie instancji.
2. Distributed replay protection wymaga Redis/Upstash z atomowym `SET NX`.
3. Publiczny podpis dowodzi integralności i pochodzenia od posiadacza klucza prywatnego, ale nie prawdziwości zewnętrznego źródła.
