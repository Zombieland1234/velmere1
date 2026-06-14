# Velmère PASS 130 — Evidence Export Manifest Protocol

## Purpose
PASS129 created an internal evidence draft. PASS130 adds a safe JSON manifest preview so the operator can download/copy the case structure without pretending it is a final legal report.

## Manifest contents
The manifest includes:
- schema version,
- preview-only mode,
- export status,
- report id,
- case id,
- token identity,
- risk score and confidence,
- source ledger,
- missing-data appendix,
- report sections,
- OSINT queue,
- operator checklist,
- redaction rules,
- legal note,
- copy guard,
- blocked reason.

## Safety boundary
The JSON manifest is not a final PDF, not legal proof, not financial advice and not an accusation. It is an operator review artifact.

## Redaction rules
The manifest must never expose:
- private scoring weights,
- internal prompts,
- secret thresholds,
- raw wallet labels without source policy,
- unverified accusation language.

## Next step
The next production blocker is persistent audit storage and a real renderer. Until then the export remains preview-only.
