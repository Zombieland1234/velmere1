import fs from "node:fs";
import path from "node:path";
const ROOT=process.cwd();
const terms=["cftc","world-bank","world_bank","wdi","sec-edgar","sec_edgar","edgar"];
const exts=new Set([".ts",".tsx",".mts",".mjs",".js",".json"]);
const skip=new Set(["node_modules",".next","artifacts","receipts","fixtures"]);
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory())walk(f,out);else if(exts.has(path.extname(e.name)))out.push(f);}return out;}
const failures=[];let checked=0;
for(const f of walk(ROOT)){
 const rel=path.relative(ROOT,f).split(path.sep).join("/").toLowerCase();
 if(!terms.some((x)=>rel.includes(x))) continue;
 const t=fs.readFileSync(f,"utf8"); checked++;
 const rules=[
  [/\bliveClaimed\s*:\s*true\b/g,"reference_lane_live_claim"],
  [/\bisExecutable\s*:\s*true\b/g,"reference_lane_executable_claim"],
  [/\bexecutableClaimed\s*:\s*true\b/g,"reference_lane_executable_claim"],
  [/(?:semanticClass|marketDataClass)\s*:\s*["'](?:live|current_quote|executable_quote)["']/gi,"reference_lane_wrong_semantic_class"],
 ];
 for(const [re,rule] of rules){re.lastIndex=0;if(re.test(t))failures.push({file:rel,rule});}
}
const result={schemaVersion:"velmere.zero-euro-reference-lane-semantics.v1",checkedFiles:checked,failures,ok:failures.length===0};
process.stdout.write(JSON.stringify(result,null,2)+"\n"); if(!result.ok)process.exit(1);
