#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { acquireReleaseTransactionLock, inspectReleaseTransactionLock, releaseReleaseTransactionLock } from "../../lib/build/release-transaction-lock.mjs";
import { inspectManagedNextEnv, restoreManagedNextEnv, stageManagedNextEnv } from "../../lib/build/next-env-build-contract.mjs";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r44p24-release-boundary-"));
const root = path.join(temp, "source");
const locks = path.join(temp, "locks");
fs.mkdirSync(root,{mode:0o700}); fs.mkdirSync(locks,{mode:0o700});
const canonical = '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\nimport "./.next-pass25-webpack/types/routes.d.ts";\n\n// NOTE: This file should not be edited\n// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.\n';
fs.writeFileSync(path.join(root,"next-env.d.ts"),canonical);
const digest = crypto.createHash("sha256").update("test-source").digest("hex");
let assertions=0; const check=(value,message)=>{assert.ok(value,message);assertions+=1;};
try {
  const first=acquireReleaseTransactionLock({root,sourceSha256:digest,externalRoot:locks});
  check(first.acquired,"first lock acquired");
  check(inspectReleaseTransactionLock(first).ok,"exact owner active");
  const second=acquireReleaseTransactionLock({root,sourceSha256:digest,externalRoot:locks});
  check(second.acquired===false && second.status==="BLOCKED_EXISTING_LOCK","second writer blocked");
  const staged=stageManagedNextEnv(root,".next-pass25-turbopack");
  check(inspectManagedNextEnv(staged).exactExpectedContent,"managed turbopack bytes exact");
  fs.appendFileSync(staged.filePath,"unexpected\n");
  check(!inspectManagedNextEnv(staged).exactExpectedContent,"unexpected mutation detected");
  check(restoreManagedNextEnv(staged).restored,"canonical bytes restored");
  check(fs.readFileSync(staged.filePath,"utf8")===canonical,"canonical byte equality");
  check(releaseReleaseTransactionLock(first).released,"lock released");
  const third=acquireReleaseTransactionLock({root,sourceSha256:digest,externalRoot:locks});
  check(third.acquired,"lock reacquired after release");
  check(releaseReleaseTransactionLock(third).released,"reacquired lock released");
  console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p24.single-writer-next-env-test.v1",status:"PASS",assertions},null,2));
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
