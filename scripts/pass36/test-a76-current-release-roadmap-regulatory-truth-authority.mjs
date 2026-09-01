#!/usr/bin/env node
import { spawnSync } from "node:child_process";
const r=spawnSync(process.execPath,["scripts/pass36/verify-a76-current-release-roadmap-regulatory-truth-authority.mjs"],{encoding:"utf8"});
process.stdout.write(r.stdout??"");process.stderr.write(r.stderr??"");
if(r.status!==0)process.exit(r.status??1);
