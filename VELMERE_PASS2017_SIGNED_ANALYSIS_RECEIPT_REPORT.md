# Velmère PASS2017 - Signed Analysis Receipt

## Realny przepływ

Każda analiza VLM otrzymuje receipt obejmujący:

`facts hash + sources hash + output hash + policy hash + Shadow Brain status + model + trace ID + asset ID`

Jeżeli `VELMERE_VLM_RECEIPT_SECRET` ma minimum 32 znaki, receipt jest podpisany `HMAC-SHA256`. Bez klucza system jawnie zwraca `signing: unsigned` i `signature: null`.

## Co wykrywa weryfikator

| Manipulacja | Wynik |
|---|---|
| zmiana faktu | `facts_modified` |
| zmiana listy źródeł | `sources_modified` |
| zmiana tekstu, confidence lub werdyktu | `output_modified` |
| zmiana zasad procesu | `policy_modified` |
| podmiana trace ID | `trace_mismatch` |
| podmiana aktywa w odpowiedzi | `output_asset_mismatch` |
| zmiana statusu Shadow Brain lub metadanych | `signature_invalid` |
| brak klucza weryfikacyjnego | `verification_key_unavailable` |
| brak podpisu | `receipt_unsigned` |

## Endpoint

`POST /api/market-integrity/vlm/verify`

Przyjmuje receipt, canonical fact packet i output. Endpoint ma:

- limit 96 KB,
- kontrolę origin,
- rate limit,
- odpowiedzi `no-store`,
- wpis do redagowanego VLM Security Ledger przy nieudanej weryfikacji.

## Cache

Receipt nie jest ślepo kopiowany z cache. Po trafieniu cache system nadaje publicznej odpowiedzi nowy trace ID i timestamp, a następnie tworzy dla niej nowy pasujący receipt.

## VLM Security

Centralny detektor blokuje teraz próby:

- sfałszowania receipt,
- podmiany podpisu lub hashy,
- wymuszenia statusu `valid`,
- nadpisania kontroli integralności,

w języku polskim, angielskim i niemieckim.

## Uczciwe ograniczenia

1. HMAC potwierdza integralność i posiadanie wspólnego sekretu przez serwer. Nie jest publicznym podpisem asymetrycznym.
2. Do publicznej, niezależnej weryfikacji potrzebny będzie Ed25519 z publikowanym kluczem publicznym.
3. Receipt nie dowodzi, że zewnętrzne źródło mówi prawdę. Dowodzi, że źródła i wynik nie zostały zmienione po podpisaniu.
