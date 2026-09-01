#!/usr/bin/env node
import fs from "node:fs"; import path from "node:path"; import { buildR44P34DynamicScorecard } from "../../lib/product/vlm-dynamic-product-scoring.mjs";
const result=buildR44P34DynamicScorecard(); const i=process.argv.indexOf("--output"); if(i>=0){const out=process.argv[i+1];if(!out)throw new Error("output_path_required");fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),JSON.stringify(result,null,2)+"\n");} console.log(JSON.stringify(result,null,2));
