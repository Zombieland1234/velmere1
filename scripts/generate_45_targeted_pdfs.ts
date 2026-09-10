import fs from "node:fs";
import path from "node:path";
import {
  buildCanonicalAuditReport,
  renderCanonicalReportToPdf,
  type AuditTier,
} from "../lib/security/audit-canonical-report.ts";

export interface TargetAuditItem {
  id: string;
  name: string;
  symbol: string;
  address: string;
  network: string;
  chainId: string;
  category: "smart_contract" | "shield_crypto" | "real_markets";
  surface: "canonical" | "shield" | "real-markets";
  locale: "pl" | "en";
}

export const TARGET_15_ASSETS: TargetAuditItem[] = [
  // 5 Smart Contracts
  { id: "usdt", name: "Tether USD Core", symbol: "USDT", address: "0xdac17f958d2ee523a2206206994597c13d831ec7", network: "Ethereum Mainnet", chainId: "1", category: "smart_contract", surface: "canonical", locale: "pl" },
  { id: "usdc", name: "USD Coin FiatTokenV2", symbol: "USDC", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", network: "Ethereum Mainnet", chainId: "1", category: "smart_contract", surface: "canonical", locale: "en" },
  { id: "wbnb", name: "Wrapped BNB Contract", symbol: "WBNB", address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", network: "BNB Smart Chain (BSC)", chainId: "56", category: "smart_contract", surface: "canonical", locale: "pl" },
  { id: "cake_router", name: "PancakeSwap Router v2", symbol: "CAKE-RTR", address: "0x10ed43c718714eb63d5aa57b78b54704e256024e", network: "BNB Smart Chain (BSC)", chainId: "56", category: "smart_contract", surface: "canonical", locale: "pl" },
  { id: "uni_v3_router", name: "Uniswap v3 SwapRouter02", symbol: "UNI-V3-RTR", address: "0xe592427a0aece92de3edee1f18e0157c05861564", network: "Ethereum Mainnet", chainId: "1", category: "smart_contract", surface: "canonical", locale: "en" },

  // 5 Shield Coins
  { id: "btc", name: "Bitcoin Core", symbol: "BTC", address: "btc", network: "Bitcoin Mainnet", chainId: "0", category: "shield_crypto", surface: "shield", locale: "pl" },
  { id: "eth", name: "Ethereum Execution Protocol", symbol: "ETH", address: "eth", network: "Ethereum Mainnet", chainId: "1", category: "shield_crypto", surface: "shield", locale: "en" },
  { id: "sol", name: "Solana Core Ledger", symbol: "SOL", address: "native-solana-ledger", network: "Solana Mainnet-Beta", chainId: "101", category: "shield_crypto", surface: "shield", locale: "pl" },
  { id: "bnb", name: "BNB Beacon & Smart Chain", symbol: "BNB", address: "native-bnb-beacon", network: "BNB Smart Chain (BSC)", chainId: "56", category: "shield_crypto", surface: "shield", locale: "pl" },
  { id: "doge", name: "Dogecoin Core UTXO", symbol: "DOGE", address: "native-dogecoin-utxo", network: "Dogecoin Mainnet", chainId: "2000", category: "shield_crypto", surface: "shield", locale: "pl" },

  // 5 Real Markets
  { id: "aapl", name: "Apple Inc. Common Stock", symbol: "AAPL", address: "nasdaq:aapl", network: "NASDAQ / Real Markets", chainId: "9901", category: "real_markets", surface: "real-markets", locale: "en" },
  { id: "nvda", name: "NVIDIA Corp. Common Stock", symbol: "NVDA", address: "nasdaq:nvda", network: "NASDAQ / Real Markets", chainId: "9902", category: "real_markets", surface: "real-markets", locale: "pl" },
  { id: "msft", name: "Microsoft Corp. Common Stock", symbol: "MSFT", address: "nasdaq:msft", network: "NASDAQ / Real Markets", chainId: "9903", category: "real_markets", surface: "real-markets", locale: "en" },
  { id: "tsla", name: "Tesla Inc. Common Stock", symbol: "TSLA", address: "nasdaq:tsla", network: "NASDAQ / Real Markets", chainId: "9904", category: "real_markets", surface: "real-markets", locale: "pl" },
  { id: "gold", name: "Gold Comex Futures (100 oz)", symbol: "GC=F", address: "comex:gc=f", network: "COMEX / Real Markets", chainId: "9905", category: "real_markets", surface: "real-markets", locale: "pl" },
];

export interface ManifestEntry {
  index: number;
  assetId: string;
  name: string;
  symbol: string;
  category: string;
  tier: AuditTier;
  surface: string;
  locale: string;
  fileName: string;
  relativePdfPath: string;
  relativeJsonPath: string;
  byteLength: number;
  pageCount: number;
  sha256: string;
  riskScore: number;
  riskLabel: string;
  confidenceScore: number;
  evidenceCoverage: number;
  reportDigest: string;
  merkleRoot?: string;
  releaseDecision?: string;
  verificationStatus?: string;
  stopSellActive?: boolean;
  stopSellReason?: string;
  formalProofCoveragePct?: number;
}

export async function runGenerate45Audits() {
  const outputDir = path.resolve(process.cwd(), "dowody/pdfs");
  const jsonOutputDir = path.resolve(process.cwd(), "dowody/json");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(jsonOutputDir, { recursive: true });

  const tiers: AuditTier[] = ["basic", "pro", "advanced"];
  const manifest: ManifestEntry[] = [];
  let itemIndex = 1;
  const startTime = Date.now();

  console.log("================================================================================");
  console.log("VELMÈRE INSTITUTIONAL AUDIT ENGINE: GENERATING 45 TARGETED CERTIFIED AUDIT PDFS");
  console.log("Scope: 5 Contracts + 5 Shield Coins + 5 Real Markets across Basic, Pro, Advanced");
  console.log("Target Directory:", outputDir);
  console.log("================================================================================\n");

  for (const target of TARGET_15_ASSETS) {
    for (const tier of tiers) {
      const reportId = `rep_${target.id}_${tier}_${String(itemIndex).padStart(2, "0")}`;
      const reportInput = {
        reportId,
        caseRef: `CASE-VLM-${target.id.toUpperCase()}-${tier.toUpperCase()}`,
        contractName: target.name,
        contractAddress: target.address,
        network: target.network,
        chainId: target.chainId,
        tokenSymbol: target.symbol,
        locale: target.locale,
        applicationSurface: target.surface,
        humanReviewer: undefined, // Strictly AUTOMATED_ONLY under V3 reality principle
      };

      const canonicalReport = buildCanonicalAuditReport(reportInput, tier);
      const { pdfBytes, pdfDigest, pdfByteLength, pageCount } = renderCanonicalReportToPdf(canonicalReport);

      // Verify invariants
      if (!pdfBytes || pdfByteLength < 1000) {
        throw new Error(`PDF generation failed for ${target.symbol} (${tier}): byteLength too small (${pdfByteLength})`);
      }
      const header = Buffer.from(pdfBytes.slice(0, 5)).toString("ascii");
      if (header !== "%PDF-") {
        throw new Error(`Invalid PDF header for ${target.symbol} (${tier}): ${header}`);
      }

      const safeStem = target.symbol.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      const fileName = `${String(itemIndex).padStart(2, "0")}_${safeStem}_${tier}_${target.locale}.pdf`;
      const pdfFilePath = path.join(outputDir, fileName);
      fs.writeFileSync(pdfFilePath, Buffer.from(pdfBytes));

      const jsonFileName = `${String(itemIndex).padStart(2, "0")}_${safeStem}_${tier}_${target.locale}.json`;
      const jsonFilePath = path.join(jsonOutputDir, jsonFileName);
      fs.writeFileSync(jsonFilePath, JSON.stringify(canonicalReport, null, 2), "utf8");

      const entry: ManifestEntry = {
        index: itemIndex,
        assetId: target.id,
        name: target.name,
        symbol: target.symbol,
        category: target.category,
        tier,
        surface: target.surface,
        locale: target.locale,
        fileName,
        relativePdfPath: `dowody/pdfs/${fileName}`,
        relativeJsonPath: `dowody/json/${jsonFileName}`,
        byteLength: pdfByteLength,
        pageCount,
        sha256: pdfDigest,
        riskScore: canonicalReport.verdict.riskScore,
        riskLabel: canonicalReport.verdict.riskLabel,
        confidenceScore: canonicalReport.verdict.confidenceScore,
        evidenceCoverage: canonicalReport.verdict.evidenceCoverage,
        reportDigest: canonicalReport.reportDigest,
        merkleRoot: canonicalReport.merkleRoot,
        releaseDecision: canonicalReport.verdict.releaseDecision,
        verificationStatus: canonicalReport.verdict.verificationStatus,
        stopSellActive: canonicalReport.verdict.stopSellActive,
        stopSellReason: canonicalReport.verdict.stopSellReason,
        formalProofCoveragePct: canonicalReport.verdict.formalProofCoveragePct,
      };

      manifest.push(entry);
      console.log(`[${String(itemIndex).padStart(2, "0")}/45] OK: ${target.symbol.padEnd(10, " ")} | Tier: ${tier.toUpperCase().padEnd(8, " ")} | ${fileName} (${pdfByteLength} bytes, ${pageCount} pages, Risk: ${entry.riskScore})`);
      itemIndex++;
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`\n>>> SUCCESSFULLY GENERATED ALL 45 CERTIFIED AUDIT REPORTS IN ${durationMs}ms!`);

  // Write Master JSON Manifest
  const manifestJsonPath = path.resolve(process.cwd(), "dowody/rejestr_45_wygenerowanych_pdf.json");
  fs.writeFileSync(manifestJsonPath, JSON.stringify({
    schemaVersion: "velmere.audit.targeted-45-manifest.v1",
    totalGenerated: manifest.length,
    generatedAt: new Date().toISOString(),
    totalDurationMs: durationMs,
    avgDurationPerPdfMs: Math.round(durationMs / manifest.length),
    categories: {
      smart_contract: manifest.filter(m => m.category === "smart_contract").length,
      shield_crypto: manifest.filter(m => m.category === "shield_crypto").length,
      real_markets: manifest.filter(m => m.category === "real_markets").length,
    },
    tiers: {
      basic: manifest.filter(m => m.tier === "basic").length,
      pro: manifest.filter(m => m.tier === "pro").length,
      advanced: manifest.filter(m => m.tier === "advanced").length,
    },
    items: manifest,
  }, null, 2), "utf8");

  // Write Master Human-Readable TXT Dossier
  let txt = `=========================================================================================================\n`;
  txt += `VELMÈRE FINANCIAL INTELLIGENCE & AUDIT SUITE\n`;
  txt += `DOWÓD WYGENEROWANIA 45 CERTYFIKOWANYCH RAPORTÓW AUDYTU DLA CHATGPT I SPRZEDAŻY KOMERCYJNEJ\n`;
  txt += `(5 SMART KONTRAKTÓW, 5 MONET SHIELD, 5 AKCJI/TOWARÓW REAL MARKETS W TIERACH: BASIC, PRO, ADVANCED)\n`;
  txt += `Data certyfikacji: ${new Date().toISOString()}\n`;
  txt += `Czas wykonania: ${durationMs} ms (średnio ${Math.round(durationMs / manifest.length)} ms / PDF)\n`;
  txt += `Status: 100% SUKCES (45/45 ZWERYFIKOWANYCH DOKUMENTÓW PDF-1.7 Z KRYPTOGRAFICZNĄ PIECZĘCIĄ SHA-256)\n`;
  txt += `=========================================================================================================\n\n`;

  txt += `PODZIAŁ NA KATEGORIE I POZIOMY (TIERS):\n`;
  txt += `- Smart Kontrakty EVM (USDT, USDC, WBNB, CAKE-RTR, UNI-V3-RTR): 15 raportów (5 Basic, 5 Pro, 5 Advanced)\n`;
  txt += `- Krypto Shield (BTC, ETH, SOL, BNB, DOGE): 15 raportów (5 Basic, 5 Pro, 5 Advanced)\n`;
  txt += `- Rynki Tradycyjne Real Markets (AAPL, NVDA, MSFT, TSLA, GC=F): 15 raportów (5 Basic, 5 Pro, 5 Advanced)\n\n`;

  txt += `TABELA SZCZEGÓŁOWA WSZYSTKICH 45 WYGENEROWANYCH DOKUMENTÓW:\n`;
  txt += `---------------------------------------------------------------------------------------------------------------------------------\n`;
  txt += `NR  | SYMBOL     | KATEGORIA       | TIER     | STRONY | ROZMIAR  | RYZYKO | PEWNOŚĆ | POKRYCIE | SUMA KONTROLNA SHA-256\n`;
  txt += `---------------------------------------------------------------------------------------------------------------------------------\n`;

  for (const m of manifest) {
    const nr = String(m.index).padStart(2, " ");
    const sym = m.symbol.padEnd(10, " ");
    const cat = m.category.padEnd(15, " ");
    const tr = m.tier.toUpperCase().padEnd(8, " ");
    const pg = String(m.pageCount).padStart(3, " ") + " str";
    const sz = `${Math.round(m.byteLength / 1024)} KB`.padStart(7, " ");
    const rk = `${m.riskScore}/100`.padStart(6, " ");
    const cf = `${m.confidenceScore}%`.padStart(5, " ");
    const cov = `${Math.round(m.evidenceCoverage)}%`.padStart(6, " ");
    txt += `${nr}  | ${sym} | ${cat} | ${tr} | ${pg} | ${sz} | ${rk} | ${cf}  | ${cov}   | ${m.sha256}\n`;
  }
  txt += `---------------------------------------------------------------------------------------------------------------------------------\n`;

  const txtDossierPath = path.resolve(process.cwd(), "dowody/raport_45_wygenerowanych_pdf.txt");
  fs.writeFileSync(txtDossierPath, txt, "utf8");
  console.log(`Wrote TXT Dossier to: ${txtDossierPath}`);
  console.log(`Wrote JSON Manifest to: ${manifestJsonPath}`);

  return { manifest, durationMs };
}

runGenerate45Audits().catch((err) => {
  console.error("FATAL ERROR in 45 Targeted PDF Generator:", err);
  process.exit(1);
});
