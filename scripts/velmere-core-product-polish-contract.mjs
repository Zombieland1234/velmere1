#!/usr/bin/env node
import fs from 'node:fs';

const contract = {
  pass: 'PASS2162',
  name: 'Shield / Real Markets / Lens / VLM Brain premium polish contract',
  status: 'PASS_STATIC_CONTRACT_RUNTIME_VISUAL_REQUIRED',
  modules: [
    {
      id: 'shield',
      mustHold: [
        'header sorting is click + keyboard tri-state: desc -> asc -> neutral',
        'asset modal is above header, centered, scroll locked, closeable by x/outside/Escape',
        'chart wheel/drag never scrolls parent page while pointer is over chart',
        'Basic/Pro/Advanced open contained VLM Brain, not broken fullscreen overflow',
        'mobile modal uses safe height and explicit close target'
      ],
      receiptsRequired: ['desktop_screenshot', 'mobile_screenshot', 'playwright_interaction_trace']
    },
    {
      id: 'real_markets',
      mustHold: [
        'same asset modal architecture as Shield',
        'no crypto duplication if crypto lives in Shield',
        'stocks/fx/commodities/indices have clear icons and category badges',
        'Basic/Pro/Advanced invoke same analysis route/brain contract'
      ],
      receiptsRequired: ['desktop_screenshot', 'mobile_screenshot', 'tier_button_trace']
    },
    {
      id: 'lens_pdf',
      mustHold: [
        'preview/download use the exact same payload id and locale',
        'A4 preview is readable, centered, above header, with background scroll lock',
        'download affordance is visible and not hidden behind header/mobile chrome',
        'missing data is labelled honestly instead of guessed'
      ],
      receiptsRequired: ['pdf_payload_receipt', 'pdf_visual_receipt']
    },
    {
      id: 'vlm_brain',
      mustHold: [
        'continuous premium motion during analysis, with reduced-motion fallback',
        'Basic/Pro/Advanced differ by depth, not by fake hype copy',
        'evidence/source/confidence/missing-data are visible in the readout',
        'WebGL fallback does not crash the page'
      ],
      receiptsRequired: ['webgl_trace', 'reduced_motion_trace', 'tier_depth_receipt']
    }
  ],
  blockerPolicy: 'Any failed runtime visual receipt blocks >95% and blocks 100%.',
  generatedAt: new Date().toISOString()
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2162_CORE_PRODUCT_POLISH_CONTRACT.json', JSON.stringify(contract, null, 2));
console.log(JSON.stringify(contract, null, 2));
