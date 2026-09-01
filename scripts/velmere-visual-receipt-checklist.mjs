#!/usr/bin/env node
import fs from 'node:fs';
const viewports=['desktop-1440','mobile-390','tablet-768'];
const routes=['/','/en','/pl','/de','/en/shield','/en/real-markets','/en/browser','/en/security','/en/research-lab','/en/account'];
const interactions=['open-menu','open-cart','open-wallet','language-switcher','shield-row-modal','shield-chart-wheel','shield-sort-cycle','real-markets-row-modal','real-markets-basic-pro-advanced','lens-search','lens-pdf-preview','lens-pdf-download','vlm-brain-basic','vlm-brain-pro','vlm-brain-advanced','square-post-modal','outside-click-close','escape-close','mobile-header','scroll-lock'];
const templates=[];
for(const route of routes){
  for(const viewport of viewports){
    templates.push({route,viewport,expected:['no header overlap','no background scroll in modal','primary CTA visible','no horizontal overflow','focus visible']});
  }
}
const result={pass:'PASS2167',name:'UI visual receipt checklist',status:'STATIC_READY_HOSTED_REQUIRED',routes:routes.length,viewports,interactions:interactions.length,templates,generatedAt:new Date().toISOString()};
fs.mkdirSync('reports',{recursive:true});
fs.mkdirSync('visual-receipts/templates',{recursive:true});
fs.writeFileSync('reports/PASS2167_VISUAL_RECEIPT_CHECKLIST.json', JSON.stringify(result,null,2));
fs.writeFileSync('visual-receipts/templates/PASS2167_VISUAL_RECEIPT_TEMPLATE.json', JSON.stringify({receiptType:'visual-ui-proof',required:{route:'',viewport:'',screenshotBefore:'',screenshotAfter:'',status:'PASS|FAIL',notes:'',capturedAt:''},interactions},null,2));
fs.writeFileSync('docs/visual/PASS2167_VISUAL_RECEIPT_CHECKLIST.md', `# PASS2167 Visual receipt checklist\n\nStatus: ${result.status}\n\nRoutes: ${routes.length}\n\nViewports: ${viewports.join(', ')}\n\nInteractions: ${interactions.length}\n\n## Required interactions\n\n${interactions.map(x=>`- ${x}`).join('\n')}\n`);
console.log(JSON.stringify(result,null,2));
