const FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);

export class StrictJsonCliError extends Error {
  constructor(code, detail = null) {
    super(detail === null ? code : `${code}:${String(detail)}`);
    this.name = "StrictJsonCliError";
    this.code = code;
    this.detail = detail;
  }
}

function skip(state) {
  while (state.i < state.raw.length && /\s/u.test(state.raw[state.i] ?? "")) state.i += 1;
}
function stringToken(state) {
  const start = state.i;
  if (state.raw[state.i] !== '"') throw new StrictJsonCliError("strict_json_invalid");
  state.i += 1;
  let closed = false;
  while (state.i < state.raw.length) {
    const ch = state.raw[state.i];
    if (ch === "\\") {
      state.i += 2;
      continue;
    }
    state.i += 1;
    if (ch === '"') { closed = true; break; }
  }
  if (!closed) throw new StrictJsonCliError("strict_json_invalid");
  try { return JSON.parse(state.raw.slice(start, state.i)); }
  catch { throw new StrictJsonCliError("strict_json_invalid"); }
}
function primitive(state) {
  const start = state.i;
  while (state.i < state.raw.length && !/[\s,}\]]/u.test(state.raw[state.i] ?? "")) state.i += 1;
  if (state.i === start) throw new StrictJsonCliError("strict_json_invalid");
}
function node(state) {
  state.nodes += 1;
  if (state.nodes > state.maxNodes) throw new StrictJsonCliError("strict_json_node_limit_exceeded", state.maxNodes);
}
function value(state, depth) {
  if (depth > state.maxDepth) throw new StrictJsonCliError("strict_json_depth_exceeded", state.maxDepth);
  node(state); skip(state);
  const ch = state.raw[state.i];
  if (ch === "{") return object(state, depth);
  if (ch === "[") return array(state, depth);
  if (ch === '"') return void stringToken(state);
  primitive(state);
}
function object(state, depth) {
  state.i += 1; skip(state);
  const keys = new Set();
  if (state.raw[state.i] === "}") { state.i += 1; return; }
  while (state.i < state.raw.length) {
    skip(state);
    const key = stringToken(state);
    if (keys.has(key)) throw new StrictJsonCliError("strict_json_duplicate_key", key.slice(0, 128));
    if (FORBIDDEN.has(key)) throw new StrictJsonCliError("strict_json_forbidden_key", key);
    keys.add(key); skip(state);
    if (state.raw[state.i] !== ":") throw new StrictJsonCliError("strict_json_invalid");
    state.i += 1; value(state, depth + 1); skip(state);
    if (state.raw[state.i] === ",") { state.i += 1; continue; }
    if (state.raw[state.i] === "}") { state.i += 1; return; }
    throw new StrictJsonCliError("strict_json_invalid");
  }
  throw new StrictJsonCliError("strict_json_invalid");
}
function array(state, depth) {
  state.i += 1; skip(state);
  if (state.raw[state.i] === "]") { state.i += 1; return; }
  while (state.i < state.raw.length) {
    value(state, depth + 1); skip(state);
    if (state.raw[state.i] === ",") { state.i += 1; continue; }
    if (state.raw[state.i] === "]") { state.i += 1; return; }
    throw new StrictJsonCliError("strict_json_invalid");
  }
  throw new StrictJsonCliError("strict_json_invalid");
}

export function parseStrictJsonCli(raw, { maxBytes = 2 * 1024 * 1024, maxDepth = 32, maxNodes = 50000, requireObject = false } = {}) {
  if (typeof raw !== "string") throw new StrictJsonCliError("strict_json_input_type_invalid");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 16 * 1024 * 1024) throw new StrictJsonCliError("strict_json_max_bytes_invalid");
  if (Buffer.byteLength(raw, "utf8") > maxBytes) throw new StrictJsonCliError("strict_json_too_large", maxBytes);
  const state = { raw, i: 0, nodes: 0, maxDepth, maxNodes };
  skip(state); value(state, 0); skip(state);
  if (state.i !== raw.length) throw new StrictJsonCliError("strict_json_invalid");
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new StrictJsonCliError("strict_json_invalid"); }
  if (requireObject && (!parsed || typeof parsed !== "object" || Array.isArray(parsed))) throw new StrictJsonCliError("strict_json_object_required");
  return parsed;
}
