# PASS1574–1613 — Audit Sample Report + Productized Review Desk

## Cel
Audit Watch ma wyglądać jak realny produkt, nie tylko formularz. Ten pass dodaje publiczny sample report, pakiety review i warstwę Lens PDF / Shield Map, którą klient może zrozumieć przed wysłaniem zlecenia.

## Zrobione
- Dodałem `pass1574-audit-sample-report-productization` jako osobny release gate.
- Dodałem publiczną stronę `/security/audits/sample`.
- Dodałem `SecurityAuditSampleReportPage` z hero, verdict, confidence cap, executive summary, findings table, Lens PDF outline, Shield Map flow, disclosure rules i pakietami review.
- Dodałem `buildAuditSampleReport()` z lokalizacją PL/EN/DE.
- API `/api/security/audit-watch` zwraca teraz `sampleReport` i header `x-velmere-audit-sample-report`.
- Główna strona `/security/audits` linkuje do sample report i pokazuje preview Lens/Shield Map przed formularzem.
- Pakiety review: Free Scan, Basic Review, Pro Review, Advanced Review.
- Zachowane granice: no custody, no seed phrase, no investment advice, no guarantee of safety, passive review default, no exploit instructions.

## Nieudowodnione
- Pełny `npm ci → typecheck → lint → build → Playwright` nadal wymaga środowiska bez sandbox timeouta.
- Sample report jest statycznym publicznym wzorcem, nie jeszcze zapisem realnego zlecenia do bazy.

## Następny pass
PASS1614–1653: persistence/request queue + public report status pages + admin review inbox.
