function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function mergeMessages(base, overrides) {
  if (overrides === undefined) return base;
  if (Array.isArray(overrides)) return overrides.map((value) => value);
  if (!isRecord(overrides)) return overrides;
  const source = isRecord(base) ? base : {};
  const merged = { ...source };
  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = mergeMessages(source[key], value);
  }
  return merged;
}
