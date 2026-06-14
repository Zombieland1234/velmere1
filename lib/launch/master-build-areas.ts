export type VelmereMasterBuildAreaStatus = "blocked" | "partial" | "solid" | "launch_control";
export type VelmereMasterBuildArea = {
  id: string;
  group: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M";
  label: string;
  scope: string;
  progress: number;
  status: VelmereMasterBuildAreaStatus;
  next: string;
};
export const velmereMasterBuildAreas: VelmereMasterBuildArea[] = [
  {
    id: "A01",
    group: "A",
    label: "Core runtime",
    scope: "Next.js runtime, hydration, client/server boundary, undefined variables, missing imports.",
    progress: 99,
    status: "solid",
    next: "Run Vercel build and keep guards for locale, imports, browser API boundaries.",
  },
  {
    id: "A02",
    group: "A",
    label: "Vercel build safety",
    scope: "Static safety, build script, server/client boundaries, deployment root discipline.",
    progress: 99,
    status: "solid",
    next: "Verify on actual Vercel logs after every ZIP upload.",
  },
  {
    id: "A03",
    group: "A",
    label: "TypeScript sanity",
    scope: "Type-level regressions, stale result fields, iterator spreads, route compile errors.",
    progress: 94,
    status: "solid",
    next: "Run full typecheck in local repo with node_modules.",
  },
  {
    id: "A04",
    group: "A",
    label: "Dynamic imports / lazy surfaces",
    scope: "Heavy visual surfaces isolated from critical route render.",
    progress: 73,
    status: "partial",
    next: "Split heavy VLM renderer when WebGL lane is enabled.",
  },
  {
    id: "A05",
    group: "A",
    label: "Preflight guard system",
    scope: "Guard scripts, verify:shield-all, overclaim checks, deployment gates.",
    progress: 100,
    status: "solid",
    next: "PASS199 delta ledger is now guarded; keep guard freshness after each pass.",
  },
  {
    id: "A06",
    group: "A",
    label: "Runtime observability",
    scope: "Runtime QA capture, release gate result storage, browser error capture.",
    progress: 74,
    status: "partial",
    next: "Runtime observability now includes release QA scorecard and gated browser trace requirements; next persist real browser traces.",
  },
  {
    id: "B01",
    group: "B",
    label: "Home hero",
    scope: "Luxury first screen, brand promise, CTA priority, mobile first viewport.",
    progress: 76,
    status: "solid",
    next: "Real-device spacing and above-fold conversion QA.",
  },
  {
    id: "B02",
    group: "B",
    label: "Brand story",
    scope: "Velmère luxury/fashion-tech narrative without crypto overclaim.",
    progress: 70,
    status: "partial",
    next: "Shorten copy and connect clothing, Square and Shield routes.",
  },
  {
    id: "B03",
    group: "B",
    label: "Visual rhythm",
    scope: "Spacing, glow, editorial cadence, premium contrast.",
    progress: 78,
    status: "solid",
    next: "Browser QA after glow containment changes.",
  },
  {
    id: "B04",
    group: "B",
    label: "Conversion path",
    scope: "Route from Home to clothing, VLM access, Shield and Square.",
    progress: 65,
    status: "partial",
    next: "Decide primary action and reduce competing buttons.",
  },
  {
    id: "B05",
    group: "B",
    label: "Footer / trust notes",
    scope: "Legal, seller, privacy, shipping and security links positioned discreetly.",
    progress: 72,
    status: "launch_control",
    next: "Legal review and merchant identity confirmation.",
  },
  {
    id: "B06",
    group: "B",
    label: "Psychology of sales copy",
    scope: "Exclusive/private/control/intelligence tone without fear or hype.",
    progress: 68,
    status: "partial",
    next: "Continue PL/EN/DE copy review with per-pass delta notes.",
  },
  {
    id: "C01",
    group: "C",
    label: "Shield terminal shell",
    scope: "Market integrity terminal, table, scanning console and risk frame.",
    progress: 67,
    status: "partial",
    next: "Real browser QA and adapter wiring; PASS199 now reports exact Shield progress delta.",
  },
  {
    id: "C02",
    group: "C",
    label: "Shield search dropdown",
    scope: "Portal-level suggestions, token logos, fallback glyphs, outside click.",
    progress: 95,
    status: "solid",
    next: "Confirm on Vercel viewport that dropdown never clips under panels.",
  },
  {
    id: "C03",
    group: "C",
    label: "Global token lookup",
    scope: "Find tokens outside current table via live/local search bridge.",
    progress: 63,
    status: "partial",
    next: "Tune query threshold, source badges and API rate limits.",
  },
  {
    id: "C04",
    group: "C",
    label: "Token table states",
    scope: "Sort, filters, load more, empty data, stable states.",
    progress: 58,
    status: "partial",
    next: "Browser QA for large API payloads and mobile table.",
  },
  {
    id: "C05",
    group: "C",
    label: "Token logo fallback",
    scope: "Known glyph set and source image fallback.",
    progress: 95,
    status: "solid",
    next: "Add chain/network-specific contract avatars later.",
  },
  {
    id: "C06",
    group: "C",
    label: "Risk scoring UI",
    scope: "Risk, confidence, missing-data language, source state.",
    progress: 78,
    status: "partial",
    next: "PASS276 adds an adapter quorum circuit breaker so chart/depth/source failures change the visible risk UI instead of disappearing behind a generic score.",
  },
  {
    id: "C07",
    group: "C",
    label: "Chart engine",
    scope: "Candles, timeframe buttons, natural drag/pan, no debug labels.",
    progress: 92,
    status: "solid",
    next: "PASS269 corrects visual-direct chart drag after screenshot QA; next test real mouse/touch and add exchange-grade ruler polish.",
  },
  {
    id: "C08",
    group: "C",
    label: "Token modal shell",
    scope: "Chart left, Basic/Pro/Advanced right, full-screen brain flow.",
    progress: 95,
    status: "solid",
    next: "PASS269 compacts the mode dock and removes paragraph-heavy description blocks; next browser QA click paths and scroll lock.",
  },
  {
    id: "C09",
    group: "C",
    label: "Stablecoin behavior",
    scope: "Stablecoin-specific source and risk interpretation.",
    progress: 40,
    status: "partial",
    next: "PASS269 adds an asset-regime reserve/peg/custody gate; next connect real stablecoin reserve and depeg adapters.",
  },
  {
    id: "C10",
    group: "C",
    label: "Pump / low-float behavior",
    scope: "Low float, unlock, suspicious volume, liquidity exit risk.",
    progress: 50,
    status: "partial",
    next: "PASS270 adds a compact anti-FOMO market-pressure rail for float, unlock, depth, hype and source trust; next connect real unlock/liquidity adapters.",
  },
  {
    id: "C11",
    group: "C",
    label: "Contract trap behavior",
    scope: "Owner/proxy/mint/pause/blacklist/tax warnings.",
    progress: 43,
    status: "partial",
    next: "PASS271 adds a compact contract-trap gate for address, owner/proxy, mint/pause, blacklist, tax and sell-path review; next connect a real per-chain contract analyzer adapter.",
  },
  {
    id: "C12",
    group: "C",
    label: "Manual review wording",
    scope: "No final verdict; anomaly/requires review/source confidence only.",
    progress: 84,
    status: "solid",
    next: "Keep overclaim guards active.",
  },
  {
    id: "D01",
    group: "D",
    label: "VLM Orbit 360 shell",
    scope: "Full-screen portal, centered core, top-right return-to-chart.",
    progress: 95,
    status: "solid",
    next: "PASS200 keeps Orbit 360 visible in the AI Brain matrix; next test on actual monitor and mobile viewport.",
  },
  {
    id: "D02",
    group: "D",
    label: "Basic Analysis brain",
    scope: "Orbit/board mode with fewer signals and simple brief.",
    progress: 82,
    status: "solid",
    next: "Refine content depth and reduce overload.",
  },
  {
    id: "D03",
    group: "D",
    label: "Pro Review brain",
    scope: "More source lanes/confidence signals than Basic.",
    progress: 80,
    status: "solid",
    next: "Connect real confidence/source status lanes.",
  },
  {
    id: "D04",
    group: "D",
    label: "Advanced Analysis brain",
    scope: "Full Orbit 360, more signals, detail popup and premium animation.",
    progress: 85,
    status: "solid",
    next: "PASS200 splits Advanced brain work into visual, reasoning, telemetry and WebGL lanes; next run real FPS/browser QA.",
  },
  {
    id: "D05",
    group: "D",
    label: "VLM core alignment",
    scope: "Single VLM core, no double token, center lock.",
    progress: 96,
    status: "solid",
    next: "Verify no duplicate core after future renderer changes.",
  },
  {
    id: "D06",
    group: "D",
    label: "Orbit tile readability",
    scope: "Contrast, scale, depth, shadow, no overlap/clipping.",
    progress: 88,
    status: "solid",
    next: "Fine tune per viewport.",
  },
  {
    id: "D07",
    group: "D",
    label: "Tile detail popup",
    scope: "Premium dark panel, scrollbars, ESC/outside click, no clipping.",
    progress: 94,
    status: "solid",
    next: "PASS201 moves tile detail into a document.body portal with premium scrollbar, outside click and ESC handling; next connect live evidence to every detail panel.",
  },
  {
    id: "D08",
    group: "D",
    label: "Mode description popup",
    scope: "One popup only, no Source Spine clutter underneath.",
    progress: 91,
    status: "solid",
    next: "Keep hidden panels disabled until redesign.",
  },
  {
    id: "D09",
    group: "D",
    label: "Reduced motion / mobile downgrade",
    scope: "Disable heavy animation for weak/mobile/reduced-motion contexts.",
    progress: 83,
    status: "partial",
    next: "PASS205 keeps the WebGL prototype disabled on compact/reduced-motion contexts and preserves DOM Orbit as the safe fallback.",
  },
  {
    id: "D10",
    group: "D",
    label: "Performance governor",
    scope: "Sparse frames, compositor motion, pause when hidden.",
    progress: 97,
    status: "solid",
    next: "PASS206 hides public QA clutter and keeps the performance governor measurable only behind QA/WebGL gates.",
  },
  {
    id: "D11",
    group: "D",
    label: "WebGL / Three.js lane",
    scope: "Separate future renderer architecture without breaking DOM renderer.",
    progress: 54,
    status: "partial",
    next: "PASS206 adds WebGL per-second trace telemetry and keeps it gated for browser comparison instead of public UI.",
  },
  {
    id: "D12",
    group: "D",
    label: "Evidence Board future redesign",
    scope: "Hidden from current flow; needs better lanes before re-enable.",
    progress: 24,
    status: "blocked",
    next: "Design new non-cluttered evidence surface.",
  },
  {
    id: "D13",
    group: "D",
    label: "AI risk signal ontology",
    scope: "Canonical signal families for liquidity, supply, holders, unlocks, contracts, OSINT, volume and source quality.",
    progress: 74,
    status: "partial",
    next: "PASS272 maps holder risk into whale, label, LP/depth, team, unknown and freshness lanes instead of a generic holder score.",
  },
  {
    id: "D14",
    group: "D",
    label: "Tile-specific explainer taxonomy",
    scope: "Driver, score reading, missing evidence, operator next action and confidence language per tile type.",
    progress: 91,
    status: "solid",
    next: "PASS207 decision dock keeps explainer taxonomy mapped into a four-part operator decision matrix; next wire durable source evidence to every tile.",
  },
  {
    id: "D15",
    group: "D",
    label: "Risk driver mapping",
    scope: "Map raw token evidence to concrete risk drivers rather than generic risk copy.",
    progress: 89,
    status: "partial",
    next: "PASS272 separates holder drivers into whales, wallet labels, LP/depth, team/treasury, unknown wallets and freshness pressure.",
  },
  {
    id: "D16",
    group: "D",
    label: "Source confidence lanes",
    scope: "Live, partial, fallback, stale and missing source states shown consistently inside the brain.",
    progress: 95,
    status: "solid",
    next: "PASS276 separates adapter quorum, timeouts, freshness, fallback count, retry window and reviewer seal into a visible source-confidence rail.",
  },
  {
    id: "D17",
    group: "D",
    label: "Missing-data semantics",
    scope: "Missing data increases review pressure and never becomes a clean safety verdict.",
    progress: 98,
    status: "solid",
    next: "PASS276 makes adapter errors, stale timestamps and fallback lanes explicit blockers; missing source proof remains uncertainty, not trust.",
  },
  {
    id: "D18",
    group: "D",
    label: "Basic / Pro / Advanced depth contract",
    scope: "Basic stays simple, Pro adds confidence/source lanes, Advanced opens full Orbit 360 with deeper node count.",
    progress: 92,
    status: "solid",
    next: "PASS269 keeps Basic/Pro/Advanced as direct actions and adds compact asset-regime proof gates without description clutter.",
  },
  {
    id: "D19",
    group: "D",
    label: "Brain interaction click coverage",
    scope: "Every visible static/orbit card has a stable click target and opens one detail panel only.",
    progress: 92,
    status: "solid",
    next: "PASS255 adds the action-router panel inside the selected tile drawer; next browser-test every phase and artifact tap path.",
  },
  {
    id: "D20",
    group: "D",
    label: "Brain portal layering / scroll lock",
    scope: "Brain, tile detail, mode popup and return-to-chart stay above token modal without clipping.",
    progress: 95,
    status: "solid",
    next: "PASS201 renders tile details through document.body above the Orbit layer; next regression-test every modal/dropdown z-index change.",
  },
  {
    id: "D21",
    group: "D",
    label: "Brain telemetry / FPS QA",
    scope: "Real browser FPS, input latency, reduced motion and device downgrade measurements.",
    progress: 72,
    status: "partial",
    next: "PASS260 keeps browser replay as a review packet requirement before release promotion or public badges.",
  },
  {
    id: "D22",
    group: "D",
    label: "WebGL migration contract",
    scope: "Feature-gated renderer contract for a future Three.js/WebGL brain without breaking DOM Orbit 360.",
    progress: 61,
    status: "partial",
    next: "PASS206 extends renderer contract with NEXT_PUBLIC_VLM_BRAIN_QA_HUD and clean public/QA split.",
  },
  {
    id: "D23",
    group: "D",
    label: "Brain accessibility / keyboard flow",
    scope: "Keyboard focus, Escape close, readable labels and reduced motion support for the brain surface.",
    progress: 58,
    status: "partial",
    next: "PASS207 keeps keyboard flow while adding readable decision-dock labels in the drawer; next manual screen-reader QA.",
  },
  {
    id: "D24",
    group: "D",
    label: "Brain copy localization PL/EN/DE",
    scope: "Polish, English and German copy consistency for mode labels, tile explanations and risk boundaries.",
    progress: 84,
    status: "partial",
    next: "PASS208 localizes report capsule copy across PL/EN/DE without adding public QA clutter.",
  },
  {
    id: "E01",
    group: "E",
    label: "Velmère Lens command router",
    scope: "Clean command search, Shield shortcuts, contract/source/narrative cards.",
    progress: 86,
    status: "solid",
    next: "Lens router is mapped into Shield handoff preview; next wire real route state without raw payload transfer.",
  },
  {
    id: "E02",
    group: "E",
    label: "Lens search UX",
    scope: "No button clutter, clean search field, premium cards.",
    progress: 86,
    status: "solid",
    next: "Lens search UX now has handoff preview rules; next browser QA route clarity.",
  },
  {
    id: "E03",
    group: "E",
    label: "Contract Lens",
    scope: "Contract/address parsing, flags, proxy/owner/tax lane.",
    progress: 36,
    status: "partial",
    next: "Connect chain-specific scanner.",
  },
  {
    id: "E04",
    group: "E",
    label: "Narrative Radar",
    scope: "Narrative/social/hype clustering lane.",
    progress: 36,
    status: "partial",
    next: "PASS275 adds a narrative quarantine/proof-halo gate for social, KOL disclosure, news and official source context; next connect live OSINT fetchers.",
  },
  {
    id: "E05",
    group: "E",
    label: "Source Ledger",
    scope: "Freshness/source/confidence registry UI.",
    progress: 40,
    status: "blocked",
    next: "Durable source snapshots and retention policy.",
  },
  {
    id: "E06",
    group: "E",
    label: "OSINT Queue",
    scope: "Research queue and operator task lane.",
    progress: 60,
    status: "partial",
    next: "VLM Access shortcut now participates in operator handoff planning; next wallet/session gating.",
  },
  {
    id: "E07",
    group: "E",
    label: "PDF-ready report preview",
    scope: "HTML preview route and safe report copy.",
    progress: 78,
    status: "partial",
    next: "Build real binary PDF generator.",
  },
  {
    id: "E08",
    group: "E",
    label: "QSQ / Docs shortcuts",
    scope: "Research docs, query shortcuts, command mapping.",
    progress: 42,
    status: "partial",
    next: "Clean navigation and avoid duplicate CTA clutter.",
  },
  {
    id: "F01",
    group: "F",
    label: "Public Security page",
    scope: "Trust copy, no overclaims, security model explanation.",
    progress: 70,
    status: "launch_control",
    next: "Legal/security review and actual control proof.",
  },
  {
    id: "F02",
    group: "F",
    label: "Security headers / CSP",
    scope: "Headers, CSP, route hardening, icon proxy checks.",
    progress: 78,
    status: "partial",
    next: "Finalize production CSP and test external image/source policy.",
  },
  {
    id: "F03",
    group: "F",
    label: "API Abuse Shield",
    scope: "Route guard profiles, rate limits, event logging.",
    progress: 64,
    status: "partial",
    next: "Connect persistent rate limit store and tune thresholds.",
  },
  {
    id: "F04",
    group: "F",
    label: "Admin gate",
    scope: "Admin route locked; real auth still blocked.",
    progress: 49,
    status: "blocked",
    next: "Choose auth provider and enforce sessions server-side.",
  },
  {
    id: "F05",
    group: "F",
    label: "Security event ledger",
    scope: "Security event append contract and admin read/export route.",
    progress: 45,
    status: "blocked",
    next: "Durable DB/storage adapter required.",
  },
  {
    id: "F06",
    group: "F",
    label: "WAF checklist",
    scope: "Vercel/WAF rules checklist and runtime QA gate.",
    progress: 62,
    status: "partial",
    next: "Apply real WAF rules in Vercel.",
  },
  {
    id: "F07",
    group: "F",
    label: "Release gate dashboard",
    scope: "Operational launch gate dashboard.",
    progress: 66,
    status: "partial",
    next: "Persist QA evidence and link to real deployment status.",
  },
  {
    id: "F08",
    group: "F",
    label: "Secret redaction",
    scope: "Static and runtime redaction policies.",
    progress: 45,
    status: "blocked",
    next: "Apply to all provider/payment/admin logs.",
  },
  {
    id: "G01",
    group: "G",
    label: "Product cards",
    scope: "Luxury cards, truth fields, provider state.",
    progress: 73,
    status: "solid",
    next: "Replace preview media with real provider snapshots.",
  },
  {
    id: "G02",
    group: "G",
    label: "Product detail truth",
    scope: "Material, size, delivery, returns, limitations.",
    progress: 73,
    status: "partial",
    next: "Wire final SKU/provider data.",
  },
  {
    id: "G03",
    group: "G",
    label: "Cart / checkout surface",
    scope: "Checkout disabled until payment/order proof.",
    progress: 50,
    status: "launch_control",
    next: "Keep launch-gated until backend proof.",
  },
  {
    id: "G04",
    group: "G",
    label: "Stripe checkout",
    scope: "Payment setup and route controls.",
    progress: 28,
    status: "blocked",
    next: "Configure Stripe envs and test signed flow.",
  },
  {
    id: "G05",
    group: "G",
    label: "Webhook signature verification",
    scope: "Signed webhook route and replay QA.",
    progress: 32,
    status: "blocked",
    next: "Run real Stripe CLI/Vercel replay tests.",
  },
  {
    id: "G06",
    group: "G",
    label: "Order persistence",
    scope: "Order database/event ledger/idempotency.",
    progress: 21,
    status: "blocked",
    next: "Add durable store and retry policy.",
  },
  {
    id: "G07",
    group: "G",
    label: "Fulfilment handoff",
    scope: "Printful/provider mapping, shipment handoff.",
    progress: 26,
    status: "blocked",
    next: "Choose provider, validate SKU mapping.",
  },
  {
    id: "G08",
    group: "G",
    label: "Refund/support workflow",
    scope: "Return/refund states and support timeline.",
    progress: 43,
    status: "blocked",
    next: "Create support-safe timeline storage.",
  },
  {
    id: "G09",
    group: "G",
    label: "Tax/VAT clarity",
    scope: "EU/Germany tax clarity and checkout tax handling.",
    progress: 31,
    status: "blocked",
    next: "Legal/accounting review and tax engine choice.",
  },
  {
    id: "H01",
    group: "H",
    label: "VLM Access page",
    scope: "Utility/access framing, no ROI copy.",
    progress: 57,
    status: "launch_control",
    next: "Audit every line for utility-only compliance.",
  },
  {
    id: "H02",
    group: "H",
    label: "Basic/Pro/Advanced access",
    scope: "Tier copy and visual consistency.",
    progress: 61,
    status: "partial",
    next: "Connect actual entitlement/session gates.",
  },
  {
    id: "H03",
    group: "H",
    label: "Wallet connect readiness",
    scope: "No seed phrase; safe connect boundary.",
    progress: 57,
    status: "blocked",
    next: "Choose wallet provider and implement safe session proof.",
  },
  {
    id: "H04",
    group: "H",
    label: "Token agreement",
    scope: "Legal utility/access agreement.",
    progress: 34,
    status: "blocked",
    next: "Draft/legal review and localization.",
  },
  {
    id: "H05",
    group: "H",
    label: "Private digital layer copy",
    scope: "Premium access language without investment promise.",
    progress: 58,
    status: "partial",
    next: "Full PL/EN/DE copy pass.",
  },
  {
    id: "I01",
    group: "I",
    label: "Velmère Square",
    scope: "Community/private layer shell.",
    progress: 48,
    status: "partial",
    next: "Define moderation and member utility.",
  },
  {
    id: "I02",
    group: "I",
    label: "Community page",
    scope: "Join/follow/learn flow.",
    progress: 42,
    status: "partial",
    next: "Connect Square and rules.",
  },
  {
    id: "I03",
    group: "I",
    label: "Research Lab",
    scope: "Prime/crypto research framed as exploratory audit.",
    progress: 36,
    status: "partial",
    next: "Separate research from product claims.",
  },
  {
    id: "I04",
    group: "I",
    label: "FAQ",
    scope: "Plain-language support, legal-safe questions.",
    progress: 48,
    status: "partial",
    next: "Full translation and wallet/payment safety.",
  },
  {
    id: "I05",
    group: "I",
    label: "Contact",
    scope: "Support path and seller trust.",
    progress: 55,
    status: "partial",
    next: "Add structured support categories.",
  },
  {
    id: "I06",
    group: "I",
    label: "Account/login aliases",
    scope: "Canonical route behavior and copy consistency.",
    progress: 45,
    status: "partial",
    next: "Normalize aliases and auth states.",
  },
  {
    id: "I07",
    group: "I",
    label: "Lookbook",
    scope: "Premium editorial brand visuals.",
    progress: 48,
    status: "partial",
    next: "Final images and mobile rhythm.",
  },
  {
    id: "I08",
    group: "I",
    label: "Bot AI / calculator assistant concept",
    scope: "Future assistant lane, not public production claim.",
    progress: 18,
    status: "blocked",
    next: "Define scope and safety guardrails.",
  },
  {
    id: "J01",
    group: "J",
    label: "SEO metadata",
    scope: "Metadata, social cards, route titles.",
    progress: 62,
    status: "partial",
    next: "Full localized metadata audit.",
  },
  {
    id: "J02",
    group: "J",
    label: "Accessibility / ARIA",
    scope: "Keyboard navigation, focus, semantic controls.",
    progress: 64,
    status: "partial",
    next: "PASS269 reduces modal cognitive load by removing description blocks and keeping a compact proof-gate dock; next run manual keyboard and screen reader QA.",
  },
  {
    id: "J03",
    group: "J",
    label: "Responsive layout",
    scope: "Mobile, tablet, desktop, overflow containment.",
    progress: 74,
    status: "partial",
    next: "Real-device QA.",
  },
  {
    id: "J04",
    group: "J",
    label: "Scroll lock / z-index layers",
    scope: "Modal scroll lock, portals, dropdown stacking.",
    progress: 94,
    status: "solid",
    next: "PASS206 hides QA overlays/zoom/watermark from public Orbit layers unless explicit QA gates are active.",
  },
  {
    id: "J05",
    group: "J",
    label: "Image optimization",
    scope: "Next image, remote policy, no raw img.",
    progress: 79,
    status: "solid",
    next: "Optimize final assets.",
  },
  {
    id: "J06",
    group: "J",
    label: "Animation performance",
    scope: "Lazy animation, no setState per frame, pause hidden.",
    progress: 97,
    status: "partial",
    next: "Animation performance remains guarded by QA lanes; next real FPS trace on device.",
  },
  {
    id: "K01",
    group: "K",
    label: "Durable audit ledger",
    scope: "Append-only audit source storage.",
    progress: 50,
    status: "blocked",
    next: "PASS219 defines source/case/redaction/export write targets; next connect real DB/storage adapter.",
  },
  {
    id: "K02",
    group: "K",
    label: "Source freshness registry",
    scope: "TTL, stale badges, source confidence.",
    progress: 71,
    status: "partial",
    next: "PASS285 customer brief proof compass now treats source freshness TTL decay as a report blocker before public customer copy.",
  },
  {
    id: "K03",
    group: "K",
    label: "Analytics event taxonomy",
    scope: "Event naming and privacy redaction.",
    progress: 42,
    status: "blocked",
    next: "Analytics event taxonomy now has release QA and handoff lane markers; next durable event capture.",
  },
  {
    id: "K04",
    group: "K",
    label: "Storage adapter contract",
    scope: "Server-only adapter, no localStorage proof.",
    progress: 54,
    status: "blocked",
    next: "PASS219 separates source snapshot, case timeline, redaction envelope and export manifest write contracts; next implement database adapter.",
  },
  {
    id: "K05",
    group: "K",
    label: "Privacy redaction envelope",
    scope: "PII/secrets redaction for export/logs.",
    progress: 93,
    status: "partial",
    next: "PASS285 customer brief proof compass keeps raw payload masked before customer-safe report copy can upgrade.",
  },
  {
    id: "K06",
    group: "K",
    label: "Operator cases",
    scope: "Case ownership/timeline/actions.",
    progress: 76,
    status: "partial",
    next: "PASS283 adds a Concierge Escalation Rail for owner, SLA, source replay, redaction, storage write and reopen-trigger case stages.",
  },
  {
    id: "K07",
    group: "K",
    label: "Retention policy",
    scope: "How long snapshots/audits stay stored.",
    progress: 36,
    status: "blocked",
    next: "PASS285 links retention/delete owner and TTL policy directly into customer brief readiness.",
  },
  {
    id: "L01",
    group: "L",
    label: "Holder feed",
    scope: "Whale/cluster/holder concentration feed.",
    progress: 50,
    status: "partial",
    next: "PASS272 adds a visible holder concentration gate while real chain/indexer provider selection remains the next adapter step.",
  },
  {
    id: "L02",
    group: "L",
    label: "Orderbook feed",
    scope: "Depth/spread/slippage feed.",
    progress: 42,
    status: "blocked",
    next: "Choose exchange/liquidity provider; PASS214 now exposes liquidity/orderbook coverage debt in the Brain drawer.",
  },
  {
    id: "L03",
    group: "L",
    label: "Contract analyzer",
    scope: "Owner/proxy/mint/pause/blacklist/tax scanner.",
    progress: 43,
    status: "blocked",
    next: "Build per-chain adapter; PASS214 now blocks/reviews public contract copy when source evidence is missing.",
  },
  {
    id: "L04",
    group: "L",
    label: "Unlock / vesting feed",
    scope: "Team/investor/advisor unlock schedule.",
    progress: 41,
    status: "blocked",
    next: "Choose unlock data provider.",
  },
  {
    id: "L05",
    group: "L",
    label: "OSINT feed",
    scope: "KOL/social/news/source queue.",
    progress: 48,
    status: "partial",
    next: "PASS275 adds an OSINT narrative quarantine gate with attention, disclosure, official proof, news, cooldown and source freshness lanes; next wire durable social/news source fetchers.",
  },
  {
    id: "L06",
    group: "L",
    label: "Adapter timeouts / fallbacks",
    scope: "Timeout policy, stale/missing UI, no final verdict.",
    progress: 72,
    status: "partial",
    next: "PASS276 adds a source adapter quorum circuit breaker: timeout, freshness, fallback count, retry cooldown and reviewer seal now appear directly in the token modal.",
  },
  {
    id: "L07",
    group: "L",
    label: "Allowlists / source policy",
    scope: "Trusted sources, blocklists and confidence mapping.",
    progress: 53,
    status: "partial",
    next: "PASS277 adds a visible source policy allowlist gate with trusted-source classes, second-source proof, privacy boundary and private proof passport; next persist source governance server-side.",
  },
  {
    id: "M01",
    group: "M",
    label: "Velmère Shield Report",
    scope: "Customer-safe risk brief with timestamps.",
    progress: 78,
    status: "partial",
    next: "PASS285 adds Customer-Safe Risk Brief Gate with Proof Compass and Velvet Brief Seal before any customer-visible report copy.",
  },
  {
    id: "M02",
    group: "M",
    label: "Lens report preview",
    scope: "PDF-ready HTML report preview.",
    progress: 80,
    status: "partial",
    next: "PASS285 routes Lens/Shield report preview through source appendix, missing-data and redaction boundaries before PDF readiness.",
  },
  {
    id: "M03",
    group: "M",
    label: "Evidence Note",
    scope: "Short evidence note, no safety certificate wording.",
    progress: 66,
    status: "partial",
    next: "Evidence note now links source ledger preview lanes; next durable evidence note storage.",
  },
  {
    id: "M04",
    group: "M",
    label: "Safe export wording",
    scope: "No guaranteed safety/certificate/financial advice.",
    progress: 100,
    status: "solid",
    next: "PASS285 locks customer brief wording to review/status language only: no guarantees, accusations, trading pressure or safety-certificate copy.",
  },
  {
    id: "M05",
    group: "M",
    label: "Redacted payload export",
    scope: "No raw IP, secrets, customer PII in exports.",
    progress: 91,
    status: "partial",
    next: "PASS285 makes customer brief/export require redacted payload, storage, retention and source replay gates before public copy.",
  },
  {
    id: "M06",
    group: "M",
    label: "Report download route",
    scope: "Future PDF download with safe renderer.",
    progress: 56,
    status: "blocked",
    next: "PASS260 adds release badge lock and review packet firewall; binary PDF remains blocked until durable renderer evidence exists.",
  },
  {
    id: "M07",
    group: "M",
    label: "Operator-only report fields",
    scope: "Separate internal vs customer-visible details.",
    progress: 96,
    status: "solid",
    next: "PASS260 makes promotion firewall fields operator-only and keeps customer/public surfaces frozen until review packets pass.",
  },
];

export const velmereMasterBuildAreaSummary = {
  total: velmereMasterBuildAreas.length,
  averageProgress: Math.round(velmereMasterBuildAreas.reduce((sum, area) => sum + area.progress, 0) / velmereMasterBuildAreas.length),
  blocked: velmereMasterBuildAreas.filter((area) => area.status === "blocked").length,
  launchControl: velmereMasterBuildAreas.filter((area) => area.status === "launch_control").length,
  pass199DeltaLedger: true,
  pass200AiBrainMatrix: true,
  pass202AiBrainLocalization: true,
  pass208AiBrainReportCapsule: true,
  pass209AiBrainCapsuleEnvelope: true,
  pass210AiBrainCapsuleHandoff: true,
  pass211AiBrainOperatorActionQueue: true,
  pass212AiBrainCaseReviewTimeline: true,
  pass213AiBrainCustomerExportFirewall: true,
  pass214AiBrainSourceCoverageMatrix: true,
  pass215AiBrainReleaseReviewPacket: true,
};

// PASS198 marker: expanded master build map with 100+ granular Velmère areas across A-M.
// PASS199 marker: progress delta ledger active; every pass must report Previous → Current → Change rows for changed areas.

// PASS200 marker: AI Brain has explicit D01-D24 matrix coverage, not a hidden generic VLM bucket.
// PASS201 marker: AI Brain detail portal, keyboard navigation and pause-on-read are tracked in D07/D19/D20/D23.

// PASS202 marker: AI Brain detail drawer localized PL/EN/DE with source trust, publication state and previous/next tile navigation.
// PASS201 compatibility marker: previous D23 progress: 51 before PASS202 localization/source-trust drawer delta.

// PASS206 marker: AI Brain public HUD cleanup + gated WebGL trace telemetry updates A06/D10/D11/D21/D22/J04/J06.

// PASS208 marker: AI Brain report capsule bridges selected tile reasoning into public brief, internal memo, redaction rule and export gate without claiming binary PDF readiness.

// PASS209 marker: AI Brain report capsule now has a typed redacted envelope, schema id and export-readiness state.
// PASS208 report capsule compatibility marker: selected Brain tile kept public brief, internal memo, redaction rule and export gate before PASS209 typed envelope.

// PASS210 marker: AI Brain capsule handoff bridge adds source freshness, storage mode and blocker state before PDF/report export.
// PASS209 compatibility marker: PASS209 adds a first redaction envelope for Brain tile capsules before PASS210 handoff bridge.

// PASS211 marker: AI Brain operator action queue converts capsule/handoff/source state into P1/P2/P3 operator tasks before any customer export.
// PASS210 compatibility marker: report handoff bridge remains active before PASS211 operator queue.
// PASS210 adds a capsule-level freshness handoff compatibility marker for PASS210 guard.

// PASS212 marker: AI Brain case-review timeline links capsule, handoff and operator action events before customer export.
// PASS213 marker: AI Brain customer export firewall adds source debt, evidence coverage, redaction score and PDF gate before any customer download.

// PASS214 marker: AI Brain source coverage matrix adds lane-level source coverage, review SLA, second-source and export-pressure gates.
// PASS215 marker: AI Brain release review packet combines source coverage, freshness, redaction, durable case, customer copy and PDF route gates.

// PASS216 marker: AI Brain source truth spine tracked in D15/D16/D17/K02/K05/L06/M05/M07.

// PASS217 marker: AI Brain live adapter freshness mesh tracked in D16/D17/D21/K02/K05/L06/L07/M05/M07.

// PASS218 marker: AI Brain source policy gate tracked in D16/K02/L07/M04/M07.
// PASS219 marker: AI Brain durable snapshot plan tracked in K01/K04/K05/K06/M05/M06/M07.

// PASS217 compatibility marker: TTL, cache decision, hard-stop and source-ledger preview are part of live adapter freshness.

// PASS220 marker: AI Brain release chain auditor tracked in D15/D16/D17/K04/K05/M01/M05/M06/M07.
// PASS221 marker: AI Brain source ledger UI preview tracked in K02/K03/M03/M05/M07.
// PASS222 marker: AI Brain PDF preview manifest tracked in M01/M02/M04/M06.
// PASS223 marker: AI Brain Lens-to-Shield handoff tracked in E01/E02/E06/M02.
// PASS224 marker: AI Brain release QA scorecard tracked in A06/D21/J06/M06/M07.

// PASS225-PASS232 release readiness mega-branch active: blocker/browser/copy/PDF/persistence/live-feed/wallet/launch gates tracked.

// PASS254 marker: AI Brain Release Cockpit Source Ledger Handoff tracked in D15/D16/D17/D19/K02/K04/K05/M01/M05/M06/M07; public export, wallet access, raw payload and binary PDF remain blocked.

// PASS255 marker: AI Brain Action Router Browser Replay Export Freeze tracked in D15/D16/D17/D19/D21/K02/M01/M05/M06/M07; public export, wallet access, raw payload and binary PDF remain blocked.

// PASS256 marker: AI Brain Evidence Runbook Export Quarantine tracked in D15/D16/D17/D19/D21/K02/K06/M01/M05/M06/M07; public export, wallet access, customer copy, raw payload and binary PDF remain blocked until storage, redaction and browser replay evidence are attached.

// PASS257 marker: AI Brain Evidence SLA Timeline Exception Firewall tracked in D15/D16/D17/D21/K06/M05/M06/M07; public export, raw payload, binary PDF, wallet access, customer copy and release override remain frozen until durable proof exists.
// PASS258 marker: AI Brain Proof Receipt Lock tracked in D15/D16/D17/D21/K02/K05/K06/M01/M05/M06/M07; public export, raw payload, binary PDF, wallet access and customer copy remain locked.
// PASS259 marker: AI Brain Attestation Ledger active and tracked in D15/D16/D17/D21/K02/K05/K06/M01/M05/M06/M07; release promotion remains frozen until reviewed source, redaction, storage and browser proof exists.

// PASS260 marker: AI Brain Release Promotion Firewall active; review packets, customer freeze and release badge lock stay operator-only until source, browser, storage and redaction packets pass.
// PASS261 marker: AI Brain Release Cutover Control active; rollback vault and readiness seals stay operator-only until reviewed proof and owner signoff exist.
// PASS262 marker: AI Brain Release Rehearsal Matrix active; dry-run evidence, rollback drill, owner signoff and surface locks stay operator-only until reviewed proof exists.

// PASS263 marker: AI Brain Release Candidate Trust Board active; dry-run lanes become candidate trust cues and customer-safe copy boundaries while public surfaces stay locked.

// PASS264 marker: AI Brain Trust Narrative Guard active; candidate trust cues become context-first narrative stages and dark-pattern checks while public surfaces stay locked.

// PASS265 marker: AI Brain Evidence Language Ledger active; PASS264 trust narrative stages become evidence-first language steps and tone checks while public surfaces stay locked.

// PASS266 marker: AI Brain Claim Traceability Matrix active; PASS265 evidence-language steps become claim-to-evidence lanes, evidence anchors and comprehension checks while public surfaces stay locked.

// PASS267 marker: Lens ShieldMap Brain UI hotfix active; tracked in D06/D07/D18/C02/E02/J04 with UI screenshot blockers resolved before deeper page-catalog development continues.

// PASS268 marker: Chart natural pan + no-OPIS VLM mode dock active; tracked in C07/C08/D18/J02/M04 with safe status/MwSt trust psychology and no investment pressure.

// PASS269 marker: Compact mode dock + asset-regime reserve/peg/custody gate + corrected visual chart drag active; tracked in C07/C08/C09/D18/J02/M04.

// PASS270 marker: Market-pressure anti-FOMO rail active; tracked in C10/L02/L04/D15/J02/M04. Low-float, unlock, depth, hype and source trust stay review cues, never buy/sell pressure.

// PASS271 marker: Contract trap gate active; tracked in C11/L03/D15/D16/D17/M04. Owner/proxy/mint/pause/blacklist/tax/sell-path are review cues, not safety certification.

// PASS272 marker: Holder concentration gate active; tracked in L01/C06/D13/D15/D16/D17/M04. Whale/CEX/LP/team/unknown/freshness lanes remain review cues and missing labels never become safety certification.

// PASS273 marker: Liquidity exit route gate active; tracked in L02/C06/D16/D17/L06/M04. Orderbook spread, bid depth, slippage, imbalance and source freshness stay review cues, not trade instructions.

// PASS274 marker: Unlock vesting cliff radar gate active; tracked in L04/C06/D13/D17/L06/M04. Float, FDV gap, next cliff, team/advisor lane, cooldown and source proof stay review cues, not trade instructions.

// PASS275 marker: OSINT narrative quarantine gate active for L05/E04; social/news/KOL context stays source-gated and anti-FOMO.

// PASS276 marker: Source adapter quorum gate active for L06/K02/D16/D17; timeouts, fallback, freshness and reviewer seal stay visible and anti-FOMO.

// PASS277 marker: Source policy allowlist gate active for L07/K02/K05/D16/D17; trusted classes, second-source proof, privacy boundary and private proof passport stay review-gated.

// PASS278 marker: Durable audit receipt vault active for K01/K04/K05/K06; redacted case receipts stay storage-locked until server adapter, retention owner and source policy clearance exist.

// PASS279 marker: Source freshness registry gate active for K02/D16/D17/K01/K06/M05; chart/depth/policy/receipt TTL decay and private freshness seal stay review-gated.

// PASS280 marker: Analytics event taxonomy gate active for K03/K05/K06/M05; event keys, privacy classes, anti-FOMO cooldown and Velvet Event Passport stay redacted/operator-gated.

// PASS281 marker: Storage adapter contract gate active for K04/K01/K05/K06/M05/M04; server-only writes, idempotency, retention and export replay stay blocked until real storage adapter proof exists.

// PASS282 marker: Privacy redaction envelope gate active for K05/M05/K03/K04/K06/M04; raw query, wallet/IP, analytics, receipt and export payloads stay masked/operator-only until server storage, retention and replay proof exist.

// PASS283 marker: Operator case SLA orchestrator gate active for K06/M07/K04/K05/M05/M04; owner, SLA, redaction, storage and source replay stages remain private until durable proof exists.

// PASS284 marker: Retention policy gate active for K07/K04/K05/K06/M05/M04; Quiet Vault Clock, Velvet TTL Seal, delete owner and no wallet/IP retention boundaries stay private until durable storage and redaction proof exist.

// PASS285 marker: Customer-safe risk brief gate active for M01/M02/M04/M05/K02/K05/K07; Proof Compass and Velvet Brief Seal keep public report copy source-linked, redacted, TTL-bounded and anti-FOMO.
