# PASS1074–1093 — Modal Bubble Runtime Follow-up

Scope: follow-up after the circular chart / Messenger bubble modal pass. This patch treats user-reported language dropdown, cart sheet and Real Markets Basic/Pro/Advanced visibility as runtime blockers.

Implemented:
- UnifiedAssetModalShell now accepts `analysisOverlaySlot`.
- Real Markets VLM neural audit renders inside the active asset modal shell rather than above/before it.
- Shield VLM neural audit renders inside the same shell overlay path.
- DropdownRoot computes an immediate fallback position and focuses the first menu item after opening.
- Cart bottom sheet receives a high runtime layer and keeps bottom/right ownership.
- CSS embeds `VlmNeuralAuditExperience` as a relative modal-card when used inside the circular asset shell.
- PASS1074–1093 verifier added.

Not claimed:
- Full npm ci/typecheck/lint/build/browser click QA are still not claimed inside the sandbox if dependency install times out.
