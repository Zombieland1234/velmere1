# PASS934-953 — Production hardening sprint

## Scope
- Stop real build blockers discovered after PASS933.
- Push no-fake-live confidence governance from client UI into the canonical VLM fact packet and final VLM brain envelope.
- Localize mobile navigation wallet/legal/language copy.
- Keep npm 11 / Node 24 preflight visible and testable.

## Implemented
1. Removed a duplicate JSX `data-provider-mode` attribute in `VlmBrainWorkspace.tsx` that could block TS/Next compilation.
2. Added `applyPacketConfidenceGovernor` in `lib/ai/vlm-fact-packet.ts`:
   - demo data cap <= 28,
   - partial data cap <= 39,
   - missing data cap <= 39,
   - source/provider count below 2 cap <= 39,
   - conflicts keep confidence conservative.
3. Added `applyOutputConfidenceGovernor` in `lib/ai/vlm-brain.ts` to clamp provider output again after claim firewall/schema handling.
4. Prevented `mode: gemini` from being exposed when packet confidence is fallback-grade or provider error exists.
5. Localized Navbar mobile wallet safety, legal and language labels in EN/PL/DE.
6. Added `verify:pass934-953-production-hardening`.

## Node/npm result
- `npm run ci:node24-npm11-dry-run` passes with Node 24.16.0 and npm 11.16.0 without ERESOLVE.
- A full `npm ci` started under Node 24/npm 11 and reached dependency extraction, but the sandbox timed out before npm created the final `.bin` links. This is not counted as a completed install.

## Not confirmed
- Full `npm ci` completion.
- Full `npm run typecheck` completion.
- Full `npm run lint`.
- Full `npm run build`.
- Browser click QA.
- Vercel deployment smoke test.
