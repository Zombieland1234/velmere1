import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT=process.cwd();
const roots=["artifacts","receipts","evaluation","docs"].map((x)=>path.join(ROOT,x)).filter(fs.existsSync);
const MAX=64*1024*1024;
const files=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith(".json")&&fs.statSync(p).size<=MAX)files.push(p);}}
for(const r of roots)walk(r);
const hits=[];
function inspect(value,state={keys:new Set(),numbers:new Set(),arrays:[]},depth=0){
 if(depth>30||value==null)return state;
 if(Array.isArray(value)){state.arrays.push(value.length);for(const v of value.slice(0,5000))inspect(v,state,depth+1);return state;}
 if(typeof value==="object"){for(const [k,v] of Object.entries(value)){state.keys.add(k);if(typeof v==="number")state.numbers.add(v);inspect(v,state,depth+1);}return state;}
 if(typeof value==="number")state.numbers.add(value);return state;
}
for(const f of files){
 let data;try{data=JSON.parse(fs.readFileSync(f,"utf8"));}catch{continue;}
 const s=inspect(data);const blob=JSON.stringify(data);
 const relevant=[2400,900,100,24,50,6,120].some((n)=>s.numbers.has(n)||s.arrays.includes(n))||/(customer|persona|reviewer|auditor|campaign|journey|angel)/i.test(blob.slice(0,20000));
 if(!relevant)continue;
 hits.push({file:path.relative(ROOT,f).split(path.sep).join("/"),bytes:fs.statSync(f).size,sha256:crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"),numbers:[...s.numbers].filter((n)=>[2400,900,100,24,50,6,120].includes(n)),arrayLengths:[...new Set(s.arrays.filter((n)=>[2400,900,100,24,50,6,120].includes(n)))],keys:[...s.keys].filter((k)=>/(customer|persona|reviewer|auditor|campaign|journey|angel|tier|language|locale|case)/i.test(k)).slice(0,80)});
}
const has2400=hits.some((h)=>h.numbers.includes(2400)||h.arrayLengths.includes(2400));
const has900=hits.some((h)=>h.numbers.includes(900)||h.arrayLengths.includes(900));
const result={schemaVersion:"velmere.v4.ai-campaign-evidence-inventory.v1",scannedJsonFiles:files.length,relevantFiles:hits.length,has2400EvidenceMarker:has2400,has900EvidenceMarker:has900,classification:has2400&&has900?"EVIDENCE_MARKERS_PRESENT_REQUIRES_SCHEMA_SPECIFIC_ADJUDICATION":"WITHHELD_EVIDENCE_MARKERS_MISSING",hits};
process.stdout.write(JSON.stringify(result,null,2)+"\n");
if(!(has2400&&has900))process.exit(2);
