/**
 * Velmère Dynamic Signal Availability & Stop-Sell Protection Engine.
 *
 * R11 truth boundary:
 * - a configured signal is not an available signal;
 * - formal proof, external timestamp, human review and advanced simulations are
 *   unavailable unless the caller supplies an explicit evidence-backed flag;
 * - local SHA-256 integrity is never described as an external certificate/TSA.
 */

export type AuditOrAssetTier = "basic" | "pro" | "advanced";

export interface SignalDefinition {
  id: string;
  name: string;
  namePl: string;
  nameDe: string;
  requiredFor: AuditOrAssetTier[];
  description: string;
  descriptionDe: string;
}

export const CANONICAL_SIGNALS: SignalDefinition[] = [
  { id: "sig_ast_syntax", name: "AST Syntax & Static Analysis", namePl: "Analiza statyczna i drzewo AST", nameDe: "AST-Syntax & Statische Analyse", requiredFor: ["basic", "pro", "advanced"], description: "Parsowanie składniowe kodu i dekompilacja bazowa", descriptionDe: "Syntaktisches Code-Parsing und Basis-Dekompilierung" },
  { id: "sig_symbolic_bytecode", name: "Symbolic Bytecode Execution", namePl: "Symboliczna egzekucja kodu bajtowego", nameDe: "Symbolische Bytecode-Ausführung", requiredFor: ["basic", "pro", "advanced"], description: "Analiza instrukcji opkodowych EVM bez konieczności źródła", descriptionDe: "Analyse von EVM-Opcode-Befehlen ohne Quellcodeerfordernis" },
  { id: "sig_reentrancy_guard", name: "Reentrancy Guard Verification", namePl: "Weryfikacja ochrony przed Reentrancy", nameDe: "Reentrancy-Guard-Verifizierung", requiredFor: ["basic", "pro", "advanced"], description: "Sprawdzanie blokad mutex i kolejności checks-effects-interactions", descriptionDe: "Überprüfung von Mutex-Sperren und Checks-Effects-Interactions-Reihenfolge" },
  { id: "sig_access_control", name: "Access Control Matrix", namePl: "Macierz uprawnień i ról administracyjnych", nameDe: "Zugriffskontrollmatrix & Rollen", requiredFor: ["basic", "pro", "advanced"], description: "Identyfikacja uprawnień administracyjnych", descriptionDe: "Identifikation administrativer Berechtigungen" },
  { id: "sig_math_invariants", name: "Integer Overflow / Math Invariants", namePl: "Niezmienniki matematyczne i przepełnienia", nameDe: "Mathematische Invarianten & Überläufe", requiredFor: ["basic", "pro", "advanced"], description: "Analiza bezpiecznej arytmetyki i dzielenia przez zero", descriptionDe: "Analyse sicherer Arithmetik und Division durch Null" },
  { id: "sig_token_standard", name: "Token Standard Compliance", namePl: "Zgodność ze standardem tokena (ERC20/BEP20)", nameDe: "Token-Standard-Konformität (ERC20/BEP20)", requiredFor: ["basic", "pro", "advanced"], description: "Badanie transferFrom, approve, eventów i allowance", descriptionDe: "Prüfung von transferFrom, approve, Events und Allowance" },
  { id: "sig_honeypot_detection", name: "Honeypot & Tax Trap Detection", namePl: "Wykrywanie pułapek Honeypot i podatków", nameDe: "Honeypot- & Steuerfallen-Erkennung", requiredFor: ["basic", "pro", "advanced"], description: "Symulacja zachowania sprzedaży", descriptionDe: "Simulation des Verkaufsverhaltens" },
  { id: "sig_ownership_state", name: "Ownership & Renunciation Analysis", namePl: "Analiza statusu praw właściciela", nameDe: "Analyse des Eigentümerstatus", requiredFor: ["basic", "pro", "advanced"], description: "Badanie uprawnień twórcy do zmiany reguł kontraktu", descriptionDe: "Prüfung der Änderungsrechte des Erstellers" },
  { id: "sig_preliminary_score", name: "Preliminary Safety Score", namePl: "Wstępny wskaźnik bezpieczeństwa", nameDe: "Vorläufiger Sicherheits-Score", requiredFor: ["basic", "pro", "advanced"], description: "Kalkulacja ryzyka 0-100 w granicach dostępnych dowodów", descriptionDe: "Risikoberechnung 0-100 im Rahmen verfügbarer Nachweise" },
  { id: "sig_public_metadata", name: "Public On-Chain Metadata", namePl: "Publiczne metadane on-chain", nameDe: "Öffentliche On-Chain-Metadaten", requiredFor: ["basic", "pro", "advanced"], description: "Odczyt wdrożenia i publicznych metadanych", descriptionDe: "Abruf von Deployment- und öffentlichen Metadaten" },

  { id: "sig_holder_distribution", name: "Whale Concentration & Holder Distribution", namePl: "Koncentracja wielorybów i rozkład portfeli", nameDe: "Wal-Konzentration & Halter-Verteilung", requiredFor: ["pro", "advanced"], description: "Analiza rozproszenia tokenów", descriptionDe: "Analyse der Token-Verteilung" },
  { id: "sig_orderbook_liquidity", name: "L2/L3 Orderbook & Pool Liquidity", namePl: "Głębokość księgi L2/L3 i płynność puli", nameDe: "L2/L3-Orderbuch-Tiefe & Pool-Liquidität", requiredFor: ["pro", "advanced"], description: "Analiza dostępnej płynności", descriptionDe: "Analyse der verfügbaren Liquidität" },
  { id: "sig_vwap_slippage", name: "VWAP Slippage Modeling", namePl: "Modelowanie poślizgu cenowego VWAP", nameDe: "VWAP-Slippage-Modellierung", requiredFor: ["pro", "advanced"], description: "Modelowanie realizacji zleceń na dostępnych danych", descriptionDe: "Modellierung der Auftragsausführung auf verfügbaren Daten" },
  { id: "sig_crypto_pdf_seal", name: "Local SHA-256 PDF Integrity Seal", namePl: "Lokalna pieczęć integralności PDF SHA-256", nameDe: "Lokales SHA-256-PDF-Integritätssiegel", requiredFor: ["pro", "advanced"], description: "Lokalny digest integralności pliku; bez zewnętrznego TSA lub certyfikacji", descriptionDe: "Lokaler Datei-Integritätsdigest; keine externe TSA oder Zertifizierung" },

  { id: "sig_formal_verification", name: "Executed Formal Solver Evidence", namePl: "Dowód wykonania solvera formalnego", nameDe: "Nachweis einer ausgeführten formalen Solver-Prüfung", requiredFor: ["advanced"], description: "Dostępne tylko po wykonaniu solvera i związaniu wyniku z dokładnym zakresem", descriptionDe: "Nur nach ausgeführtem Solver und exakter Scope-Bindung verfügbar" },
  { id: "sig_multi_auditor_consensus", name: "Multi-Model Comparative Evidence", namePl: "Porównawcze dowody wielomodelowe", nameDe: "Vergleichende Multi-Modell-Nachweise", requiredFor: ["advanced"], description: "Porównanie wyników dostępne tylko z rzeczywistym receipt", descriptionDe: "Ergebnisvergleich nur mit tatsächlichem Receipt verfügbar" },
  { id: "sig_historical_exploit_replay", name: "Historical Exploit Replay Evidence", namePl: "Dowód replay historycznych exploitów", nameDe: "Nachweis historischer Exploit-Replays", requiredFor: ["advanced"], description: "Replay jest dostępny wyłącznie po faktycznym wykonaniu", descriptionDe: "Replay ist nur nach tatsächlicher Ausführung verfügbar" },
  { id: "sig_oracle_manipulation", name: "Oracle / Flash-Loan Simulation Evidence", namePl: "Dowód symulacji oracle / flash-loan", nameDe: "Nachweis einer Oracle-/Flash-Loan-Simulation", requiredFor: ["advanced"], description: "Sygnał wymaga wykonanego scenariusza symulacyjnego", descriptionDe: "Signal erfordert ein ausgeführtes Simulationsszenario" },
  { id: "sig_institutional_timestamp", name: "External Timestamp Evidence", namePl: "Dowód zewnętrznego znacznika czasu", nameDe: "Nachweis eines externen Zeitstempels", requiredFor: ["advanced"], description: "Zewnętrzny timestamp jest dostępny tylko po kryptograficznej weryfikacji tokena", descriptionDe: "Externer Zeitstempel nur nach kryptografischer Token-Verifikation verfügbar" },
  { id: "sig_sovereign_demarcation", name: "Confirmed Human Review Evidence", namePl: "Potwierdzony dowód przeglądu eksperckiego", nameDe: "Bestätigter Nachweis einer Expertenprüfung", requiredFor: ["advanced"], description: "Sygnał wymaga potwierdzonego receipt przeglądu człowieka", descriptionDe: "Signal erfordert ein bestätigtes Human-Review-Receipt" },
];

export interface SignalAvailabilityContext {
  hasBytecode: boolean;
  hasSourceCode?: boolean;
  hasOnChainDeploy: boolean;
  hasLiquidityPool?: boolean;
  hasOrderbookData?: boolean;
  hasTradingHistory?: boolean;
  isVerifiedExplorer?: boolean;
  isHistoricalContract?: boolean;
  hasLocalPdfIntegritySeal?: boolean;
  hasFormalSolverProof?: boolean;
  hasMultiAuditorEvidence?: boolean;
  hasExploitReplayEvidence?: boolean;
  hasOracleSimulationEvidence?: boolean;
  hasExternalTimestampProof?: boolean;
  hasConfirmedHumanReview?: boolean;
}

export interface DynamicSignalEvaluation {
  tier: AuditOrAssetTier;
  targetSignalsCount: number;
  availableSignalsCount: number;
  availableSignals: SignalDefinition[];
  missingSignals: SignalDefinition[];
  coverageRatio: number;
  deliveryState: "FULL_DELIVERY" | "PARTIAL_DELIVERY_DISCOUNTED" | "STOP_SELL_ACTIVE";
  canPurchase: boolean;
  basePriceEur: number;
  discountPercent: number;
  effectivePriceEur: number;
  badgeTextPl: string;
  badgeTextEn: string;
  badgeTextDe?: string;
  rationalePl: string;
  rationaleEn: string;
  rationaleDe?: string;
}

const EVIDENCE_FLAGS: Partial<Record<string, keyof SignalAvailabilityContext>> = {
  sig_crypto_pdf_seal: "hasLocalPdfIntegritySeal",
  sig_formal_verification: "hasFormalSolverProof",
  sig_multi_auditor_consensus: "hasMultiAuditorEvidence",
  sig_historical_exploit_replay: "hasExploitReplayEvidence",
  sig_oracle_manipulation: "hasOracleSimulationEvidence",
  sig_institutional_timestamp: "hasExternalTimestampProof",
  sig_sovereign_demarcation: "hasConfirmedHumanReview",
};

export function evaluateDynamicSignals(
  tier: AuditOrAssetTier,
  context: SignalAvailabilityContext,
): DynamicSignalEvaluation {
  const targetSignals = CANONICAL_SIGNALS.filter((s) => s.requiredFor.includes(tier));
  const targetCount = targetSignals.length;
  const available: SignalDefinition[] = [];
  const missing: SignalDefinition[] = [];

  for (const signal of targetSignals) {
    let isAvailable = true;

    if (signal.id === "sig_symbolic_bytecode" && !context.hasBytecode) isAvailable = false;
    if (signal.id === "sig_ast_syntax" && !context.hasSourceCode && !context.hasBytecode) isAvailable = false;
    if (signal.id === "sig_public_metadata" && !context.hasOnChainDeploy) isAvailable = false;
    if (signal.id === "sig_orderbook_liquidity" && context.hasLiquidityPool === false && context.hasOrderbookData === false) isAvailable = false;
    if (signal.id === "sig_vwap_slippage" && context.hasTradingHistory === false) isAvailable = false;
    if (signal.id === "sig_holder_distribution" && !context.hasOnChainDeploy) isAvailable = false;

    const evidenceFlag = EVIDENCE_FLAGS[signal.id];
    if (evidenceFlag && context[evidenceFlag] !== true) isAvailable = false;

    (isAvailable ? available : missing).push(signal);
  }

  const availableCount = available.length;
  const coverageRatio = targetCount > 0 ? availableCount / targetCount : 0;
  const basePrices: Record<AuditOrAssetTier, number> = { basic: 0, pro: 14.99, advanced: 149.99 };
  const basePrice = basePrices[tier];
  const minThresholds: Record<AuditOrAssetTier, number> = { basic: 5, pro: 10, advanced: 15 };
  const minRequired = minThresholds[tier];

  if (availableCount < minRequired) {
    return {
      tier,
      targetSignalsCount: targetCount,
      availableSignalsCount: availableCount,
      availableSignals: available,
      missingSignals: missing,
      coverageRatio,
      deliveryState: "STOP_SELL_ACTIVE",
      canPurchase: false,
      basePriceEur: basePrice,
      discountPercent: 0,
      effectivePriceEur: basePrice,
      badgeTextPl: `STOP-SELL: Tylko ${availableCount}/${targetCount} sygnałów`,
      badgeTextEn: `STOP-SELL: Only ${availableCount}/${targetCount} signals`,
      badgeTextDe: `STOP-SELL: Nur ${availableCount}/${targetCount} Signale`,
      rationalePl: `Zakup zablokowany. Dostępnych jest ${availableCount}/${targetCount} sygnałów; brakujące sygnały wymagają dodatkowych dowodów lub wykonania.`,
      rationaleEn: `Purchase blocked. ${availableCount}/${targetCount} signals are available; missing signals require additional evidence or execution.`,
      rationaleDe: `Kauf blockiert. ${availableCount}/${targetCount} Signale sind verfügbar; fehlende Signale benötigen zusätzliche Nachweise oder Ausführung.`,
    };
  }

  if (availableCount === targetCount) {
    return {
      tier,
      targetSignalsCount: targetCount,
      availableSignalsCount: availableCount,
      availableSignals: available,
      missingSignals: [],
      coverageRatio: 1,
      deliveryState: "FULL_DELIVERY",
      canPurchase: true,
      basePriceEur: basePrice,
      discountPercent: 0,
      effectivePriceEur: basePrice,
      badgeTextPl: `Pełna dostępność (${targetCount}/${targetCount} sygnałów)`,
      badgeTextEn: `Full availability (${targetCount}/${targetCount} signals)`,
      badgeTextDe: `Volle Verfügbarkeit (${targetCount}/${targetCount} Signale)`,
      rationalePl: `Wszystkie ${targetCount} sygnały mają jawnie potwierdzoną dostępność dla tego wykonania.`,
      rationaleEn: `All ${targetCount} signals have explicit availability for this execution.`,
      rationaleDe: `Alle ${targetCount} Signale sind für diese Ausführung explizit verfügbar.`,
    };
  }

  const missingCount = targetCount - availableCount;
  const discountPerMissing = tier === "pro" ? 10 : 7;
  const discountPercent = Math.min(40, missingCount * discountPerMissing);
  const effectivePriceEur = Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100;

  return {
    tier,
    targetSignalsCount: targetCount,
    availableSignalsCount: availableCount,
    availableSignals: available,
    missingSignals: missing,
    coverageRatio,
    deliveryState: "PARTIAL_DELIVERY_DISCOUNTED",
    canPurchase: true,
    basePriceEur: basePrice,
    discountPercent,
    effectivePriceEur,
    badgeTextPl: `Dynamiczny rabat -${discountPercent}% (${availableCount}/${targetCount} sygnałów)`,
    badgeTextEn: `Dynamic Discount -${discountPercent}% (${availableCount}/${targetCount} signals)`,
    badgeTextDe: `Dynamischer Rabatt -${discountPercent}% (${availableCount}/${targetCount} Signale)`,
    rationalePl: `Dostępnych jest ${availableCount} z ${targetCount} sygnałów. Brakujące: ${missing.map((s) => s.namePl).join(", ")}.`,
    rationaleEn: `${availableCount} of ${targetCount} signals are available. Missing: ${missing.map((s) => s.name).join(", ")}.`,
    rationaleDe: `${availableCount} von ${targetCount} Signalen sind verfügbar. Fehlend: ${missing.map((s) => s.nameDe || s.name).join(", ")}.`,
  };
}
