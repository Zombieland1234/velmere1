export type VelmereSitePageStatus = "blocked" | "partial" | "solid" | "launch_control";
export type VelmereVercelRisk = "low" | "medium" | "high";

export type VelmereSitePageAuditItem = {
  id: string;
  route: string;
  title: string;
  area: "brand" | "commerce" | "vlm" | "shield" | "community" | "account" | "legal" | "ops";
  progress: number;
  status: VelmereSitePageStatus;
  vercelRisk: VelmereVercelRisk;
  userGoal: string;
  currentState: string;
  launchBlockers: string[];
  nextPass: string;
};

export const velmereSitePageAudit: VelmereSitePageAuditItem[] = [
  {
    id: "home",
    route: "/[locale]",
    title: "Home / brand landing",
    area: "brand",
    progress: 76,
    status: "solid",
    vercelRisk: "low",
    userGoal: "Understand Velmère in a few seconds and choose clothing, VLM access or Square without confusion.",
    currentState: "Premium shell exists and PASS169 fixes the Home readiness-index locale runtime scope.",
    launchBlockers: ["real browser QA", "mobile rhythm", "CTA priority", "production media"],
    nextPass: "Real-device QA Home first screen, readiness index spacing and route-to-product clarity.",
  },
  {
    id: "clothing-alias",
    route: "/[locale]/clothing",
    title: "Clothing legacy alias",
    area: "commerce",
    progress: 100,
    status: "solid",
    vercelRisk: "low",
    userGoal: "Reach the canonical shop without seeing a duplicate catalogue or stale metadata.",
    currentState: "The legacy clothing route redirects to the localized /shop catalogue.",
    launchBlockers: [],
    nextPass: "Keep navigation, sitemap and canonical metadata pointed at /shop.",
  },
  {
    id: "shop",
    route: "/[locale]/shop",
    title: "Shop catalogue",
    area: "commerce",
    progress: 82,
    status: "partial",
    vercelRisk: "low",
    userGoal: "Move from browse to product detail without fake stock, fake pricing or missing delivery truth.",
    currentState: "Catalogue is the canonical commerce route with real category filtering and truthful product states.",
    launchBlockers: ["real checkout", "tax/shipping integration", "provider availability", "return policy linking"],
    nextPass: "Make every product state explicit: preview, available, sold out, provider pending or checkout disabled.",
  },
  {
    id: "product-detail",
    route: "/[locale]/shop/[id]",
    title: "Product detail pages",
    area: "commerce",
    progress: 70,
    status: "partial",
    vercelRisk: "medium",
    userGoal: "See exact product truth before buying: size, material, delivery, returns and limitations.",
    currentState: "Dynamic product details exist, but launch depends on real provider truth and checkout safety.",
    launchBlockers: ["provider SKU mapping", "size proof", "delivery estimates", "payment flow"],
    nextPass: "Audit product detail pages for every language and forbid checkout unless product truth is complete.",
  },
  {
    id: "cart-checkout",
    route: "/[locale]/cart + /[locale]/checkout",
    title: "Cart / checkout",
    area: "commerce",
    progress: 50,
    status: "launch_control",
    vercelRisk: "medium",
    userGoal: "Buy safely with correct totals, tax, shipping, delivery and return information.",
    currentState: "Checkout must remain launch-controlled until real provider/payment/order-state flows are verified.",
    launchBlockers: ["payment provider", "tax handling", "shipping cost", "order confirmation", "refund flow"],
    nextPass: "Keep checkout route blocked with launch-control UI until provider checkout, tax, shipping, order state and refunds are verified.",
  },
  {
    id: "vlm-token",
    route: "/[locale]/vlm-token",
    title: "VLM token / access layer",
    area: "vlm",
    progress: 54,
    status: "partial",
    vercelRisk: "medium",
    userGoal: "Understand VLM as utility/access, not investment, yield or price-promise.",
    currentState: "Utility wording is improving; session gating and final legal copy remain blockers.",
    launchBlockers: ["no ROI language review", "wallet/session gating", "token agreement", "risk copy"],
    nextPass: "Audit every VLM page for utility-only wording and remove any sentence that sounds like investment promotion.",
  },
  {
    id: "vlm-token-faq",
    route: "/[locale]/vlm-token/faq",
    title: "VLM token FAQ",
    area: "vlm",
    progress: 48,
    status: "partial",
    vercelRisk: "medium",
    userGoal: "Answer common questions without implying guaranteed access, profit, custody or investment safety.",
    currentState: "FAQ route exists; copy needs full PL/EN/DE consistency and legal-safe wording.",
    launchBlockers: ["complete translations", "legal wording", "no investment advice", "wallet safety"],
    nextPass: "Rewrite FAQ as plain-language safety + utility access guide.",
  },
  {
    id: "square",
    route: "/[locale]/square",
    title: "Velmère Square",
    area: "community",
    progress: 43,
    status: "partial",
    vercelRisk: "medium",
    userGoal: "Understand the community/product layer without confusing it with trading or investment claims.",
    currentState: "Square route exists, but product modules, moderation rules and member utility need definition.",
    launchBlockers: ["community rules", "moderation", "member utility", "content safety", "clear CTA"],
    nextPass: "Define Square as community + private digital layer: what users can do, what is blocked and what is coming later.",
  },
  {
    id: "community",
    route: "/[locale]/community",
    title: "Community",
    area: "community",
    progress: 42,
    status: "partial",
    vercelRisk: "low",
    userGoal: "Learn how to join or follow Velmère without unclear promises.",
    currentState: "Community shell exists, but launch content and moderation policy are still thin.",
    launchBlockers: ["moderation policy", "community CTA", "safe content rules"],
    nextPass: "Connect community page with Square and keep CTA simple.",
  },
  {
    id: "shield-table",
    route: "/[locale]/market-integrity",
    title: "Velmère Shield market table",
    area: "shield",
    progress: 100,
    status: "solid",
    vercelRisk: "low",
    userGoal: "Find tokens, see logo-backed suggestions, sort anomalies and open a risk terminal with clickable VLM AI Brain tiles without fake certainty.",
    currentState: "PASS216 keeps DOM Orbit as public fallback and adds source-truth spine lanes to clicked VLM Brain tiles before customer/PDF export.",
    launchBlockers: ["holder API", "orderbook API", "contract checks", "rate limits", "mobile table real-device QA", "live search browser QA", "real VLM Brain FPS QA"],
    nextPass: "Compare DOM Orbit against the gated WebGL prototype in real Vercel browser sessions, then connect first durable orderbook/holder adapters."
  },
  {
    id: "shield-map",
    route: "/[locale]/shield-map",
    title: "Shield Map",
    area: "shield",
    progress: 69,
    status: "partial",
    vercelRisk: "medium",
    userGoal: "Understand the Shield operating model and see that VLM AI Brain, source confidence, Lens, reports and live adapters are tracked separately.",
    currentState: "PASS216 keeps the AI Brain visible as explicit D01-D24 lanes and adds a selected-tile source truth spine with adapter freshness/cache/export gates; map copy still needs tightening.",
    launchBlockers: ["copy compression", "translation consistency", "source policy", "export policy"],
    nextPass: "Compress long sections into operator lanes and keep only one active explanation surface per scroll block.",
  },
  {
    id: "shield-about",
    route: "/[locale]/market-integrity/about",
    title: "Shield about / product explainer",
    area: "shield",
    progress: 50,
    status: "partial",
    vercelRisk: "low",
    userGoal: "Know what Shield does, what it does not do and how it avoids hype.",
    currentState: "Route exists; needs stronger public explanation of limitations and data modes.",
    launchBlockers: ["source limitations", "manual review language", "not advice wording"],
    nextPass: "Make the about page a short, clear product safety page.",
  },
  {
    id: "account-login",
    route: "/[locale]/account + /[locale]/login + aliases",
    title: "Account / login aliases",
    area: "account",
    progress: 45,
    status: "partial",
    vercelRisk: "medium",
    userGoal: "Sign in without duplicate-route confusion and without wallet seed-phrase risk.",
    currentState: "Many alias routes exist; they need canonical behavior and consistent copy.",
    launchBlockers: ["canonical redirect policy", "auth state", "wallet safety", "session copy"],
    nextPass: "Normalize account/login/konto/logowanie/signin/sign-in routes and prevent duplicate UX drift.",
  },
  {
    id: "member",
    route: "/[locale]/member",
    title: "Member / VLM access cockpit",
    area: "vlm",
    progress: 38,
    status: "blocked",
    vercelRisk: "medium",
    userGoal: "See access benefits only after safe session/member proof, without investment promise.",
    currentState: "Member route exists but production access gating is not wired.",
    launchBlockers: ["session gating", "wallet proof", "membership rules", "no ROI language"],
    nextPass: "Build utility-only member cockpit with blocked state before auth is production-ready.",
  },
  {
    id: "lookbook",
    route: "/[locale]/lookbook",
    title: "Lookbook",
    area: "brand",
    progress: 48,
    status: "partial",
    vercelRisk: "low",
    userGoal: "Feel the brand visually and move naturally to collection or Square.",
    currentState: "Route exists; final editorial assets and mobile rhythm are not launch-finished.",
    launchBlockers: ["final visuals", "mobile layout", "CTA path"],
    nextPass: "Make lookbook a premium brand page, not a placeholder gallery.",
  },
  {
    id: "research-lab",
    route: "/[locale]/research-lab",
    title: "Research Lab",
    area: "ops",
    progress: 36,
    status: "partial",
    vercelRisk: "medium",
    userGoal: "See experimental work without confusing it with proven scientific or investment claims.",
    currentState: "Route exists; needs strict boundary between experiments, claims and public product.",
    launchBlockers: ["claim safety", "source policy", "public wording", "legal review"],
    nextPass: "Label research as exploratory and keep crypto/investment/scientific claims conservative.",
  },
  {
    id: "legal-pages",
    route: "/[locale]/legal/* + privacy/terms/shipping/returns/impressum/contact/faq",
    title: "Legal and trust pages",
    area: "legal",
    progress: 72,
    status: "launch_control",
    vercelRisk: "low",
    userGoal: "Find seller identity, privacy, terms, shipping, returns and contact before checkout.",
    currentState: "Core pages exist; final legal verification and merchant identity confirmation remain required.",
    launchBlockers: ["final legal review", "merchant identity", "policy consistency", "localized copy"],
    nextPass: "Run legal text consistency pass across all language aliases and footer links.",
  },
  {
    id: "payment-order-state",
    route: "/[locale]/checkout + payment/webhook/order ops",
    title: "Payment / order state",
    area: "ops",
    progress: 28,
    status: "blocked",
    vercelRisk: "high",
    userGoal: "Complete payment only when provider, tax, order state, webhooks, receipts and refunds are production wired.",
    currentState: "Payment/order readiness matrix and order event ledger exist; real provider, database, signed webhook and email systems remain blocked.",
    launchBlockers: ["payment provider", "tax engine", "order database", "signed webhooks", "refund state", "transactional email"],
    nextPass: "Persist order event ledger, idempotency key store and signed webhook state behind environment gates.",
  },
  {
    id: "order-event-ledger",
    route: "/[locale]/checkout + webhook/order audit trail",
    title: "Order event ledger",
    area: "ops",
    progress: 21,
    status: "blocked",
    vercelRisk: "high",
    userGoal: "Trace every checkout, payment, refund and fulfillment event without duplicate or lost state.",
    currentState: "Order event ledger model and UI exist; persistent storage, idempotency store and signed provider webhooks are still blocked.",
    launchBlockers: ["event storage", "idempotency key store", "signed webhook verification", "retry queue", "order timeline", "support handoff"],
    nextPass: "Add persistent event envelope storage and provider webhook signature verification.",
  },
  {
    id: "admin-import",
    route: "/[locale]/admin/import-products",
    title: "Admin import products",
    area: "ops",
    progress: 85,
    status: "blocked",
    vercelRisk: "high",
    userGoal: "Import products safely without exposing admin tooling to public traffic.",
    currentState: "Admin route gate matrix exists, locked admin surface exists, server auth contract, auth session guard, role/scope map, idempotency store contract, publish permission gate, secret redaction policy, mutation audit envelope, audit persistence contract, locked audit write API route, rollback context, support-safe timeline and customer-safe export boundary exist; real auth provider, server session reader and persistent storage remain blocked.",
    launchBlockers: ["admin auth", "route protection", "environment checks", "import audit logs"],
    nextPass: "Choose auth provider, implement server session middleware and create persistent idempotency/audit storage adapters.",
  },

  {
    id: "velmere-lens",
    route: "/[locale]/search",
    title: "Velmère Lens / command search",
    area: "shield",
    progress: 83,
    status: "solid",
    vercelRisk: "low",
    userGoal: "Search tokens, contracts, sources and Shield shortcuts without button clutter.",
    currentState: "Lens command router exists with clean cards, report preview lane and PASS199 delta reporting; real PDF generator remains separate.",
    launchBlockers: ["real PDF", "source ledger", "contract adapters", "copy consistency"],
    nextPass: "Differentiate token, contract, narrative and source results while keeping one clear action per card.",
  },
  {
    id: "security-trust",
    route: "/[locale]/security",
    title: "Security Trust page",
    area: "ops",
    progress: 70,
    status: "launch_control",
    vercelRisk: "medium",
    userGoal: "Explain security controls without claiming impossible guarantees.",
    currentState: "Public trust copy and operations checklist exist; real WAF/env/auth evidence still needs production proof.",
    launchBlockers: ["WAF", "auth provider", "durable audit", "env proof"],
    nextPass: "Connect public security copy to actual production controls and avoid overclaim language.",
  },
  {
    id: "reports-evidence",
    route: "/[locale]/reports + /api/search/lens-report",
    title: "Reports / evidence export",
    area: "ops",
    progress: 50,
    status: "partial",
    vercelRisk: "medium",
    userGoal: "Export a safe, source-backed risk brief without raw secrets or fake safety certificates.",
    currentState: "PDF-ready HTML preview exists; PASS199 improves evidence/progress reporting, but binary PDF generation and durable source ledger are not complete.",
    launchBlockers: ["real PDF generator", "redacted payload", "durable source ledger", "customer-safe approval"],
    nextPass: "Build report generator after source ledger and redaction envelope are stable.",
  },
];

export const velmereCriticalPageBlockers = velmereSitePageAudit.filter((page) => page.status === "blocked" || page.vercelRisk === "high");

export const velmereSitePageAuditSummary = {
  totalPages: velmereSitePageAudit.length,
  averageProgress: Math.round(velmereSitePageAudit.reduce((sum, page) => sum + page.progress, 0) / velmereSitePageAudit.length),
  blockedPages: velmereSitePageAudit.filter((page) => page.status === "blocked").length,
  highVercelRiskPages: velmereSitePageAudit.filter((page) => page.vercelRisk === "high").length,
};

// PASS149 market-integrity state: Advanced-only Orbit guard, stronger tile explainer, darker selected tile panel and logo-aware search suggestions are wired; real Vercel build/browser check still required.

// PASS150 market-integrity state: Advanced brain gained Performance/Cinematic runtime governor, sparse React orbit frames, compositor transitions and auto-downgrade from Cinematic to Performance under slow frames.

// PASS168 market-integrity state: minimal VLM brain HUD, static evidence board, slower Orbit 360, clickable cards, source/logos preserved and debug copy removed.

// PASS169 audit marker: HomePageClient locale runtime fix verified for /[locale]

// PASS176 audit marker: Intelligence Search route added with Search-to-Shield bridge and discovery capsules.

// PASS177 audit marker: Intelligence Search has token logos, live adapter skeleton and Shield query-state bridge.

// PASS178 audit marker: Intelligence Search has token metadata cache/provider readiness and diagnostic metadata route.

// PASS179 audit marker: Search route is now public Velmère Lens command router, not a browser clone.

// PASS180 audit marker: Contract Lens and OSINT Queue foundations added to Shield page and route audit.

// PASS182 audit marker: Security headers/API guards/icon proxy hardening/readiness route added.

// PASS183 audit marker: Durable rate-limit and API Abuse Shield added for public endpoint protection.

// PASS184 audit marker: Upstash REST rate-limit adapter and Security Event Ledger added.

// PASS185 audit marker: Admin Security Console, alert rules and safe export added with Vercel sweep guard.

// PASS186 audit marker: Security admin gate and event store contract added; sensitive security APIs are now token-gated.

// PASS187 audit marker: Durable event append adapter and admin security audit route added.

// PASS188 audit marker: Public Security Trust page/API and overclaim guard added.

// PASS189 audit marker: Security nav/footer integration, operations checklist API and Vercel/WAF/QA docs added.

// PASS190 audit marker: Runtime QA result capture and Security Release Gate Dashboard added; full master matrix restored.

// PASS191 audit marker: Payment/webhook security review, checkout/webhook guards and commerce release gate integration added.

// PASS192 audit marker: Payment runtime evidence capture and Stripe webhook replay QA ledger added.

// PASS193 audit marker: fixed SecurityTrustPage runtime import, widened VLM brain, split Evidence Board lanes, added Lens PDF-ready report preview route.

// PASS194 audit marker: Orbit 360 fullscreen, chart drag UX, Lens descriptive cards.

// PASS196 audit marker: Orbit 360 single-lane runtime hotfix, Home locale repair, mode-guide portal, chart drag direction and Shield glow containment.

// PASS198 audit marker: site audit now references Lens, Security Trust and Reports/Evidence so area reporting is not truncated.

// PASS199 audit marker: route audit uses explicit progress deltas for Shield, Lens and Reports/Evidence so percent movement is visible.

// PASS200 audit marker: VLM AI Brain appears explicitly in the master map as D01-D24 with progress deltas and real FPS/browser QA blockers.
// PASS201 audit marker: AI Brain tile detail portal, keyboard flow and pause-on-read are tracked without claiming FPS proof.
// PASS202 audit marker: AI Brain tile drawer localization/source-trust/publication-state improved without claiming live source proof or FPS proof.

// PASS203 audit marker: AI Brain evidence-chain rail/source badges/checklists improve source-gated drawer readability without claiming live proof or FPS proof.
// PASS204 audit marker: AI Brain FPS telemetry and WebGL gate improve performance truth without claiming 144fps or shipping a heavy renderer by default.

// PASS205 audit marker: AI Brain WebGL prototype is isolated behind NEXT_PUBLIC_VLM_BRAIN_RENDERER and does not replace DOM Orbit without real browser FPS evidence.

// PASS197 compatibility marker: Shield search suggestions use a body-level portal and must stay above Shield Investigator panels.

// PASS206 audit marker: AI Brain production UI hides FPS/zoom/WebGL watermark unless QA gates are explicitly enabled; WebGL trace remains internal browser QA.

// PASS207 audit marker: AI Brain tile drawer includes Decision Dock priority/confidence/source/review cards without adding a second modal.

// PASS208 audit marker: AI Brain tile drawer now includes report capsule export-safe lanes without claiming binary PDF readiness or durable source proof.

// PASS209 audit marker: AI Brain selected tile capsules now have typed schema/id/readiness/redaction envelope without claiming real PDF readiness.
// PASS210 audit marker: AI Brain capsule handoff bridge adds freshness/status/storage/blocker state before report preview; no binary PDF or durable proof is claimed.
// PASS211 audit marker: AI Brain selected tile drawer now exposes prioritized operator action queue without enabling customer export or binary PDF.

// PASS212 audit marker: selected VLM Brain tile now exposes an operator-only case timeline preview; real PDF/customer export still requires durable storage and source review.
// PASS213 audit marker: selected VLM Brain tile now exposes customer export firewall/source debt/PDF gate preview; real customer export still requires durable storage and source review.
// PASS214 audit marker: selected VLM Brain tile now exposes source coverage lanes, review SLA and second-source gate without enabling customer export.
// PASS215 audit marker: selected VLM Brain tile now exposes a release review packet across source, freshness, redaction, durable case, customer copy and PDF gates.

// PASS217 audit marker: Shield/VLM Brain tile drawer now surfaces live adapter freshness mesh, TTL/cache/hard-stop state and source-ledger preview gate before customer/PDF export.

// PASS218 audit marker: selected VLM Brain tile now classifies source lanes through allowlist/reviewer/evidence-use policy before customer copy.
// PASS219 audit marker: selected VLM Brain tile now maps source/case/redaction/export durable write targets before PDF/customer export.

// PASS220 marker: Shield page now tracks release-chain audit before customer/PDF export.
// PASS221 marker: Shield modal includes source ledger UI preview gating.
// PASS222 marker: Shield modal includes PDF-ready HTML preview manifest gating.
// PASS223 marker: Lens route is connected as operator-only handoff preview.
// PASS224 marker: Release QA scorecard keeps public export disabled until browser/durable/redaction QA.


// PASS225-PASS232 marker: AI Brain release readiness mega-branch active; blockers, browser QA, copy, PDF, persistence, live feeds, wallet and launch dashboard added.

// PASS243-PASS245 audit marker: Shield modal now exposes release triage, durable handoff and real-browser replay gates before customer PDF/export/wallet readiness.
// PASS246-PASS251 audit marker: Shield token modal exposes a real six-pass release readiness chain instead of counting checklist labels as production readiness.

// PASS252 audit marker: selected VLM Brain tile now has one release cockpit so fragmented gate panels cannot be mistaken for public export readiness.
