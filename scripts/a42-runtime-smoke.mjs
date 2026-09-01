#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  A42_CRITICAL_RUNTIME_TARGETS,
  GLOBAL_JSON_PARSE_SIGNATURE,
  PASS35_A42_REVISION_ID,
  classifyExpectedStatus,
  contentTypeMatches,
} from "./lib/a42-dev-runtime-policy.mjs";

const root = process.cwd();
const baseUrl = String(process.env.VELMERE_SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/u, "");
const timeoutMs = Number(process.env.VELMERE_SMOKE_TIMEOUT_MS ?? 20_000);
const maximumBytes = 256 * 1024;
const outputPath = path.join(root, "artifacts/pass35/a42/PASS35_A42_RUNTIME_SMOKE.json");

function contentLooksLikeNextError(text) {
  const body = String(text ?? "");
  if (!body) return false;
  const normalized = body.toLowerCase();
  return body.includes(GLOBAL_JSON_PARSE_SIGNATURE)
    || normalized.includes("__next_error__")
    || /<title>\s*Internal Server Error\s*<\/title>/iu.test(body)
    || normalized.includes("application error: a server-side exception has occurred")
    || (normalized.includes("next-router-state-tree") && normalized.includes("internal server error"));
}

async function readBounded(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBytes) throw new Error(`smoke_response_too_large:${bytes}>${maximumBytes}`);
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

async function inspectTarget(target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("smoke_timeout")), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}${target.path}`, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        accept: target.contentTypes?.[0] ?? "*/*",
        "user-agent": "Velmere-A42-Runtime-Smoke/1.0",
      },
      signal: controller.signal,
    });
    const text = await readBounded(response);
    const contentType = response.headers.get("content-type") ?? "";
    const statusOk = classifyExpectedStatus(target, response.status);
    const typeOk = contentTypeMatches(target, contentType);
    const globalParseCrash = text.includes(GLOBAL_JSON_PARSE_SIGNATURE);
    const nextErrorBody = contentLooksLikeNextError(text);
    const genericServerError = response.status >= 500 && !target.expected.includes(response.status);
    let jsonOk = true;
    let jsonError = null;
    if (contentType.toLowerCase().includes("json") && text.trim()) {
      try {
        JSON.parse(text);
      } catch (error) {
        jsonOk = false;
        jsonError = error instanceof Error ? error.message : String(error);
      }
    }
    return {
      id: target.id,
      path: target.path,
      finalUrl: response.url,
      status: response.status,
      expectedStatuses: target.expected,
      contentType,
      durationMs: Date.now() - startedAt,
      bytes: Buffer.byteLength(text, "utf8"),
      statusOk,
      contentTypeOk: typeOk,
      jsonOk,
      jsonError,
      globalParseCrash,
      nextErrorBody,
      genericServerError,
      ok: statusOk && typeOk && jsonOk && !globalParseCrash && !nextErrorBody && !genericServerError,
    };
  } catch (error) {
    return {
      id: target.id,
      path: target.path,
      durationMs: Date.now() - startedAt,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

const rows = [];
for (const target of A42_CRITICAL_RUNTIME_TARGETS) {
  const row = await inspectTarget(target);
  rows.push(row);
  process.stdout.write(`[a42-smoke] ${row.ok ? "PASS" : "FAIL"} ${target.path}${"status" in row ? ` -> ${row.status}` : ""}\n`);
}

const failures = rows.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass35.a42.runtime-smoke.v1",
  revisionId: PASS35_A42_REVISION_ID,
  generatedAt: new Date().toISOString(),
  baseUrl,
  truthBoundary: "This smoke verifies local HTTP status, content type, bounded UTF-8/JSON parsing and absence of the observed shared Next JSON.parse error signature. It does not prove visual parity, customer value, provider rights, staging, LIVE operation or sale readiness.",
  summary: { checks: rows.length, passed: rows.length - failures.length, failed: failures.length },
  rows,
  failures,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(result.summary)}\n`);
if (failures.length > 0) process.exit(1);
