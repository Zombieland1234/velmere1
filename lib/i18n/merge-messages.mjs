function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneMessages(value) {
  if (Array.isArray(value)) return value.map((child) => cloneMessages(child));
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneMessages(child)]));
  return value;
}

function parseMessagePath(key) {
  if (typeof key !== "string" || key.length === 0) throw new Error("translation_key_required");
  const tokens = [];
  let cursor = 0;
  while (cursor < key.length) {
    if (key[cursor] === ".") {
      cursor += 1;
      if (cursor >= key.length || key[cursor] === ".") throw new Error(`translation_key_invalid:${key}`);
      continue;
    }
    if (key[cursor] === "[") {
      const close = key.indexOf("]", cursor + 1);
      if (close < 0) throw new Error(`translation_key_invalid:${key}`);
      const rawIndex = key.slice(cursor + 1, close);
      if (!/^\d+$/u.test(rawIndex)) throw new Error(`translation_key_invalid:${key}`);
      tokens.push(Number(rawIndex));
      cursor = close + 1;
      continue;
    }
    let end = cursor;
    while (end < key.length && key[end] !== "." && key[end] !== "[") end += 1;
    const segment = key.slice(cursor, end);
    if (!segment || segment === "__proto__" || segment === "prototype" || segment === "constructor") {
      throw new Error(`translation_key_unsafe:${key}`);
    }
    tokens.push(segment);
    cursor = end;
  }
  if (tokens.length === 0) throw new Error(`translation_key_invalid:${key}`);
  return tokens;
}

function assertExisting(container, token, key) {
  if (Array.isArray(container)) {
    if (!Number.isInteger(token) || token < 0 || token >= container.length) throw new Error(`translation_path_missing:${key}`);
    return;
  }
  if (!isRecord(container) || typeof token !== "string" || !Object.prototype.hasOwnProperty.call(container, token)) {
    throw new Error(`translation_path_missing:${key}`);
  }
}

function locateExisting(root, key) {
  const tokens = parseMessagePath(key);
  let container = root;
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const token = tokens[index];
    assertExisting(container, token, key);
    container = container[token];
  }
  const finalToken = tokens[tokens.length - 1];
  assertExisting(container, finalToken, key);
  return { container, finalToken };
}

function normalizedText(value) {
  return typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : "";
}

export function mergeMessages(base, overrides) {
  if (overrides === undefined) return base;
  if (Array.isArray(overrides)) return overrides.map((value) => cloneMessages(value));
  if (!isRecord(overrides)) return overrides;
  const source = isRecord(base) ? base : {};
  const merged = { ...source };
  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = mergeMessages(source[key], value);
  }
  return merged;
}

export function applyTranslationWave(base, translations, locale) {
  if (locale !== "pl" && locale !== "de") throw new Error(`translation_locale_unsupported:${locale}`);
  if (!Array.isArray(translations)) throw new Error("translation_wave_array_required");
  const output = cloneMessages(base);
  const seen = new Set();
  for (const row of translations) {
    const key = row?.key;
    if (typeof key !== "string" || key.length === 0) throw new Error("translation_key_required");
    if (seen.has(key)) throw new Error(`translation_key_duplicate:${key}`);
    seen.add(key);
    const translated = row?.[locale];
    if (typeof translated !== "string") throw new Error(`translation_value_missing:${locale}:${key}`);
    const { container, finalToken } = locateExisting(output, key);
    container[finalToken] = translated;
  }
  return output;
}

export function applyTranslationKeyValueMap(base, config, locale) {
  if (locale !== "pl" && locale !== "de") throw new Error(`translation_locale_unsupported:${locale}`);
  const keys = config?.keys;
  const valueMap = config?.valueMap;
  if (!Array.isArray(keys)) throw new Error("translation_key_map_keys_required");
  if (!isRecord(valueMap)) throw new Error("translation_key_map_values_required");
  if (Number.isInteger(config?.expectedKeyCount) && keys.length !== config.expectedKeyCount) throw new Error("translation_key_map_denominator_mismatch");
  const output = cloneMessages(base);
  const seen = new Set();
  const usedSources = new Set();
  for (const key of keys) {
    if (typeof key !== "string" || key.length === 0) throw new Error("translation_key_required");
    if (seen.has(key)) throw new Error(`translation_key_duplicate:${key}`);
    seen.add(key);
    const { container, finalToken } = locateExisting(output, key);
    const source = normalizedText(container[finalToken]);
    if (!source) throw new Error(`translation_source_value_missing:${key}`);
    const row = valueMap[source];
    if (!isRecord(row) || typeof row[locale] !== "string") throw new Error(`translation_source_unmapped:${key}:${source}`);
    usedSources.add(source);
    container[finalToken] = row[locale];
  }
  if (Number.isInteger(config?.expectedSourceValueCount) && usedSources.size !== config.expectedSourceValueCount) throw new Error("translation_source_denominator_mismatch");
  return output;
}
