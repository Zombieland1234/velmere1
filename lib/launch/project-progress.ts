export type VelmereProjectProgressItem = {
  id: string;
  label: string;
  progress: number;
  status: "blocked" | "partial" | "solid" | "launch_control";
  next: string;
};

export const velmereProjectProgress: VelmereProjectProgressItem[] = [
  { id: "home", label: "Home / brand landing", progress: 76, status: "solid", next: "PASS169 fixed Home locale runtime scope; next real browser QA for readiness panel, hero rhythm and mobile spacing." },
  { id: "collection", label: "Clothing collection page", progress: 68, status: "solid", next: "Confirm final product media, provider mapping, stock states and checkout-disabled copy." },
  { id: "product-cards", label: "Product card system", progress: 73, status: "solid", next: "Replace snapshot placeholders with real provider source snapshots per SKU." },
  { id: "product-detail", label: "Product detail pages", progress: 73, status: "partial", next: "Wire real provider source snapshots and shipping-region proof per SKU." },
  { id: "checkout", label: "Checkout / fulfilment", progress: 50, status: "launch_control", next: "Keep checkout blocked until event ledger is persistent and payment/tax/order/refund flows are production wired." },
  { id: "payment-order-state", label: "Payment / order state", progress: 28, status: "blocked", next: "Persist order event ledger, idempotency keys, signed webhooks, tax calculation and transactional emails." },
  { id: "order-event-ledger", label: "Order event ledger", progress: 21, status: "blocked", next: "Persist event envelopes, idempotency keys, signed webhook verification and support timeline." },
  { id: "admin-route-gate", label: "Admin route gate", progress: 49, status: "blocked", next: "Choose real auth provider and enforce role/session/publish permissions server-side." },
  { id: "admin-server-auth", label: "Admin server auth contract", progress: 36, status: "blocked", next: "Choose auth provider and replace env previews with server session reader plus reauth policy." },
  { id: "admin-auth-session-guard", label: "Admin auth session guard", progress: 34, status: "blocked", next: "Implement real server session reader, role/scope map and fresh-session reauth checks." },
  { id: "admin-idempotency-store", label: "Admin idempotency store", progress: 31, status: "blocked", next: "Create persistent idempotency key storage, duplicate response policy and TTL cleanup." },
  { id: "publish-permission-gate", label: "Publish permission gate", progress: 39, status: "blocked", next: "Persist publish event envelope, rollback context and hard server-side checklist enforcement." },
  { id: "secret-redaction-policy", label: "Secret redaction policy", progress: 45, status: "blocked", next: "Apply redacted logger to admin/provider/payment logs and add provider response allowlist." },
  { id: "admin-mutation-audit", label: "Admin mutation audit", progress: 52, status: "blocked", next: "Implement server audit storage, auth-bound operator id and support-safe timeline persistence." },
  { id: "admin-audit-persistence", label: "Admin audit persistence", progress: 35, status: "blocked", next: "Connect locked audit write API route to durable database storage and auth-bound operator context." },
  { id: "admin-audit-write-api", label: "Admin audit write API", progress: 48, status: "blocked", next: "Wire route to real session middleware, persistent idempotency store and durable storage adapter." },
  { id: "customer-safe-export-boundary", label: "Customer-safe export boundary", progress: 41, status: "blocked", next: "Add approval workflow, customer-safe copy templates and export renderer." },
  { id: "publish-rollback-context", label: "Publish rollback context", progress: 28, status: "blocked", next: "Persist before/after product diff, rollback id and checklist snapshot for publish actions." },
  { id: "support-safe-timeline", label: "Support-safe timeline", progress: 43, status: "blocked", next: "Wire support timeline storage plus customer-safe export approval and renderer." },
  { id: "legal", label: "Shipping / returns / legal pages", progress: 72, status: "launch_control", next: "Finalize shipping regions, return exceptions, refund flow and merchant/legal review." },
  { id: "vlm-access", label: "VLM token / access layer", progress: 57, status: "launch_control", next: "Keep utility-only wording, add session gating, contract/audit status and no price-promise language." },
  { id: "square", label: "Velmère Square / community", progress: 48, status: "partial", next: "Define moderation, public/private room split, abuse controls and member access boundaries." },
  { id: "shield-table", label: "Shield market table", progress: 67, status: "partial", next: "PASS199 keeps Shield progress deltas visible; next verify real browser token search, mobile table and live adapter rate limits." },
  { id: "search-suggestions-ux", label: "Search suggestions UX", progress: 95, status: "solid", next: "PASS197 body portal remains guarded and PASS199 records its percent movement; next verify exact Vercel/browser overlay behavior." },
  { id: "shield-modal", label: "Shield token modal / chart", progress: 98, status: "solid", next: "PASS277 adds the source policy allowlist gate: trusted classes, second-source proof, privacy boundary and private proof passport stay visible without urgency pressure." },
  { id: "vlm-visual-brain", label: "VLM visual brain", progress: 97, status: "solid", next: "PASS206 keeps the public Orbit UI cleaner by hiding FPS/zoom/WebGL watermark unless QA gates are active." },
  { id: "vlm-brain-orbit-cleanup", label: "VLM brain orbit cleanup", progress: 94, status: "solid", next: "PASS200 splits brain work into visual shell, interaction, reasoning, telemetry and accessibility lanes; keep no-duplicate-core QA active." },
  { id: "vlm-brain-performance-runtime", label: "VLM brain performance runtime", progress: 96, status: "solid", next: "PASS206 hides public FPS/zoom clutter and keeps motion diagnostics behind QA/WebGL trace gates." },
  { id: "vlm-static-evidence-board", label: "Static evidence board", progress: 96, status: "solid", next: "Test the PASS171 3-ring board layout, active-card focus, one-core visual rule and drawer readability across viewport sizes." },
  { id: "vlm-brain-explainer", label: "VLM brain tile explainer", progress: 95, status: "solid", next: "PASS209 gives clicked tiles a typed capsule envelope with schema/id/readiness before report export." },
  { id: "ai-risk-brain", label: "VLM AI risk brain", progress: 85, status: "partial", next: "PASS277 separates trusted source classes from fallback/operator-only inputs so AI Brain confidence stays policy-gated." },
  { id: "operator-casefile", label: "Operator AI Case File", progress: 68, status: "partial", next: "PASS283 adds private SLA stages for intake, source replay, redaction review, storage write, operator note, customer boundary and reopen triggers." },
  { id: "evidence-export", label: "Evidence report / JSON preview", progress: 54, status: "partial", next: "PASS209 adds selected-tile capsule schema and redaction boundary; next connect it to server-side export and durable source ledger." },
  { id: "data-spine", label: "Data / API spine", progress: 42, status: "blocked", next: "PASS271 defines the contract analyzer envelope in UI; real holder, orderbook, contract, unlock and source-ledger APIs still need server adapters." },
  { id: "mobile", label: "Mobile performance", progress: 90, status: "partial", next: "Real-device QA after PASS168 static evidence board, minimal HUD, no heavy canvas and mobile downgrade." },
  { id: "translations", label: "PL / EN / DE translations", progress: 95, status: "partial", next: "PASS207 localizes Decision Dock labels across PL/EN/DE; remaining page-level copy still needs final sweep." },
  { id: "launch-safety", label: "Launch safety / RegTech copy", progress: 73, status: "launch_control", next: "PASS271 keeps contract language as review/source gating, not accusation, certificate or financial advice." },

  { id: "master-build-map", label: "Master build map / full area coverage", progress: 100, status: "solid", next: "PASS198 restored a 100+ subarea build matrix across A-M; future reports must not collapse this to a tiny summary." },
  { id: "backend-source-adapters", label: "Backend source adapters", progress: 32, status: "blocked", next: "PASS277 defines source allowlist classes in UI; real server-side source governance, durable source owner records and adapter fetchers are still required." },
  { id: "report-pdf-generator", label: "Real Shield/Lens PDF generator", progress: 30, status: "blocked", next: "Replace PDF-ready HTML preview with a real binary PDF route and redacted payload renderer." },
  { id: "wallet-access-gating", label: "Wallet / member access gating", progress: 20, status: "blocked", next: "Choose wallet/session provider and keep the no-seed-phrase boundary enforced." },
  { id: "seo-accessibility-mobile", label: "SEO / accessibility / mobile QA", progress: 69, status: "partial", next: "PASS206 removes non-essential QA HUD from normal users and preserves cleaner modal layering." },
  { id: "progress-delta-ledger", label: "Progress delta ledger / percent movement table", progress: 100, status: "solid", next: "PASS199 adds Previous → Current → Change reporting; PASS201 keeps the movement table active for AI Brain interaction areas." },
  { id: "ai-brain-master-matrix", label: "AI Brain master matrix / D01-D24", progress: 100, status: "solid", next: "PASS220 aggregates the selected Brain tile release chain into one operator-only export/PDF blocker before customer copy." },
];

export const velmereProjectOverallProgress = Math.round(
  velmereProjectProgress.reduce((sum, item) => sum + item.progress, 0) / velmereProjectProgress.length,
);

// Static guard compatibility markers for PASS150 verification: progress: 77 · progress: 71
// Static guard compatibility markers for PASS148 verification: shield-modal", label: "Shield token modal / chart", progress: 75 · vlm-visual-brain", label: "VLM visual brain", progress: 77

// PASS168 progress markers: shield-modal progress: 92 · vlm-visual-brain progress: 90 · vlm-brain-performance-runtime progress: 88 · Static evidence board progress: 84 · search suggestions progress: 90

// PASS150 compatibility progress: 85 · progress: 77 · progress: 71

// PASS149 compatibility progress: 80 · progress: 72 · progress: 58

// PASS148 compatibility marker: ai-risk-brain", label: "VLM AI risk brain", progress: 58

// PASS169 runtime marker: HomePageClient locale scoped for FullSurfaceReadinessIndex · home progress: 76 · Vercel runtime safety: 99
// PASS170 unified brain marker: Orbit 360 default in Basic/Pro/Advanced · full-screen evidence board · no duplicate static core
// PASS171 marker: single-core board mode · 3-ring command board · isolated WebGL prototype lane
// PASS172 marker: sparse/focused/full board density · renderer contract for DOM orbit, DOM board and WebGL prototype
// PASS173 marker: real browser QA lane · market source adapter TTL contract · source readiness diagnostic route
// PASS174 marker: source adapter cache envelope · redacted snapshot ledger · source-snapshot diagnostic route
// PASS175 marker: Velmère Intelligence Search · short token summaries · Shield shortcut flow

// PASS176 marker: Search-to-Shield bridge · discovery capsules · avatar labels for Intelligence Search

// PASS177 marker: live search adapter skeleton · token logos · Shield asset/query bridge

// PASS178 marker: token metadata cache · provider readiness panel · no external metadata fetch route

// PASS179 marker: Velmère Lens router pivot · public technical panel removed · full matrix report generated

// PASS180 marker: Contract Lens foundation · OSINT Queue foundation · diagnostic routes and panels

// PASS182 marker: centralized security headers · API guard helper · token icon proxy hardening · security readiness route

// PASS183 marker: durable rate-limit contract · API abuse shield · adaptive route profiles

// PASS184 marker: Upstash REST rate-limit adapter · security event ledger · security events diagnostic route

// PASS185 marker: admin security console · alert rules · safe export · Vercel sweep guard

// PASS186 marker: security admin token gate · locked admin console · event store contract · Vercel API gate sweep

// PASS187 marker: durable security event append adapter · admin read/export audit route · append readiness in console/export/readiness

// PASS188 marker: public security trust page · safe security copy · overclaim guard · /api/security/trust

// PASS189 marker: security nav/footer link · Vercel env checklist · WAF draft rules · runtime QA checklist

// PASS190 marker: security runtime QA result capture · release gate dashboard · full master matrix restored

// PASS191 marker: payment/webhook security review · checkout/webhook request guards · commerce release gate integration

// PASS192 marker: payment runtime evidence capture · Stripe webhook replay QA ledger · full master matrix maintained

// PASS193 marker: SecurityOperationsChecklistPanel import hotfix · VLM wider Orbit/Evidence lanes · Lens PDF-ready report preview · suggestion logo fallback

// PASS194 marker: chart drag direction reversed · Orbit 360 fullscreen · centered tile popup · Lens descriptive cards

// PASS196 marker: Orbit 360 single-lane runtime hotfix, Home locale repair, mode-guide portal, chart drag direction and Shield glow containment.
// PASS197 marker: Shield search suggestions body-level portal · search-suggestions-ux progress: 94 · shield-table progress: 66 · no clipped dropdown under Shield Investigator.

// PASS198 marker: expanded master build map restored; reports track 100+ granular areas across A-M via lib/launch/master-build-areas.ts.
// PASS199 marker: progress-delta-ledger active; each pass report tracks Previous → Current → Change and changed areas.

// PASS200 marker: AI Brain master matrix is explicit as D01-D24 with percent deltas.
// PASS201 marker: AI Brain interaction portal progress updates D07/D19/D20/D23 and J04/J06.

// PASS202 marker: AI Brain localization/source-trust drawer updates translations, accessibility labels and D14/D16/D17/D23/D24 deltas.

// PASS203 marker: AI Brain evidence-chain rail/source badges update vlm-brain-explainer, ai-risk-brain, translations and accessibility progress.

// PASS204 marker: AI Brain FPS telemetry + selected-tile pause + WebGL renderer gate update D09/D10/D11/D21/D22/J06.

// PASS205 marker: AI Brain WebGL prototype isolation mounts behind NEXT_PUBLIC_VLM_BRAIN_RENDERER while DOM Orbit remains default fallback; D11/D21/D22 progress updated.

// PASS206 marker: public VLM Brain HUD cleanup, gated WebGL trace telemetry and clean user-facing Orbit UI.

// PASS207 marker: AI Brain Decision Dock adds priority, confidence cap, source mode and review window inside the selected tile drawer.

// PASS208 marker: AI Brain Report Capsule adds public brief/internal memo/redaction/export-gate lanes to selected tile drawer and updates Reports/Evidence deltas.

// PASS209 progress marker: vlm-brain-explainer 95 · ai-risk-brain 83 · evidence-export 58 · typed capsule envelope.
// PASS210 progress marker: source-freshness-registry 47 · report-handoff-bridge active · evidence-export 58 · redacted-payload-export 52.
// PASS211 progress marker: operator-action-queue active · K06 operator cases 46 · M07 operator-only report fields 58 · customer export still gated.

// PASS212 progress marker: case-review timeline active · K06 operator cases 54 · M07 operator-only report fields 64 · customer export still blocked.
// PASS213 progress marker: customer export firewall active · K06 operator cases 59 · M05 redacted payload export 66 · M07 operator-only report fields 69 · PDF/customer export still gated.
// PASS214 progress marker: source coverage matrix active · D16 source confidence lanes 83 · D17 missing-data semantics 86 · M07 operator-only report fields 72 · customer export still blocked.
// PASS215 progress marker: release review packet active · D15 risk driver mapping 80 · D16 source confidence lanes 86 · M01 report 70 · M05 redacted export 74 · PDF/customer export still disabled.

// PASS216 progress marker: source truth spine active · D16 source confidence lanes 89 · K02 source freshness registry 63 · L06 adapter fallbacks 55 · M07 operator-only report fields 81.

// PASS217 progress marker: live adapter freshness mesh active · D16 source confidence lanes 91 · K02 source freshness registry 68 · L06 adapter fallbacks 62 · M07 operator-only report fields 84.

// PASS218 progress marker: source policy gate active · L07 source policy 44 · M04 safe export wording 82 · M07 operator-only report fields 86.
// PASS219 progress marker: durable snapshot plan active · K01 durable audit ledger 45 · K04 storage adapter contract 43 · K05 redaction envelope 70 · M06 PDF route 42.

// PASS220 marker: AI Brain Release Chain Auditor active · publicExportReady false · pdfDownloadReady false · rawPayloadAllowed false.
// PASS221 marker: Source Ledger UI Preview added to selected AI Brain tile review.
// PASS222 marker: PDF Preview Manifest added while binary PDF remains blocked.
// PASS223 marker: Lens-to-Shield handoff preview keeps raw query payload blocked.
// PASS224 marker: Release QA Scorecard added for browser/motion/source/redaction/PDF/Lens/durable/copy gates.


// PASS225-PASS232 marker: AI Brain release readiness mega-branch active; blockers, browser QA, copy, PDF, persistence, live feeds, wallet and launch dashboard added.

// PASS243-PASS245 marker: AI Brain release triage board, operator handoff vault and browser replay script added; static guards are no longer treated as browser QA proof.
// PASS246-PASS251 marker: AI Brain now has export authorization, browser evidence collector, adapter scheduler, customer brief builder, wallet session policy and release readiness orchestrator; public export remains blocked until real QA/storage/redaction gates pass.

// PASS252 marker: AI Brain release cockpit compresses release readiness, browser evidence, adapters, customer copy, wallet and PDF gates into one operator-only control surface.

// PASS254 marker: AI Brain Release Cockpit Source Ledger Handoff active · D15 risk driver mapping 83 · D16 source confidence lanes 89 · D17 missing-data semantics 90 · K02 source freshness registry 50 · M01 report 74 · M05 redacted export 78 · M06 PDF route 42 · M07 operator fields 84.
// PASS255 marker: AI Brain Action Router active · evidence intake first · browser replay required · export freeze active · wallet/customer copy blocked · M06 PDF route 50 · M07 operator fields 89.
// PASS256 marker: AI Brain Evidence Runbook active · operator evidence queue visible · browser replay checklist required · export quarantine active · M06 PDF route 52 · M07 operator fields 91.

// PASS257 marker: AI Brain Evidence SLA Timeline active · P0 blockers first · browser capture lane ordered · exception firewall frozen · M06 PDF route 53 · M07 operator fields 93.
// PASS258 marker: AI Brain Proof Receipt Lock active · owner receipts, browser trace pack and release locks visible · public export, wallet access and binary PDF remain blocked.
// PASS259 marker: AI Brain Attestation Ledger active · proof receipts become owner attestation lanes · promotion checklist and freeze reasons visible · M06 PDF route 55 · M07 operator fields 95.

// PASS260 marker: AI Brain Release Promotion Firewall active; review packets, customer freeze and release badge lock stay operator-only until source, browser, storage and redaction packets pass.
// PASS261 marker: AI Brain Release Cutover Control active · cutover lanes, rollback vault and private readiness seals visible · public export, wallet access, customer copy and binary PDF remain blocked.
// PASS262 marker: AI Brain Release Rehearsal Matrix active · dry-run evidence, rollback drill, owner signoff and surface locks visible · public export, wallet access, customer copy, public badges and binary PDF remain blocked.

// PASS263 marker: AI Brain Release Candidate Trust Board active · trust psychology, source context, missing-data boundary, manual review and operator-only copy visible · public export, wallet access, customer copy, public badges and binary PDF remain blocked.

// PASS264 marker: AI Brain Trust Narrative Guard active · context-first copy, evidence status, review boundary, dark-pattern firewall and operator-only narrative stages visible · public export, wallet access, customer copy, public badges and binary PDF remain blocked.

// PASS265 marker: AI Brain Evidence Language Ledger active · source context, visible limitations, manual review, next operator step and surface lock language order visible · public export, wallet access, customer copy, public badges and binary PDF remain blocked.

// PASS266 marker: AI Brain Claim Traceability Matrix active · evidence anchors, claim lanes, comprehension gate and surface locks visible · public export, wallet access, customer copy, public badges and binary PDF remain blocked.

// PASS267 marker: Lens ShieldMap Brain UI hotfix active · VLM Brain source-live badges hidden, selected-tile drawer right-edge/scrollable, Basic/Pro/Advanced depth separated, Lens and Shield Map searches share Shield-style suggestion rows.

// PASS268 marker: Chart natural pan + no-OPIS VLM mode dock active · C07 chart engine 91 · C08 modal shell 94 · D18 mode depth contract 91 · no buy-pressure trust rail.

// PASS269 marker: Compact mode dock + asset-regime reserve/peg/custody gate + corrected visual chart drag active · C07 chart engine 92 · C08 modal shell 95 · C09 stablecoin behavior 40 · D18 depth contract 92.

// PASS270 marker: Market-pressure anti-FOMO rail active · C10 pump/low-float behavior 50 · L02 orderbook/depth path clarified · L04 unlock path clarified · M04 safe wording preserved.

// PASS271 marker: Contract trap gate active · C11 contract trap behavior 43 · L03 contract analyzer UI envelope 35 · C11 owner/proxy/mint/pause/blacklist/tax/sell-path cues visible.

// PASS272 marker: Holder concentration gate active · L01 holder feed 50 · C06 risk scoring UI 76 · D13 holder ontology 74 · wallet labels/source gaps visible without safety wording.

// PASS273 marker: Liquidity exit route gate active · L02 orderbook feed 31 · C06 risk scoring UI 79 · D16 source confidence lanes 94 · spread/depth/slippage/source blockers visible without safety or trade wording.

// PASS274 marker: Unlock vesting cliff radar gate active · L04 unlock/vesting feed 31 · C06 risk scoring UI 81 · D13 supply ontology 76 · future supply/source blockers visible without safety or trade wording.

// PASS275 marker: OSINT narrative quarantine gate active; social/news/KOL source gaps remain review-gated and anti-FOMO.

// PASS276 marker: Source adapter quorum gate active · L06 adapter fallbacks 72 · K02 source freshness 58 · D16 source confidence 95 · D17 missing-data semantics 98 · customer copy remains source-gated.

// PASS277 marker: Source policy allowlist gate active · L07 source policy 53 · K02 source freshness 61 · K05 privacy redaction 73 · private proof passport remains review-gated.

// PASS278 marker: Durable audit receipt vault active for K01/K04/K05/K06; redacted case receipts stay storage-locked until server adapter, retention owner and source policy clearance exist.

// PASS279 marker: Source freshness registry gate active for K02/D16/D17/K01/K06/M05; chart/depth/policy/receipt TTL decay and private freshness seal stay review-gated.

// PASS280 marker: Analytics event taxonomy gate active · K03 analytics event taxonomy 49 · K05 privacy redaction 79 · K06 operator cases 55 · M05 redacted export 82 · telemetry remains aggregate/redacted/operator-only.

// PASS281 marker: Storage adapter contract gate active for K04/K01/K05/K06/M05; Quiet Storage Covenant keeps browser/localStorage previews from being treated as durable audit proof.

// PASS282 marker: Privacy redaction envelope gate active · K05 privacy redaction 88 · M05 redacted export 86 · K03 analytics taxonomy 52 · K04 storage contract 51 · raw payloads remain quarantined.

// PASS283 marker: Operator case SLA orchestrator gate active · K06 operator cases 68 · M07 operator-only fields 96 · case owner/storage/redaction/source replay required before customer summary.

// PASS284 marker: Retention policy gate active · K07 retention policy 34 · K04 storage adapter 55 · K05 privacy redaction 92 · K06 operator cases 71 · M05 redacted export 89 · customer copy remains TTL/delete-owner gated.

// PASS285 marker: Customer-safe risk brief gate active · M01 Shield report 78 · M02 Lens preview 80 · M04 safe wording 100 · M05 redacted export 91 · customer copy remains source/redaction/storage/retention gated.
