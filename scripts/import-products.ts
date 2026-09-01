import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { importProductsFromProductCsv } from "../lib/importers/csv-importer";
import { importProductFromUrl } from "../lib/importers/url-importer";
import { applyVlmProductBrainToDrafts } from "../lib/products/vlm-product-brain";
import type { Product } from "../lib/products/types";

async function main() {
  const [, , mode, inputPath] = process.argv;
  if (!mode || !inputPath || !["csv", "links"].includes(mode)) {
    throw new Error("Usage: npm run import:products -- csv ./products.csv OR npm run import:products -- links ./links.txt");
  }

  const input = await readFile(resolve(inputPath), "utf8");
  const rawDrafts =
    mode === "csv"
      ? importProductsFromProductCsv(input)
      : await Promise.all(
          input
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((url) => importProductFromUrl(url)),
        );

  const drafts = applyVlmProductBrainToDrafts(rawDrafts);

  const products: Product[] = drafts.map((draft) => ({
    ...draft.product,
    status: "coming_soon",
    fulfilmentMode: draft.product.fulfilmentMode === "automatic" ? "disabled" : draft.product.fulfilmentMode,
  }));

  const output = `import type { Product } from "./types";

export const PRODUCTS: Product[] = ${JSON.stringify(products, null, 2)};
`;

  await writeFile(resolve("lib/products/catalog.generated.ts"), output, "utf8");
  const blocked = drafts.filter((draft) => draft.brain?.readiness.level === "blocked").length;
  const averageScore = drafts.length
    ? Math.round(drafts.reduce((sum, draft) => sum + (draft.brain?.readiness.score ?? 0), 0) / drafts.length)
    : 0;
  console.log(`Generated ${products.length} product draft(s) in lib/products/catalog.generated.ts`);
  console.log(`VLM Product Brain v2: average readiness ${averageScore}/100, blocked ${blocked}/${drafts.length}.`);
  console.log("Review every draft before committing. Active sales still require checkout, legal, shipping, and fulfilment readiness.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
