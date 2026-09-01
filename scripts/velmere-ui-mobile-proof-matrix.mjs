#!/usr/bin/env node
import fs from 'node:fs';

const routes = [
  { id: 'home_locale_en', path: '/en', priority: 'P0', viewport: ['desktop','mobile'] },
  { id: 'home_locale_pl', path: '/pl', priority: 'P0', viewport: ['desktop','mobile'] },
  { id: 'home_locale_de', path: '/de', priority: 'P0', viewport: ['desktop','mobile'] },
  { id: 'shield_terminal', path: '/en/shield', priority: 'P0', viewport: ['desktop','mobile'] },
  { id: 'real_markets', path: '/en/real-markets', priority: 'P0', viewport: ['desktop','mobile'] },
  { id: 'lens_browser_pdf', path: '/en/browser', priority: 'P0', viewport: ['desktop','mobile'] },
  { id: 'cart_checkout', path: '/en/cart', priority: 'P0', viewport: ['desktop','mobile'] },
  { id: 'account_member', path: '/en/account', priority: 'P1', viewport: ['desktop','mobile'] },
  { id: 'security_audit', path: '/en/security', priority: 'P1', viewport: ['desktop','mobile'] },
  { id: 'research_lab', path: '/en/research-lab', priority: 'P1', viewport: ['desktop','mobile'] },
];

const interactions = [
  'global_overlay_close_escape_and_outside_click',
  'wallet_modal_metamask_phantom_other_wallets',
  'cart_drawer_open_close_no_scroll_jump',
  'language_menu_open_close_locale_navigation',
  'shield_table_sort_tri_state_headers',
  'shield_asset_modal_chart_timeframe_tabs',
  'shield_chart_wheel_zoom_no_page_scroll',
  'shield_basic_pro_advanced_brain_contained_modal',
  'real_markets_asset_modal_parity_with_shield',
  'real_markets_basic_pro_advanced_opens_brain',
  'lens_search_three_pinned_suggestions',
  'lens_pdf_preview_download_one_payload',
  'vlm_brain_continuous_motion_reduced_motion_safe',
  'mobile_header_no_overlap',
  'mobile_modal_z_index_above_header',
  'focus_visible_keyboard_paths',
  'no_openai_tooltip_leak',
  'no_background_scroll_when_modal_open',
  'price_volume_market_cap_headers_aligned',
  'admin_owner_gate_not_publicly_exposed',
];

function existsAny(candidates) {
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

const staticAnchors = {
  overlayCss: existsAny(['app/globals.css', 'styles/globals.css']),
  marketIntegrityClient: existsAny(['components/market-integrity/MarketIntegrityClient.tsx']),
  realMarketsPanel: existsAny(['components/market-integrity/CrossAssetCollapseRadarPanel.tsx']),
  lensRoute: existsAny(['app/api/search/lens-report/route.ts']),
  vlmExperience: existsAny(['components/vlm/VlmNeuralAuditExperience.tsx', 'components/VlmNeuralAuditExperience.tsx']),
  e2eDir: existsAny(['tests/e2e']),
};

const matrix = routes.flatMap((route) => route.viewport.map((viewport) => ({
  routeId: route.id,
  path: route.path,
  viewport,
  priority: route.priority,
  requiredEvidence: [
    'screenshot_before_after',
    'keyboard_navigation_trace',
    'console_errors_zero_or_explained',
    'scroll_lock_verified',
    'modal_z_index_verified',
  ],
  status: 'READY_FOR_HOSTED_PLAYWRIGHT_RECEIPT',
})));

const report = {
  pass: 'PASS2156',
  name: 'UI/mobile production proof matrix',
  status: 'STATIC_MATRIX_READY_HOSTED_RUNTIME_REQUIRED',
  matrixCount: matrix.length,
  routeCount: routes.length,
  interactionCount: interactions.length,
  routes,
  interactions,
  staticAnchors,
  blockers: [
    'Needs PLAYWRIGHT_BASE_URL or live Vercel deployment URL',
    'Needs chromium install in CI or local machine',
    'Needs screenshot/video artifacts attached as runtime receipts',
  ],
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2156_UI_MOBILE_PROOF_MATRIX.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, matrixCount: report.matrixCount, interactionCount: report.interactionCount }, null, 2));
