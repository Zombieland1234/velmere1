# VELMERE PASS2938 — Final Testing Strategy

This pass prepares the final verification block but does not execute npm tests.

## Final test order
1. Freeze repository and generate freeze digest.
2. Run clean install and environment checks.
3. Run i18n, syntax typecheck, full typecheck, and build.
4. Run policy verification chain from PASS2930–PASS2938.
5. Run browser, provider, payment, PDF, AI, red-team, SBOM and public board receipts.
6. Bind every public claim to current receipts.
7. Sign operator packet.

## Rule
No public world-class/live/top-1 claim is allowed before the final receipt bundle is complete, current, and signed.
