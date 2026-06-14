# PASS1494–1533 — Velmère Audit Watch / Security Review Desk

## Cel

Dodać do Velmère Security pełny filar biznesowy: public audit verification, pre-audit review, passive contract review i responsible disclosure boundary. To nie jest claim „certified safe”. To jest evidence-first review layer dla projektów crypto, tokenów, publicznych audytów i claimów marketingowych.

## Zrobione

1. Dodano dedykowaną stronę `/{locale}/security/audits`.
2. Dodano komponent `SecurityAuditWatchPage`.
3. Dodano rdzeń produktu `lib/security/pass1494-audit-watch.ts`.
4. Dodano API preview `app/api/security/audit-watch/route.ts`.
5. Dodano link z głównej strony Security do Audit Watch.
6. Dodano link w Navbarze do `Audit Watch`.
7. Dodano 3 tryby review:
   - Public Contract Review,
   - Audit Claim Check,
   - Authorized Vulnerability Review.
8. Dodano statusy:
   - Audit Verified,
   - Audit Outdated,
   - Scope Mismatch,
   - Changed After Audit,
   - Needs Evidence,
   - High Admin Control,
   - Responsible Disclosure.
9. Dodano bezpieczne granice:
   - no custody,
   - no seed phrase,
   - no investment advice,
   - no guarantee of safety,
   - no unauthorized active testing,
   - no exploit instructions.
10. Dodano intake fields:
    - contract address,
    - chain,
    - public audit report URL,
    - project website,
    - docs/GitHub,
    - bug bounty scope.
11. Dodano sample findings dla audit-of-audit.
12. Dodano hook pod Lens PDF report.
13. Dodano hook pod Shield Map evidence graph.
14. Dodano safe badge language: `Velmère Audit Checked`, `Evidence Checked`, `Pre-Audit Review`.
15. Zablokowano niebezpieczne claimy typu `Certified Safe`, `No Risk`, `Approved Investment`.
16. Dodano verifier PASS1494–1533 z 30 checkami.

## Decyzja produktowa

Velmère może monetyzować to jako:

- darmowy publiczny scan,
- płatny Basic Review,
- Pro Evidence Review,
- Advanced Manual-Assisted Pre-Audit,
- Audit Claim Verification dla projektów, które już pokazują publiczny audyt.

## Granica prawna

Publiczne audyty można weryfikować, ale Velmère nie kopiuje cudzych raportów i nie udaje oryginalnego audytora. Velmère sprawdza: scope, datę, adres, commit, zmiany po audycie, role admina, brakujące dowody i nadużycia marketingowego badge.

## Dalej

Następny pass powinien dodać realny formularz UI + zapis review requestu + PDF sample report + integrację z Lens payload.
