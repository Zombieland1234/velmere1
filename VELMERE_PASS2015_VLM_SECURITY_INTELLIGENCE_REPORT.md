# Velmère PASS2015 - VLM Security Intelligence

## Cel

PASS2015 rozwija centralny `VLM Security`, bez zmian wizualnych. Ochrona obejmuje cały cykl AI:

`request -> query -> prompt -> provider -> tools -> claims -> memory -> response -> security ledger`

## Wdrożone

| Warstwa | Zmiana | Efekt |
|---|---|---|
| VLM Security | scoring 0-100 | wspólna decyzja `none`, `review` albo `block` |
| Prompt defense | role confusion i JSON/ChatML spoofing | blokada podszywania się pod system/developer |
| Data protection | detekcja exfiltracji i internal metadata targets | blokada prób wysyłania sekretów lub rozmowy |
| Tool defense | manipulacja tool/function call | blokada nieautoryzowanego sterowania narzędziami |
| Memory defense | trwałe instrukcje i session poisoning | do pamięci trafiają tylko treści bez flag |
| Obfuscation | NFKC, zero-width, mixed-script review | trudniejsze obchodzenie filtrów znakami podobnymi |
| Context limits | oversized input jako twardy blok | brak cichego przepełniania kontekstu |
| Privacy | keyed HMAC fingerprint | grupowanie ataków bez zapisu ich surowej treści |
| Security Ledger | agregacja powtórzeń przez 10 minut | licznik kampanii zamiast duplikowania identycznych wpisów |
| Provider output | inspection przed publikacją | podejrzana odpowiedź modelu nie wychodzi do użytkownika |
| Public API | query i prompt kontrolowane przed lookupem | złośliwy tekst nie trafia wcześniej do zewnętrznego źródła |

## Ocena po PASS2015

| Obszar | PASS2014 | PASS2015 |
|---|---:|---:|
| Prompt injection | 85% | 91% |
| Ochrona sekretów i danych | 86% | 91% |
| Pamięć AI | 80% | 87% |
| Bezpieczeństwo narzędzi | 88% | 93% |
| API / provider boundary | 79% | 87% |
| Monitoring incydentów | 64% | 79% |
| Red-team | 68% | 77% |
| Cały system AI | 81% | 85% |

## Nadal potrzebne do klasy światowej

1. Trwały distributed ledger z retencją, purge i kontrolą dostępu.
2. Automatyczny `Attack-to-Test Compiler` z anonimizacją zatwierdzaną przez operatora.
3. Fuzzing Unicode, JSON nesting, multipart i streaming.
4. Zewnętrzny model armor jako druga niezależna warstwa.
5. Capability tokens dla narzędzi oraz approval dla działań zmieniających stan.
6. Alerty kampanii: wzrost jednego fingerprintu, wielu fingerprintów jednej rodziny i ataki rozłożone w czasie.

## Zasada prywatności

Rejestr VLM nie zapisuje promptu, odpowiedzi, argumentów narzędzi, sekretów ani surowego IP. Zapisuje wyłącznie klasę zdarzenia, flagi, ocenę ryzyka, trasę, czas, licznik oraz keyed fingerprint ważny w danym środowisku.

W produkcji należy ustawić długi losowy `VELMERE_SECURITY_FINGERPRINT_SECRET`. Bez tej wartości system używa bezpiecznej soli procesowej, ale fingerprinty nie zachowują ciągłości po restarcie instancji.
