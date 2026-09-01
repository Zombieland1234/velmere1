import fs from 'node:fs';
import crypto from 'node:crypto';
import { buildA83Entry } from '../../../lib/worldclass/pass36-a83-browser-lens-pdf-real-packet-runtime.ts';
const policy=JSON.parse(fs.readFileSync('config/pass36/a83-browser-lens-pdf-real-packet-policy.json','utf8'));
const catalog=JSON.parse(fs.readFileSync(policy.fixtureCatalog.path,'utf8'));
const row=(catalog.cases??catalog.rows??catalog).find?.((x)=>x.symbol==='BTC');
if(!row) throw new Error('p61_btc_fixture_missing');
const locales=['pl','en','de']; const tiers=['basic','pro','advanced']; const rows=[]; let seq=1;
for(const locale of locales) for(const tier of tiers){
  const built=buildA83Entry(row,locale,tier,policy,seq++); const pdf=Buffer.from(built.pdf);
  rows.push({locale,tier,byteLength:pdf.length,sha256:crypto.createHash('sha256').update(pdf).digest('hex'),pageCount:built.entry.pageCount});
}
const aggregate=crypto.createHash('sha256'); for(const r of rows) aggregate.update(`${r.locale}\0${r.tier}\0${r.byteLength}\0${r.sha256}\n`);
console.log(JSON.stringify({count:rows.length,aggregateSha256:aggregate.digest('hex'),rows},null,2));
