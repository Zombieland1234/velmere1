import { z } from "zod";
import type { TokenRiskInput } from "./risk-types";

export const velmereDataBackboneVersion = "velmere_data_backbone_v1_pass104";

const finiteNumber = z.number().finite();
const optionalFiniteNumber = finiteNumber.optional();
const optionalUrlString = z.union([z.string().url(), z.literal(""), z.undefined()]).transform((value) => value || undefined);

export const tokenRiskInputSchema = z.object({
  marketId: z.string().min(1).max(140).optional(),
  symbol: z.string().min(1).max(32).transform((value: string) => value.trim().toUpperCase()),
  name: z.string().min(1).max(160).transform((value: string) => value.trim()),
  image: optionalUrlString,
  rank: optionalFiniteNumber,
  chainId: z.string().min(1).max(64).optional(),
  tokenAddress: z.string().min(1).max(140).optional(),
  pairAddress: z.string().min(1).max(140).optional(),
  dexId: z.string().min(1).max(64).optional(),
  url: optionalUrlString,
  currentPrice: optionalFiniteNumber,
  athPrice: optionalFiniteNumber,
  marketCap: optionalFiniteNumber,
  fdv: optionalFiniteNumber,
  liquidityUsd: optionalFiniteNumber,
  volume24h: optionalFiniteNumber,
  averageVolume7d: optionalFiniteNumber,
  priceChange1h: optionalFiniteNumber,
  priceChange6h: optionalFiniteNumber,
  priceChange24h: optionalFiniteNumber,
  priceChange7d: optionalFiniteNumber,
  priceChange14d: optionalFiniteNumber,
  priceChange30d: optionalFiniteNumber,
  buys24h: optionalFiniteNumber,
  sells24h: optionalFiniteNumber,
  top10HolderPercent: optionalFiniteNumber,
  holderCount: optionalFiniteNumber,
  hadRebrandAfterCrash: z.boolean().optional(),
  abnormalExchangeDeposits: z.boolean().optional(),
  suspiciousContractPrivileges: z.boolean().optional(),
  orderBookDepthDropPercent: optionalFiniteNumber,
  simulatedSlippage10k: optionalFiniteNumber,
  bidAskImbalancePercent: optionalFiniteNumber,
  circulatingSupply: optionalFiniteNumber,
  totalSupply: optionalFiniteNumber,
  maxSupply: optionalFiniteNumber,
  buyTaxPercentage: optionalFiniteNumber,
  sellTaxPercentage: optionalFiniteNumber,
  isHoneypot: z.boolean().optional(),
  canMintNewTokens: z.boolean().optional(),
  canPauseTrading: z.boolean().optional(),
  canBlacklist: z.boolean().optional(),
  sparkline7d: z.array(finiteNumber).max(512).optional(),
  dataSources: z.array(z.string().min(1).max(120)).max(32).optional(),
}).passthrough();

export type TokenRiskInputSchema = z.infer<typeof tokenRiskInputSchema>;

export type DataBackboneValidationResult<T> =
  | { ok: true; data: T; warnings: string[] }
  | { ok: false; data: null; warnings: string[]; error: string };

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeArrayNumbers(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const numbers = value.map(normalizeNumber).filter((item): item is number => item !== undefined);
  return numbers.length ? numbers : undefined;
}

export function sanitizeTokenRiskInput(raw: unknown): Partial<TokenRiskInput> {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...input };

  for (const key of [
    "rank",
    "currentPrice",
    "athPrice",
    "marketCap",
    "fdv",
    "liquidityUsd",
    "volume24h",
    "averageVolume7d",
    "priceChange1h",
    "priceChange6h",
    "priceChange24h",
    "priceChange7d",
    "priceChange14d",
    "priceChange30d",
    "buys24h",
    "sells24h",
    "top10HolderPercent",
    "holderCount",
    "orderBookDepthDropPercent",
    "simulatedSlippage10k",
    "bidAskImbalancePercent",
    "circulatingSupply",
    "totalSupply",
    "maxSupply",
    "buyTaxPercentage",
    "sellTaxPercentage",
  ]) {
    if (key in normalized) normalized[key] = normalizeNumber(normalized[key]);
  }

  if ("sparkline7d" in normalized) normalized.sparkline7d = normalizeArrayNumbers(normalized.sparkline7d);

  return normalized as Partial<TokenRiskInput>;
}

export function validateTokenRiskInput(raw: unknown): DataBackboneValidationResult<TokenRiskInput> {
  const sanitized = sanitizeTokenRiskInput(raw);
  const parsed = tokenRiskInputSchema.safeParse(sanitized);

  if (!parsed.success) {
    return {
      ok: false,
      data: null,
      warnings: parsed.error.issues.map((issue: { path: Array<string | number>; message: string }) => `${issue.path.join(".") || "root"}: ${issue.message}`),
      error: "Token risk input failed data-backbone validation.",
    };
  }

  const warnings: string[] = [];
  if (!parsed.data.currentPrice) warnings.push("currentPrice missing");
  if (!parsed.data.marketCap && !parsed.data.fdv) warnings.push("marketCap/fdv missing");
  if (!parsed.data.liquidityUsd) warnings.push("liquidityUsd missing");
  if (!parsed.data.dataSources?.length) warnings.push("dataSources missing");

  return { ok: true, data: parsed.data as TokenRiskInput, warnings };
}

export function assertTokenRiskInput(raw: unknown): TokenRiskInput {
  const result = validateTokenRiskInput(raw);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export const envSchema = z.object({
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(10).optional(),
  ETHERSCAN_API_KEY: z.string().min(6).optional(),
  ALCHEMY_API_KEY: z.string().min(6).optional(),
  COINGECKO_API_KEY: z.string().min(6).optional(),
}).passthrough();

export function validateRuntimeEnv(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(env);
  return {
    ok: parsed.success,
    warnings: parsed.success ? [] : parsed.error.issues.map((issue: { path: Array<string | number>; message: string }) => `${issue.path.join(".")}: ${issue.message}`),
    configured: {
      supabase: Boolean(env.SUPABASE_SERVICE_ROLE_KEY && (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL)),
      upstash: Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
      etherscan: Boolean(env.ETHERSCAN_API_KEY),
      alchemy: Boolean(env.ALCHEMY_API_KEY),
      coingecko: Boolean(env.COINGECKO_API_KEY),
      walletConnect: Boolean(env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID),
    },
  };
}
