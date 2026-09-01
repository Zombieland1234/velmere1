# PASS2702 — Customer-Facing Audit Report Compression

Goal: remove customer-facing PASS chaos. The customer sees a premium report flow, not internal engineering gates.

## Customer surfaces
- Basic: one screen: Verdict, Why, Missing proof, Next step.
- Pro: expandable evidence: source, freshness, confidence, claim trace.
- Advanced: human review: queue state, reason, expected next proof.

## Acceptance criteria
- No internal PASS/debug copy in primary customer UI.
- PL/EN/DE copy has same meaning.
- Basic does not imply guarantee.
- Missing evidence is visible and valuable.
