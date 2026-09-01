# Velmère — R9 Master Audit — 2026-09-01

## Scope
Audit of the latest reachable engineering line in `velmere1`, centered on `velmere-final-execution-20260831` and the post-audit `r9-security-truth-audit-20260901` branch.

## Branch reality
- No remote branch named `r8` or `r9` was found in GitHub repository `Zombieland1234/velmere1` during this audit.
- The latest dated engineering branch before this audit is `velmere-final-execution-20260831` at `23d9f754231408b57fc8d1ab6573a660a5b1625b`.
- R7 canonical line remains `velmere-r7-successor-delta-20260825` at `2ab23003b73f9a17b7eb18fa5bf2ef53b0062483`.
- `velmere-final-execution-20260831` is intentionally divergent from the public `main` line; it is 16 commits ahead and 829 commits behind the merge base comparison recorded by GitHub. Do not treat `main` as the product source of truth.

## Product status
The latest explicit R7 closure matrix still records Customer FINAL = 5/20 and Paid Value = 0/10. The newer `velmere-final-execution-20260831` line materially improves implementation/testing, but no newer guarded ledger evidence was found that legally promotes the remaining rows to FINAL.

Therefore this audit does not increase the official score.

## Important engineering improvements found on latest line
- Blanket API rate limiting introduced.
- Whale Watch moved away from synthetic `Math.random()` wallet records toward GoPlus holder data, with optional Etherscan details.
- CoinGecko, DexScreener and other provider calls gained request timeouts.
- Audit Pro entitlement gating was added to the audit-watch POST flow.
- URL importer received SSRF protections.
- Silent mock fallbacks in Square/Profile writes were removed when Supabase is unavailable.
- Admin token comparison moved to timing-safe comparison.
- Cron authentication was changed to require a Bearer secret and no longer trusts spoofable Vercel cron headers.
- Error responses were sanitized for the market-integrity cron.
- Production `Math.random()` usage in API/lib code was removed; crypto UUIDs are used for identifiers.
- Risk Indicator randomness was removed in favor of deterministic derivations/history slope.
- Fake zero wallet addresses were removed when Etherscan is unavailable.
- AI customer QA assertions were strengthened; false-green diagnostic test with zero assertions was subsequently deleted.
- An 118-test assertion-strengthening pass is recorded, including response-body validation, payment error validation, Real Markets price/quote validation and injection checks.
- Recent route work added customer-facing pages for Market Impact, Risk Indicator, Shield Pro and Whale Watch.

## Security findings from this audit
### Fixed on R9 audit branch
`app/api/market-integrity/investigator/route.ts`
- `engine.generativeNarrative` previously reported `available` unconditionally even though the route itself does not invoke the generator and provider configuration may be absent.
- It now reports `configured` only when `VELMERE_ANGEL_PROVIDER` is present, otherwise `not_configured`.
- The catch path no longer reflects arbitrary exception messages to the client; it returns a stable generic error.

## Remaining security/product concerns
- The current customer-final E2E suite contains many route-status checks. HTTP 200/402/400 is useful smoke evidence but is not sufficient by itself for product FINAL.
- The current AI customer QA is a finite Playwright suite; it is not the same thing as the requested 100 x 24 live interaction campaign.
- The 100 x 24 campaign artifact is currently defined/bound but explicitly awaits execution against real customer routes.
- The 50 x 3 x 6 reviewer panel is currently defined/synthetic and explicitly does not provide human-proof credit.
- Existing adversarial attack results include 7 PASS and 3 WEAK areas; the weak areas were documented as architecture-limited rather than silently converted to PASS.
- R7 paid-value closure is blocked by evidence/rights/qualifying-asset denominators rather than lack of UI.
- Browser Pro/Advanced candidate paths previously failed closed on customer display/export rights, which is the correct behavior until authorization is proven.
- Real Markets Pro/Advanced were explicitly identified as lacking dedicated current implementation/finalizer evidence in the R7 closure inventory.
- Local full build/typecheck/lint cannot be re-certified from this ChatGPT runtime without a usable checkout. Existing repository receipts are historical evidence only.

## Test evidence boundaries
Reported historical results visible in repository commits include:
- E2E: 7/7.
- Strengthened customer + AI QA suite: 118/118.
- Earlier R7 exact execution surface: 52-test denominator with Node 24.18.0/npm 11.16.0 on Windows Server 2025, plus secret-scan receipt reporting 0 findings.

None of these results alone grants Customer FINAL or Paid Value credit.

## Official score decision
- Customer FINAL: 5/20 (unchanged; current explicit guarded matrix)
- Paid Value: 0/10 (unchanged; current explicit paid-value tracking)
- External human proof: 0
- AI customer campaign: defined 2400; live executed credit 0/2400 in this audit
- AI reviewer panel: defined 900; external-human-proof credit 0/900
- Production approval: not proven
- World-class proven: false

## Next closure priorities
1. Re-run current-source customer-final gates on the newest engineering line.
2. Close Browser Pro/Advanced rights and customer export/display proof with real evidence.
3. Close Shield Pro paid qualifying-asset denominator with current publishable evidence.
4. Complete/verify dedicated Audit Pro/Advanced and Real Markets Pro/Advanced finalizers rather than counting page existence.
5. Execute the 2400 real route-bound customer assertions only after the underlying customer-final gates are green.
6. Keep human-proof credit at zero until external human evidence exists.
