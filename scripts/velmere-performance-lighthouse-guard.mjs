#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const policy=JSON.parse(fs.readFileSync('config/velmere-pass2166-2170-final-five.policy.json','utf8'));
const budgets=policy.performanceBudgets;
const imageExt=new Set(['.png','.jpg','.jpeg','.webp','.gif','.svg']);
function walk(dir){const out=[]; if(!fs.existsSync(dir)) return out; for(const e of fs.readdirSync(dir,{withFileTypes:true})){ if(['node_modules','.next','.git'].includes(e.name)) continue; const p=path.join(dir,e.name); if(e.isDirectory()) out.push(...walk(p)); else out.push(p);} return out;}
const files=walk('public').concat(walk('app')).concat(walk('components'));
const largeImages=[];
for(const f of files){ const ext=path.extname(f).toLowerCase(); if(!imageExt.has(ext)) continue; const sizeKb=Math.round(fs.statSync(f).size/1024); if(sizeKb>budgets.imageOverKbReview) largeImages.push({file:f,sizeKb,budgetKb:budgets.imageOverKbReview}); }
const dynamicImports=[];
for(const f of files.filter(x=>/\.(tsx|ts|js|jsx)$/.test(x))){ let t; try{t=fs.readFileSync(f,'utf8')}catch{continue}; if(/dynamic\s*\(/.test(t)||/next\/dynamic/.test(t)) dynamicImports.push(f); }
const result={pass:'PASS2168',name:'Performance and Lighthouse guard',status:largeImages.length?'PASS_WITH_IMAGE_REVIEW':'PASS_STATIC_LIGHTHOUSE_RUNTIME_REQUIRED',budgets,largeImages,dynamicImportFiles:[...new Set(dynamicImports)].slice(0,100),runtimeStillRequired:['Lighthouse mobile','Lighthouse desktop','Web Vitals INP/LCP/CLS from hosted URL'],generatedAt:new Date().toISOString()};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/PASS2168_PERFORMANCE_LIGHTHOUSE_GUARD.json', JSON.stringify(result,null,2));
fs.writeFileSync('docs/performance/PASS2168_LIGHTHOUSE_GUARD.md', `# PASS2168 Performance / Lighthouse guard\n\nStatus: ${result.status}\n\nBudgets:\n\n${Object.entries(budgets).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n\nLarge images for review: ${largeImages.length}\n\nRuntime still required: Lighthouse mobile/desktop against hosted deployment.\n`);
console.log(JSON.stringify(result,null,2));
