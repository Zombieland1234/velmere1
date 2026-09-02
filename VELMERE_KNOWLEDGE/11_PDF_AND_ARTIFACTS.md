# 11 — PDF AND ARTIFACTS

UPDATED: 2026-09-02 | CLASSIFICATION: HISTORICAL_UNTRUSTED until revalidated

## Historical claim (per Pas 0 review)

> PDF generation działa (weryfikowane w poprzednich sesjach) — 9 PDF-ów
> 3 tiery × 3 języki

This is HISTORICAL_UNTRUSTED until revalidated in Pas 6 + Pas 18.

## Per-artifact template

For each artifact type:

```
GENERATED:
VISUALLY INSPECTED:
CONTENT VERIFIED:
AUTHORIZED:
ENTITLEMENT VERIFIED:
LOCALIZED:
EDGE CASES:
LAST VERIFIED:
```

## PDF tiers

| Tier | Locale(s) | Last generated |
|---|---|---|
| Basic | EN, PL, DE | UNKNOWN (historical claim) |
| Pro | EN, PL, DE | UNKNOWN (historical claim) |
| Advanced | EN, PL, DE | UNKNOWN (historical claim) |

## PDF generation engine

| Field | Value |
|---|---|
| Location | lib/reporting/ (inferred) |
| Engine | UNKNOWN (probably headless Chrome via puppeteer or PDFKit) |
| Styling | UNKNOWN |
| Page breaks | UNVERIFIED |
| Tables | UNVERIFIED |
| Long URLs | UNVERIFIED |
| Edge text | UNVERIFIED |
| Provider attribution | UNVERIFIED |
| Uncertainty | UNVERIFIED |
| Missing data | UNVERIFIED |
| Locale handling | EN/PL/DE claimed |

## Per master mission §38

Test cases required:

- Basic, Pro, Advanced
- long text
- long URLs
- many findings
- tables
- edge data
- uncertainty
- missing data
- provider attribution
- locale
- page breaks
- clipping
- overflow
- blank pages
- corrupted output
- unauthorized download
- replay

## PDF security (master mission §34)

- ownership
- case binding
- entitlement binding
- download
- signed URL
- token expiration
- token replay
- wrong account
- wrong entitlement
- malformed token
- old token
- future token
- forged caseRef
- path traversal

## NOT allowed in PDFs

- fake "certified"
- fake "human reviewed"
- fake "real-time"
- fake "audited"
- fake "guaranteed"
- fake "institutional"

Per master mission §28 (M2).

## What Pas 6 + Pas 18 will add

- Real PDF generation per tier × locale × asset
- Visual inspection
- Authorization tests
- Replay tests
- Entitlement binding verification
- Path traversal resistance
- Locale quality verification (no untranslated strings, dates, numbers, currencies)
- "No fake" copy verification

## RWA Evidence Passport (master mission §27, M2)

Not yet implemented. Required fields per master mission:

- issuer
- holderRights
- jurisdiction
- custodian
- backing
- reserveEvidence
- NAVMethod
- oracle/referenceData
- supply
- mintBurn
- redemption
- transferRestrictions
- adminUpgradePower
- attestations
- liquidity
- concentration
- freshness
- missingEvidence

Per master mission: "Do not turn missing off-chain evidence into
'probably fine.' Missing evidence must remain visible."

## Other artifacts

- Reports
- Customer report (route: /security/audits/customer-report/[id])
- Delivery receipt (route: /security/audits/delivery-receipt/[receiptId])
- Export (route: /security/audits/export/[id])
- Support handoff (route: /security/audits/support-handoff/[receiptId])
- Audit inbox (admin: /admin/security/audit-inbox)

(All observed during directory scan; not verified.)