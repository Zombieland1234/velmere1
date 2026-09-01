import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPdf } from "@/lib/search/lens-pdf-renderer";
import { buildLensReport } from "@/lib/search/lens-report";
import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";

type PdfDepth = "basic" | "pro" | "advanced";
type PdfTier = "Basic" | "Pro" | "Advanced";
type Locale = "pl" | "en" | "de";

type AssetFixture = {
  id: string;
  symbol: string;
  name: string;
  scenario: string;
};

type AssetCatalog = {
  schemaVersion: "velmere.pass35.local-pdf-asset-catalog.v1";
  generatedAt: string;
  seed: string;
  mode: "synthetic_offline_renderer_qa";
  assetCount: 50;
  boundaries: {
    synthetic: true;
    offline: true;
    notLive: true;
    notForSale: true;
    commercialUseAllowed: false;
    investmentRecommendation: false;
  };
  assets: AssetFixture[];
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const catalogPath = path.join(repoRoot, "config/pass35/local-pdf-asset-catalog.json");
const qualityRoot = path.join(repoRoot, "artifacts/pass35/local-product-quality");
const corpusRoot = path.join(qualityRoot, "pdf-corpus");
const manifestPath = path.join(qualityRoot, "PASS35_LOCAL_PDF_CORPUS_MANIFEST.json");
const generationLockPath = path.join(qualityRoot, ".pdf-corpus-generation.lock");
const tiers: ReadonlyArray<{ depth: PdfDepth; tier: PdfTier; pageCount: 2 | 4 | 8 }> = [
  { depth: "basic", tier: "Basic", pageCount: 2 },
  { depth: "pro", tier: "Pro", pageCount: 4 },
  { depth: "advanced", tier: "Advanced", pageCount: 8 },
];
const locales: readonly Locale[] = ["pl", "en", "de"];
const safetyMarker = "SYNTHETIC QA - OFFLINE - NOT LIVE - NOT FOR SALE";


function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function acquireGenerationLock() {
  await fs.mkdir(qualityRoot, { recursive: true });
  const startedAt = Date.now();
  const token = crypto.randomUUID();
  const owner = {
    pid: process.pid,
    token,
    createdAt: new Date().toISOString(),
  };
  while (true) {
    try {
      const handle = await fs.open(generationLockPath, "wx", 0o600);
      await handle.writeFile(`${JSON.stringify(owner)}\n`, "utf8");
      await handle.close();
      return async () => {
        try {
          const current = JSON.parse(await fs.readFile(generationLockPath, "utf8")) as {
            token?: unknown;
          };
          if (current.token === token) await fs.rm(generationLockPath, { force: true });
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
        }
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== "EEXIST") throw error;
      try {
        const stat = await fs.stat(generationLockPath);
        const ageMs = Date.now() - stat.mtimeMs;
        let existingPid = 0;
        try {
          const existing = JSON.parse(await fs.readFile(generationLockPath, "utf8")) as {
            pid?: unknown;
          };
          existingPid = Number(existing.pid);
        } catch {
          existingPid = 0;
        }
        let ownerAlive = false;
        if (Number.isSafeInteger(existingPid) && existingPid > 0) {
          try {
            process.kill(existingPid, 0);
            ownerAlive = true;
          } catch (pidError) {
            ownerAlive = (pidError as NodeJS.ErrnoException)?.code === "EPERM";
          }
        }
        // PIDs can be namespace-local across independent workers. Only reclaim
        // a seemingly dead owner after a conservative quiet period.
        if ((!ownerAlive && ageMs > 30_000) || ageMs > 5 * 60_000) {
          await fs.rm(generationLockPath, { force: true });
          continue;
        }
      } catch (statError) {
        if ((statError as NodeJS.ErrnoException)?.code !== "ENOENT") throw statError;
        continue;
      }
      if (Date.now() - startedAt > 90_000) throw new Error("local_pdf_generation_lock_timeout", { cause: error });
      await sleep(100);
    }
  }
}

function sha256(value: crypto.BinaryLike) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function stableOrderKey(seed: string, id: string) {
  return crypto.createHash("sha256").update(`${seed}|${id}`).digest("hex");
}

function safeFileToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

function assertCatalog(value: unknown): asserts value is AssetCatalog {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("local_pdf_catalog_invalid");
  const catalog = value as Partial<AssetCatalog>;
  if (catalog.schemaVersion !== "velmere.pass35.local-pdf-asset-catalog.v1") throw new Error("local_pdf_catalog_schema_invalid");
  if (catalog.mode !== "synthetic_offline_renderer_qa") throw new Error("local_pdf_catalog_mode_invalid");
  if (!Number.isFinite(Date.parse(String(catalog.generatedAt ?? "")))) throw new Error("local_pdf_catalog_time_invalid");
  if (!catalog.seed || !Array.isArray(catalog.assets) || catalog.assets.length !== 50 || catalog.assetCount !== 50) {
    throw new Error("local_pdf_catalog_count_invalid");
  }
  const ids = new Set<string>();
  const symbols = new Set<string>();
  for (const asset of catalog.assets) {
    if (!asset || typeof asset !== "object") throw new Error("local_pdf_catalog_asset_invalid");
    if (!/^crypto-[0-9]{2}-[a-z0-9-]+$/.test(asset.id)) throw new Error(`local_pdf_catalog_asset_id_invalid:${asset.id}`);
    if (!/^[A-Z0-9]{2,12}$/.test(asset.symbol)) throw new Error(`local_pdf_catalog_symbol_invalid:${asset.symbol}`);
    if (!asset.name.trim() || !asset.scenario.trim()) throw new Error(`local_pdf_catalog_asset_fields_invalid:${asset.id}`);
    if (ids.has(asset.id) || symbols.has(asset.symbol)) throw new Error(`local_pdf_catalog_duplicate:${asset.id}:${asset.symbol}`);
    ids.add(asset.id);
    symbols.add(asset.symbol);
  }
  const boundaries = catalog.boundaries;
  if (!boundaries?.synthetic || !boundaries.offline || !boundaries.notLive || !boundaries.notForSale) {
    throw new Error("local_pdf_catalog_safety_boundary_invalid");
  }
  if (boundaries.commercialUseAllowed || boundaries.investmentRecommendation) {
    throw new Error("local_pdf_catalog_commercial_boundary_invalid");
  }
}

function syntheticResult(asset: AssetFixture, locale: Locale): VelmereSearchResult {
  const localized = {
    pl: {
      summary: `${safetyMarker}. Fixture renderera ${asset.symbol}; scenariusz ${asset.scenario} to dane testowe, nie bieżący rynek.`,
      whyItMatters: "Sprawdza układ, poziomy, paginację i język dowodowy bez danych dostawców.",
      missingData: [
        "Brak bieżących danych dostawców.",
        "Brak niezależnego potwierdzenia źródłowego.",
        "Brak ceny, płynności, danych posiadaczy i giełd.",
      ],
      nextOperatorStep: "Tylko lokalne QA; przed realną oceną dołącz aktualne, niezależnie zweryfikowane dowody.",
    },
    de: {
      summary: `${safetyMarker}. Renderer-Fixture ${asset.symbol}; Szenario ${asset.scenario} sind Testdaten, kein aktueller Markt.`,
      whyItMatters: "Prüft Layout, Stufen, Seiten und Evidenzsprache ohne Anbieterdaten.",
      missingData: [
        "Aktuelle Anbieterdaten fehlen.",
        "Unabhängige Quellenbestätigung fehlt.",
        "Preis-, Liquiditäts-, Halter- und Handelsplatzdaten fehlen.",
      ],
      nextOperatorStep: "Nur lokales QA; vor realer Bewertung aktuelle, unabhängig geprüfte Evidenz beifügen.",
    },
    en: {
      summary: `${safetyMarker}. Renderer fixture ${asset.symbol}; scenario ${asset.scenario} is test data, not the current market.`,
      whyItMatters: "Checks layout, tiers, pagination and evidence wording without provider data.",
      missingData: [
        "Current provider data is absent.",
        "Independent source confirmation is absent.",
        "Price, liquidity, holder and venue data is absent.",
      ],
      nextOperatorStep: "Local QA only; attach current independently verified evidence before real-world assessment.",
    },
  }[locale];
  return {
    id: `pass35-${asset.id}`,
    title: `[SYNTHETIC QA] ${asset.name}`,
    symbol: asset.symbol,
    category: "token",
    tone: "review",
    summary: localized.summary,
    whyItMatters: localized.whyItMatters,
    missingData: localized.missingData,
    nextOperatorStep: localized.nextOperatorStep,
    sourceMode: "missing",
    sourceConfidence: 0,
    shieldHref: `/market-integrity?asset=pass35-${safeFileToken(asset.id)}`,
    avatarLabel: asset.symbol,
    sources: [],
    chips: ["synthetic", "offline", "not-live", "not-for-sale"],
    marketSnapshot: {
      assetClass: "crypto",
      providerState: "not_configured",
      anomalyLabel: `synthetic_${asset.scenario}`,
    },
  };
}

async function main() {
  const releaseLock = await acquireGenerationLock();
  const temporaryCorpusRoot = `${corpusRoot}.tmp-${process.pid}-${Date.now()}`;
  try {
  const temporaryPrefix = `${path.basename(corpusRoot)}.tmp-`;
  const staleTemporaryRoots = (await fs.readdir(qualityRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(temporaryPrefix))
    .map((entry) => path.join(qualityRoot, entry.name));
  await Promise.all(staleTemporaryRoots.map((entry) =>
    fs.rm(entry, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }),
  ));
  const catalogBytes = await fs.readFile(catalogPath);
  const catalog = JSON.parse(catalogBytes.toString("utf8")) as unknown;
  assertCatalog(catalog);

  const orderedAssets = [...catalog.assets].sort((left, right) => (
    stableOrderKey(catalog.seed, left.id).localeCompare(stableOrderKey(catalog.seed, right.id))
  ));

  await fs.rm(temporaryCorpusRoot, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  await Promise.all(tiers.map(({ depth }) => fs.mkdir(path.join(temporaryCorpusRoot, depth), { recursive: true })));

  const entries = [];
  for (let assetIndex = 0; assetIndex < orderedAssets.length; assetIndex += 1) {
    const asset = orderedAssets[assetIndex];
    const localeHash = crypto.createHash("sha256").update(`${catalog.seed}|locale|${asset.id}`).digest()[0] ?? 0;
    const locale = locales[localeHash % locales.length];
    const result = syntheticResult(asset, locale);
    for (const tierConfig of tiers) {
      const report = buildLensReport(result, locale, tierConfig.depth, catalog.generatedAt);
      report.labels = { ...report.labels, signature: safetyMarker };
      const pdf = buildPdf(report, tierConfig.depth);
      const sequence = String(assetIndex + 1).padStart(2, "0");
      const fileName = `${sequence}-${safeFileToken(asset.symbol)}-${tierConfig.depth}.pdf`;
      const finalAbsolutePath = path.join(corpusRoot, tierConfig.depth, fileName);
      const temporaryAbsolutePath = path.join(temporaryCorpusRoot, tierConfig.depth, fileName);
      const relativePath = path.relative(repoRoot, finalAbsolutePath).split(path.sep).join("/");
      await fs.writeFile(temporaryAbsolutePath, pdf);
      const snapshotDigest = sha256(JSON.stringify({
        seed: catalog.seed,
        generatedAt: catalog.generatedAt,
        asset,
        locale,
        depth: tierConfig.depth,
        sourceMode: result.sourceMode,
        sourceConfidence: result.sourceConfidence,
      }));
      entries.push({
        id: `pass35-local-pdf-${asset.id}-${tierConfig.depth}`,
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        assetClass: "crypto" as const,
        scenario: asset.scenario,
        locale,
        tier: tierConfig.tier,
        depth: tierConfig.depth,
        path: relativePath,
        sha256: sha256(pdf),
        byteLength: pdf.byteLength,
        pageCount: tierConfig.pageCount,
        snapshotDigest,
        sourceMode: "missing" as const,
        sourceConfidence: 0,
        synthetic: true,
        offline: true,
        notLive: true,
        notForSale: true,
        commercialUseAllowed: false,
      });
    }
  }

  await fs.rm(corpusRoot, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  await fs.rename(temporaryCorpusRoot, corpusRoot);

  const unsignedManifest = {
    schemaVersion: "velmere.pass35.local-pdf-corpus-manifest.v1" as const,
    generatedAt: catalog.generatedAt,
    mode: catalog.mode,
    seed: catalog.seed,
    renderer: {
      reportBuilder: "lib/search/lens-report.ts#buildLensReport",
      byteRenderer: "lib/search/lens-pdf-renderer.ts#buildPdf",
      routeUsed: false,
      entitlementUsed: false,
      accountUsed: false,
    },
    sourceCatalog: {
      path: path.relative(repoRoot, catalogPath).split(path.sep).join("/"),
      sha256: sha256(catalogBytes),
      assetCount: catalog.assets.length,
      selectionPolicy: "sha256(seed|assetId) deterministic order",
    },
    boundaries: {
      synthetic: true,
      offline: true,
      notLive: true,
      notForSale: true,
      commercialUseAllowed: false,
      investmentRecommendation: false,
      productionEntitlementBypassed: false,
      safetyMarker,
    },
    totals: {
      pdfCount: entries.length,
      uniqueAssets: new Set(entries.map((entry) => entry.assetId)).size,
      byTier: { Basic: 50, Pro: 50, Advanced: 50 },
      totalPages: entries.reduce((sum, entry) => sum + entry.pageCount, 0),
    },
    entries,
  };
  const manifest = {
    ...unsignedManifest,
    manifestDigest: sha256(JSON.stringify(unsignedManifest)),
  };
  await fs.mkdir(qualityRoot, { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    status: "PASS",
    manifestPath: path.relative(repoRoot, manifestPath).split(path.sep).join("/"),
    pdfCount: manifest.totals.pdfCount,
    uniqueAssets: manifest.totals.uniqueAssets,
    byTier: manifest.totals.byTier,
    totalPages: manifest.totals.totalPages,
  }, null, 2));
  } finally {
    try {
      await fs.rm(temporaryCorpusRoot, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    } finally {
      await releaseLock();
    }
  }
}

await main();
