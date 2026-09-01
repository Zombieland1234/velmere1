#!/usr/bin/env node
import fs from 'node:fs';
const risks=[
  {id:'RUNTIME-001',area:'build',risk:'clean npm ci/typecheck/build not proven in Node 24/npm 11 runtime',severity:'P0',mitigation:'owner runtime proof receipts required'},
  {id:'PAY-001',area:'Stripe',risk:'webhook signature/replay not proven with live/test secret',severity:'P0',mitigation:'stripe replay receipt required'},
  {id:'DB-001',area:'Supabase',risk:'migration/durable tables not proven on remote DB',severity:'P0',mitigation:'migration apply + select receipt required'},
  {id:'FUL-001',area:'provider',risk:'Printful/Tapstitch sandbox/live fulfilment not proven',severity:'P0',mitigation:'provider sandbox/live receipt required'},
  {id:'LEGAL-001',area:'DE/EU',risk:'owner/legal sign-off for Impressum/Datenschutz/AGB/Widerruf pending',severity:'P0',mitigation:'signed legal receipt required'},
  {id:'VIS-001',area:'UI',risk:'mobile overlay/header/chart defects may remain without screenshot receipts',severity:'P1',mitigation:'visual receipt matrix'},
  {id:'PERF-001',area:'performance',risk:'Lighthouse/Web Vitals not proven on hosted deployment',severity:'P1',mitigation:'hosted Lighthouse receipt'},
  {id:'DATA-001',area:'live data',risk:'freshness/source age must not overstate live confidence',severity:'P1',mitigation:'source freshness guard + live receipts'},
  {id:'OPS-001',area:'monitoring',risk:'incident response not proven in production',severity:'P1',mitigation:'SLO incident runbook + smoke drill'}
];
const p0=risks.filter(r=>r.severity==='P0').length; const p1=risks.filter(r=>r.severity==='P1').length;
const result={pass:'PASS2169',name:'Final launch risk register',status:p0?'P0_RUNTIME_RISKS_REMAIN':'PASS',risks,p0,p1,generatedAt:new Date().toISOString()};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/PASS2169_LAUNCH_RISK_REGISTER.json', JSON.stringify(result,null,2));
fs.writeFileSync('docs/risk/PASS2169_LAUNCH_RISK_REGISTER.md', `# PASS2169 Launch risk register\n\nStatus: ${result.status}\n\nP0 risks: ${p0}\n\nP1 risks: ${p1}\n\n${risks.map(r=>`## ${r.id} — ${r.area}\n\nSeverity: ${r.severity}\n\nRisk: ${r.risk}\n\nMitigation: ${r.mitigation}\n`).join('\n')}\n`);
console.log(JSON.stringify(result,null,2));
