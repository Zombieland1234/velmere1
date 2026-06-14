export type VelmereRankableSearchItem = {
  id?: string;
  symbol?: string;
  name?: string;
  title?: string;
  aliases?: string[];
  keywords?: string[];
  rank?: number | null;
};

export type VelmereSearchMatchReason =
  | "exact_symbol"
  | "exact_id"
  | "exact_name"
  | "symbol_prefix"
  | "id_prefix"
  | "name_word_prefix"
  | "alias"
  | "name_prefix"
  | "keyword"
  | "symbol_contains"
  | "long_substring"
  | "no_match";

export type VelmereRankedSearchItem<T> = {
  item: T;
  score: number;
  reason: VelmereSearchMatchReason;
};

export function normalizeVelmereSearchText(value: string | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_./-]+/g, " ")
    .replace(/[^a-z0-9$ ]+/g, "")
    .replace(/\s+/g, " ");
}

function wordStartsWith(value: string, query: string) {
  return value.split(" ").some((word) => word.startsWith(query));
}

function exactOrPrefix(values: string[], query: string) {
  if (values.some((value) => value === query)) return "exact";
  if (values.some((value) => value.startsWith(query))) return "prefix";
  return null;
}

export function scoreVelmereSearchItem(
  item: VelmereRankableSearchItem,
  rawQuery: string,
): { score: number; reason: VelmereSearchMatchReason } {
  const query = normalizeVelmereSearchText(rawQuery);
  if (!query) return { score: 1, reason: "no_match" };

  const symbol = normalizeVelmereSearchText(item.symbol);
  const id = normalizeVelmereSearchText(item.id);
  const name = normalizeVelmereSearchText(item.name ?? item.title);
  const aliases = (item.aliases ?? []).map(normalizeVelmereSearchText).filter(Boolean);
  const keywords = (item.keywords ?? []).map(normalizeVelmereSearchText).filter(Boolean);

  if (symbol === query) return { score: 10_000, reason: "exact_symbol" };
  if (id === query) return { score: 9_500, reason: "exact_id" };
  if (name === query) return { score: 9_000, reason: "exact_name" };
  if (symbol.startsWith(query)) return { score: 8_400, reason: "symbol_prefix" };
  if (id.startsWith(query)) return { score: 7_600, reason: "id_prefix" };
  if (wordStartsWith(name, query)) return { score: 7_100, reason: "name_word_prefix" };

  const aliasMatch = exactOrPrefix(aliases, query);
  if (aliasMatch === "exact") return { score: 6_900, reason: "alias" };
  if (aliasMatch === "prefix") return { score: 6_300, reason: "alias" };
  if (name.startsWith(query)) return { score: 5_900, reason: "name_prefix" };

  const keywordMatch = exactOrPrefix(keywords, query);
  if (keywordMatch) return { score: 4_800, reason: "keyword" };
  if (symbol.includes(query)) return { score: 3_900, reason: "symbol_contains" };

  // Short ticker-like queries must not match the middle of unrelated names.
  // Example: ETH resolves Ethereum, not Tether.
  if (query.length >= 4) {
    const searchable = [id, name, ...aliases, ...keywords];
    if (searchable.some((value) => value.includes(query))) {
      return { score: 1_900, reason: "long_substring" };
    }
  }

  return { score: 0, reason: "no_match" };
}

export function rankVelmereSearchItems<T extends VelmereRankableSearchItem>(
  items: T[],
  query: string,
  options: { limit?: number; includeNoMatchWhenEmpty?: boolean } = {},
): VelmereRankedSearchItem<T>[] {
  const clean = normalizeVelmereSearchText(query);
  const ranked = items
    .map((item, index) => {
      const match = scoreVelmereSearchItem(item, clean);
      const providerRank = item.rank ?? 999_999;
      return { item, index, providerRank, ...match };
    })
    .filter((entry) => !clean || entry.score > 0 || options.includeNoMatchWhenEmpty)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.providerRank - b.providerRank ||
        a.index - b.index,
    );

  return ranked.slice(0, options.limit ?? ranked.length);
}

export function rankVelmereSearchValues<T extends VelmereRankableSearchItem>(
  items: T[],
  query: string,
  options?: { limit?: number; includeNoMatchWhenEmpty?: boolean },
) {
  return rankVelmereSearchItems(items, query, options).map((entry) => entry.item);
}
