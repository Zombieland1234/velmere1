/**
 * Forensic Validation Furnace - Field Dictionary & Semantic Schema
 * Comprehensive definition of every displayable field across the 4 surfaces.
 * Enforces classification rules: DIRECT_FACT, DERIVED_FACT, CALCULATED, HEURISTIC, etc.
 */

import { ForensicSurface, ForensicTier, FieldClassification } from "./types";

export interface FieldDefinition {
  fieldId: string;
  fieldName: string;
  surface: ForensicSurface;
  defaultUnit: string;
  classification: FieldClassification;
  requiredTier: ForensicTier;
  toleranceRule?: string;
  description: string;
}

export const SURFACE_FIELD_DICTIONARY: Record<ForensicSurface, FieldDefinition[]> = {
  browser: [
    { fieldId: "contract_address", fieldName: "Contract / Asset Address", surface: "browser", defaultUnit: "hex/id", classification: "DIRECT_FACT", requiredTier: "basic", description: "Cryptographic identifier of the contract or native ledger identifier." },
    { fieldId: "contract_name", fieldName: "Contract / Asset Name", surface: "browser", defaultUnit: "string", classification: "DIRECT_FACT", requiredTier: "basic", description: "Official declared name of the contract or asset." },
    { fieldId: "token_symbol", fieldName: "Token Symbol", surface: "browser", defaultUnit: "ticker", classification: "DIRECT_FACT", requiredTier: "basic", description: "Primary ticker symbol resolved from ABI or registry." },
    { fieldId: "token_type", fieldName: "Token / Contract Standard", surface: "browser", defaultUnit: "standard", classification: "DIRECT_FACT", requiredTier: "basic", description: "Interface standard (ERC-20, Router, Native, Equity)." },
    { fieldId: "network", fieldName: "Network / Chain", surface: "browser", defaultUnit: "network", classification: "DIRECT_FACT", requiredTier: "basic", description: "Execution layer or exchange venue where asset resides." },
    { fieldId: "chain_id", fieldName: "Chain ID / Venue Identifier", surface: "browser", defaultUnit: "id", classification: "DIRECT_FACT", requiredTier: "basic", description: "EVM chain ID or market MIC code." },
    { fieldId: "compiler_version", fieldName: "Compiler / Source Version", surface: "browser", defaultUnit: "semver", classification: "DIRECT_FACT", requiredTier: "basic", description: "Solidity/Vyper compiler version or trading engine version." },
    { fieldId: "proxy_pattern", fieldName: "Proxy / Upgradability Pattern", surface: "browser", defaultUnit: "pattern", classification: "DERIVED_FACT", requiredTier: "basic", description: "Detected upgrade pattern (EIP-1967, Transparent, UUPS, Custom, Immutable)." },
    { fieldId: "risk_score", fieldName: "Canonical Risk Score", surface: "browser", defaultUnit: "points (0-100)", classification: "CALCULATED", requiredTier: "basic", toleranceRule: "exact_formula_match", description: "0-100 composite risk score where 0=Safe, 100=Critical Risk." },
    { fieldId: "risk_severity_label", fieldName: "Risk Verdict Severity", surface: "browser", defaultUnit: "label", classification: "DERIVED_FACT", requiredTier: "basic", description: "LOW, MEDIUM, HIGH, or CRITICAL label based on score bracket." },
    { fieldId: "confidence_score", fieldName: "Confidence Score", surface: "browser", defaultUnit: "percent (0-100)", classification: "CALCULATED", requiredTier: "basic", toleranceRule: "exact_formula_match", description: "Confidence based on provider availability and evidence quorum." },
    { fieldId: "evidence_coverage", fieldName: "Evidence Coverage", surface: "browser", defaultUnit: "percent (0-100)", classification: "CALCULATED", requiredTier: "basic", toleranceRule: "exact_formula_match", description: "Percentage of audit verification dimensions evaluated." },
    { fieldId: "finding_count", fieldName: "Total Security Findings", surface: "browser", defaultUnit: "count", classification: "CALCULATED", requiredTier: "basic", description: "Total distinct security vulnerabilities and informational findings identified." },
    { fieldId: "critical_findings", fieldName: "Critical Findings Count", surface: "browser", defaultUnit: "count", classification: "CALCULATED", requiredTier: "basic", description: "Number of critical severity findings." },
    { fieldId: "high_findings", fieldName: "High Findings Count", surface: "browser", defaultUnit: "count", classification: "CALCULATED", requiredTier: "basic", description: "Number of high severity findings." },
    { fieldId: "medium_findings", fieldName: "Medium Findings Count", surface: "browser", defaultUnit: "count", classification: "CALCULATED", requiredTier: "basic", description: "Number of medium severity findings." },
    { fieldId: "low_findings", fieldName: "Low Findings Count", surface: "browser", defaultUnit: "count", classification: "CALCULATED", requiredTier: "basic", description: "Number of low severity findings." },
    { fieldId: "info_findings", fieldName: "Informational Findings Count", surface: "browser", defaultUnit: "count", classification: "CALCULATED", requiredTier: "basic", description: "Number of informational findings." },
    { fieldId: "multisig_threshold", fieldName: "Governance Multisig Threshold", surface: "browser", defaultUnit: "ratio (M-of-N)", classification: "DERIVED_FACT", requiredTier: "pro", description: "Required signatures for administrative transaction execution." },
    { fieldId: "timelock_delay", fieldName: "Timelock Execution Delay", surface: "browser", defaultUnit: "seconds/hours", classification: "DERIVED_FACT", requiredTier: "pro", description: "Mandatory time buffer before privileged actions take effect." },
    { fieldId: "admin_address", fieldName: "Privileged Owner / Admin", surface: "browser", defaultUnit: "hex/entity", classification: "DIRECT_FACT", requiredTier: "pro", description: "Resolved address holding administrative powers or owner role." },
    { fieldId: "upgrade_authority", fieldName: "Upgrade Implementation Authority", surface: "browser", defaultUnit: "hex/entity", classification: "DERIVED_FACT", requiredTier: "pro", description: "Entity permitted to redirect proxy implementation slot." },
    { fieldId: "circulating_supply", fieldName: "Circulating Token Supply", surface: "browser", defaultUnit: "tokens", classification: "DIRECT_FACT", requiredTier: "pro", description: "Total tokens in active circulation excluding provably burned balances." },
    { fieldId: "dex_liquidity_depth", fieldName: "DEX Liquidity Depth", surface: "browser", defaultUnit: "USD", classification: "CALCULATED", requiredTier: "pro", description: "Cumulative pool reserves across automated market makers." },
    { fieldId: "cex_reserve_ratio", fieldName: "CEX Custody Reserve Ratio", surface: "browser", defaultUnit: "percent", classification: "ESTIMATE", requiredTier: "pro", description: "Estimated share of circulating supply held in centralized custody." },
    { fieldId: "top10_concentration", fieldName: "Top 10 Holder Concentration", surface: "browser", defaultUnit: "percent", classification: "CALCULATED", requiredTier: "pro", description: "Cumulative percentage held by top 10 non-contract wallets." },
    { fieldId: "reentrancy_guard_present", fieldName: "Reentrancy Protection", surface: "browser", defaultUnit: "boolean", classification: "DERIVED_FACT", requiredTier: "pro", description: "Verification of nonReentrant mutex modifiers or transient storage guards." },
    { fieldId: "oracle_deviation_risk", fieldName: "Oracle Deviation Vulnerability", surface: "browser", defaultUnit: "bps", classification: "HEURISTIC", requiredTier: "pro", description: "Susceptibility to spot manipulation or stale heartbeat attacks." },
    { fieldId: "storage_slot_collisions", fieldName: "Storage Slot Collision Scan", surface: "browser", defaultUnit: "count", classification: "DERIVED_FACT", requiredTier: "advanced", description: "Detected variable collisions across proxy upgrade lineages." },
    { fieldId: "bytecode_semantic_diff", fieldName: "Bytecode Semantic Diff Hash", surface: "browser", defaultUnit: "sha256", classification: "DERIVED_FACT", requiredTier: "advanced", description: "Normalized opcode difference against verified canonical source compilation." },
    { fieldId: "fuzzing_invariant_pass_rate", fieldName: "Fuzzing Invariant Pass Rate", surface: "browser", defaultUnit: "percent", classification: "CALCULATED", requiredTier: "advanced", description: "Pass rate across stateful invariant fuzzing campaigns." },
    { fieldId: "auditor_attestation_state", fieldName: "Auditor Attestation Seal", surface: "browser", defaultUnit: "state", classification: "DIRECT_FACT", requiredTier: "advanced", description: "Cryptographic human auditor verification signature." },
    { fieldId: "auditor_signature_validity", fieldName: "PKI Digital Signature", surface: "browser", defaultUnit: "status", classification: "DIRECT_FACT", requiredTier: "advanced", description: "Validity of secp256k1 / ed25519 auditor signature." },
    { fieldId: "pki_rfc3161_timestamp", fieldName: "RFC 3161 Qualified Timestamp", surface: "browser", defaultUnit: "iso8601", classification: "DIRECT_FACT", requiredTier: "advanced", description: "Independent time-stamp authority cryptographic token." },
    { fieldId: "disclaimer_present", fieldName: "Regulatory / Risk Disclaimer", surface: "browser", defaultUnit: "boolean", classification: "DIRECT_FACT", requiredTier: "basic", description: "Statutory disclaimer present in document." }
  ],
  shield: [
    { fieldId: "overall_threat_score", fieldName: "Overall Threat Score", surface: "shield", defaultUnit: "points (0-100)", classification: "CALCULATED", requiredTier: "basic", description: "Real-time computed composite threat level." },
    { fieldId: "threat_level", fieldName: "Threat Level Category", surface: "shield", defaultUnit: "enum", classification: "DERIVED_FACT", requiredTier: "basic", description: "SECURE, WATCH, ELEVATED, or HIGH RISK." },
    { fieldId: "sanctions_check", fieldName: "OFAC / Global Sanctions Screening", surface: "shield", defaultUnit: "status", classification: "DIRECT_FACT", requiredTier: "basic", description: "Screening against OFAC SDN, UK HM Treasury, and EU sanctions lists." },
    { fieldId: "blackhole_tax_rate", fieldName: "Transfer Tax / Fee Rate", surface: "shield", defaultUnit: "percent", classification: "CALCULATED", requiredTier: "basic", description: "Tax deducted upon transfer, buy, or sell transactions." },
    { fieldId: "honeypot_status", fieldName: "Honeypot Simulation Verdict", surface: "shield", defaultUnit: "verdict", classification: "HEURISTIC", requiredTier: "basic", description: "Dry-run swap simulation testing if tokens can be resold." },
    { fieldId: "mint_authority_status", fieldName: "Arbitrary Mint Privilege", surface: "shield", defaultUnit: "status", classification: "DERIVED_FACT", requiredTier: "basic", description: "Detection of functions capable of minting tokens without collateral." },
    { fieldId: "ownership_renounced", fieldName: "Ownership Renouncement State", surface: "shield", defaultUnit: "boolean", classification: "DERIVED_FACT", requiredTier: "basic", description: "Whether owner address is 0x0 or dead address." },
    { fieldId: "transfer_pausable", fieldName: "Global Transfer Pausable Flag", surface: "shield", defaultUnit: "boolean", classification: "DERIVED_FACT", requiredTier: "basic", description: "Whether trading can be unilaterally frozen by admin." },
    { fieldId: "verified_source_status", fieldName: "Source Verification Integrity", surface: "shield", defaultUnit: "status", classification: "DIRECT_FACT", requiredTier: "basic", description: "Verified source code matching on-chain bytecode." },
    { fieldId: "reputation_score", fieldName: "Community Reputation Index", surface: "shield", defaultUnit: "points (0-100)", classification: "HEURISTIC", requiredTier: "basic", description: "Synthesized score from historical reports, holder flags, and scams." },
    { fieldId: "incident_history_count", fieldName: "Past Security Incidents", surface: "shield", defaultUnit: "count", classification: "DIRECT_FACT", requiredTier: "basic", description: "Number of documented exploits or security emergencies in database." },
    { fieldId: "active_exploit_vector", fieldName: "Active Exploit Alert", surface: "shield", defaultUnit: "boolean", classification: "DERIVED_FACT", requiredTier: "basic", description: "Flag indicating zero-day or active mempool drain in progress." },
    { fieldId: "last_security_event", fieldName: "Last Security Event Timestamp", surface: "shield", defaultUnit: "iso8601", classification: "DIRECT_FACT", requiredTier: "basic", description: "Timestamp of latest audited change or incident." },
    { fieldId: "primary_security_provider", fieldName: "Primary Security Feed Provider", surface: "shield", defaultUnit: "provider_id", classification: "DIRECT_FACT", requiredTier: "basic", description: "Name of the primary intelligence source." },
    { fieldId: "provider_quorum_state", fieldName: "Provider Quorum State", surface: "shield", defaultUnit: "status", classification: "DERIVED_FACT", requiredTier: "basic", description: "Whether minimum 2 independent provider quorum was reached." },
    { fieldId: "delivery_latency_ms", fieldName: "Feed Delivery Latency", surface: "shield", defaultUnit: "milliseconds", classification: "DIRECT_FACT", requiredTier: "basic", description: "Latency from provider ingress to shield client display." }
  ],
  shield_pro: [
    { fieldId: "calibrated_confidence_score", fieldName: "Calibrated Confidence Score", surface: "shield_pro", defaultUnit: "percent (0-100)", classification: "CALCULATED", requiredTier: "pro", description: "Bayesian calibrated confidence combining provider quorum and coverage." },
    { fieldId: "confidence_interval_lower", fieldName: "Confidence Interval Lower Bound (95%)", surface: "shield_pro", defaultUnit: "points", classification: "CALCULATED", requiredTier: "pro", description: "Lower boundary of statistical 95% confidence interval." },
    { fieldId: "confidence_interval_upper", fieldName: "Confidence Interval Upper Bound (95%)", surface: "shield_pro", defaultUnit: "points", classification: "CALCULATED", requiredTier: "pro", description: "Upper boundary of statistical 95% confidence interval." },
    { fieldId: "epistemic_uncertainty", fieldName: "Epistemic Uncertainty (Model/Data Gap)", surface: "shield_pro", defaultUnit: "bps", classification: "ESTIMATE", requiredTier: "pro", description: "Uncertainty due to missing data or unverified bytecode." },
    { fieldId: "aleatoric_risk", fieldName: "Aleatoric Risk (Market Stochasticity)", surface: "shield_pro", defaultUnit: "bps", classification: "ESTIMATE", requiredTier: "pro", description: "Inherent stochastic volatility and liquidity variance." },
    { fieldId: "orderbook_slippage_100k", fieldName: "Simulated Slippage ($100k Order)", surface: "shield_pro", defaultUnit: "percent", classification: "CALCULATED", requiredTier: "pro", description: "Calculated price impact for a $100,000 market sell order." },
    { fieldId: "market_depth_bid_ask", fieldName: "2% Market Depth Ratio", surface: "shield_pro", defaultUnit: "ratio", classification: "CALCULATED", requiredTier: "pro", description: "Ratio of bid liquidity to ask liquidity within +/-2% of mid." },
    { fieldId: "liquidity_lock_expiry", fieldName: "LP Token Lock Expiration", surface: "shield_pro", defaultUnit: "timestamp/status", classification: "DIRECT_FACT", requiredTier: "pro", description: "Verifiable unlock date in Unicrypt/TeamFinance locker or burn." },
    { fieldId: "lp_token_burn_ratio", fieldName: "LP Burned / Permanently Locked", surface: "shield_pro", defaultUnit: "percent", classification: "CALCULATED", requiredTier: "pro", description: "Percentage of pool LP tokens sent to 0xdead or time-locked." },
    { fieldId: "whale_concentration_hhi", fieldName: "Whale Concentration HHI Index", surface: "shield_pro", defaultUnit: "index (0-10000)", classification: "CALCULATED", requiredTier: "pro", description: "Herfindahl-Hirschman Index of wallet balance distribution." },
    { fieldId: "governance_attack_vector", fieldName: "Governance Flash-Borrow Threat", surface: "shield_pro", defaultUnit: "status", classification: "DERIVED_FACT", requiredTier: "advanced", description: "Evaluation if proposal threshold can be bought via flash loans." },
    { fieldId: "flashloan_exploitability", fieldName: "Flashloan Reentrancy Exploitability", surface: "shield_pro", defaultUnit: "status", classification: "DERIVED_FACT", requiredTier: "advanced", description: "Mathematical proof of zero-risk atomic profit availability." },
    { fieldId: "mev_frontrun_vulnerability", fieldName: "MEV Sandwich / Front-run Surface", surface: "shield_pro", defaultUnit: "bps", classification: "HEURISTIC", requiredTier: "advanced", description: "Susceptibility of trade execution to searcher sandwich attacks." },
    { fieldId: "cross_chain_bridge_risk", fieldName: "Cross-Chain Relayer Risk", surface: "shield_pro", defaultUnit: "status", classification: "HEURISTIC", requiredTier: "advanced", description: "Dependency on off-chain relayers or multisig bridge validators." },
    { fieldId: "state_rollback_vulnerability", fieldName: "Reorg / Rollback Exposure", surface: "shield_pro", defaultUnit: "blocks", classification: "HEURISTIC", requiredTier: "advanced", description: "Reorganization depth needed to reverse finalized transactions." },
    { fieldId: "independent_evaluator_count", fieldName: "Independent Source Quorum Count", surface: "shield_pro", defaultUnit: "count", classification: "DIRECT_FACT", requiredTier: "advanced", description: "Number of distinct nodes / providers corroborating the security state." },
    { fieldId: "merkle_tree_root", fieldName: "State Commitment Merkle Root", surface: "shield_pro", defaultUnit: "hex32", classification: "DIRECT_FACT", requiredTier: "advanced", description: "Cryptographic root hash sealing all audit observations." },
    { fieldId: "reproducible_build_hash", fieldName: "Reproducible Compilation Hash", surface: "shield_pro", defaultUnit: "sha256", classification: "DIRECT_FACT", requiredTier: "advanced", description: "Byte-for-byte reproducible build artifact hash." }
  ],
  real_markets: [
    { fieldId: "instrument_id", fieldName: "Instrument Identifier", surface: "real_markets", defaultUnit: "id", classification: "DIRECT_FACT", requiredTier: "basic", description: "Canonical market ticker or security identifier." },
    { fieldId: "venue", fieldName: "Trading Venue / Exchange", surface: "real_markets", defaultUnit: "venue", classification: "DIRECT_FACT", requiredTier: "basic", description: "Registered primary market exchange (NASDAQ, NYSE, CME, Binance)." },
    { fieldId: "currency", fieldName: "Denomination Currency", surface: "real_markets", defaultUnit: "iso4217", classification: "DIRECT_FACT", requiredTier: "basic", description: "Base quote currency (USD, EUR, BNB)." },
    { fieldId: "current_price", fieldName: "Current Market Price", surface: "real_markets", defaultUnit: "currency_units", classification: "DIRECT_FACT", requiredTier: "basic", description: "Last traded price from primary reference feed." },
    { fieldId: "bid_price", fieldName: "Best Bid Price", surface: "real_markets", defaultUnit: "currency_units", classification: "DIRECT_FACT", requiredTier: "basic", description: "Highest active purchase offer on central orderbook." },
    { fieldId: "ask_price", fieldName: "Best Ask Price", surface: "real_markets", defaultUnit: "currency_units", classification: "DIRECT_FACT", requiredTier: "basic", description: "Lowest active sell offer on central orderbook." },
    { fieldId: "spread_bps", fieldName: "Bid-Ask Spread", surface: "real_markets", defaultUnit: "basis points (bps)", classification: "CALCULATED", requiredTier: "basic", description: "Spread between best ask and best bid in bps." },
    { fieldId: "daily_open", fieldName: "Session Opening Price", surface: "real_markets", defaultUnit: "currency_units", classification: "DIRECT_FACT", requiredTier: "basic", description: "Price at official session opening auction." },
    { fieldId: "daily_high", fieldName: "Session High Price", surface: "real_markets", defaultUnit: "currency_units", classification: "DIRECT_FACT", requiredTier: "basic", description: "Maximum price reached during active session." },
    { fieldId: "daily_low", fieldName: "Session Low Price", surface: "real_markets", defaultUnit: "currency_units", classification: "DIRECT_FACT", requiredTier: "basic", description: "Minimum price reached during active session." },
    { fieldId: "daily_close", fieldName: "Previous Session Close", surface: "real_markets", defaultUnit: "currency_units", classification: "DIRECT_FACT", requiredTier: "basic", description: "Official closing price of prior trading session." },
    { fieldId: "change_24h_percent", fieldName: "24-Hour Price Change", surface: "real_markets", defaultUnit: "percent", classification: "CALCULATED", requiredTier: "basic", description: "Percentage price change relative to previous close." },
    { fieldId: "volume_24h", fieldName: "24-Hour Trading Volume", surface: "real_markets", defaultUnit: "currency_units", classification: "DIRECT_FACT", requiredTier: "basic", description: "Total traded turnover in 24-hour window." },
    { fieldId: "vwap", fieldName: "Volume Weighted Average Price", surface: "real_markets", defaultUnit: "currency_units", classification: "CALCULATED", requiredTier: "pro", description: "Trading session VWAP benchmark." },
    { fieldId: "market_capitalization", fieldName: "Market Capitalization", surface: "real_markets", defaultUnit: "currency_units", classification: "CALCULATED", requiredTier: "pro", description: "Current price multiplied by total outstanding shares/supply." },
    { fieldId: "pe_ratio", fieldName: "Price-to-Earnings Ratio", surface: "real_markets", defaultUnit: "ratio", classification: "CALCULATED", requiredTier: "pro", description: "Share price divided by trailing 12-month EPS (for equities)." },
    { fieldId: "beta_coefficient", fieldName: "Market Beta (vs S&P500 / BTC)", surface: "real_markets", defaultUnit: "coefficient", classification: "CALCULATED", requiredTier: "pro", description: "Systematic covariance relative to benchmark index." },
    { fieldId: "implied_volatility_30d", fieldName: "30-Day Implied Volatility", surface: "real_markets", defaultUnit: "percent", classification: "CALCULATED", requiredTier: "advanced", description: "Annualized forward-looking volatility from option surfaces." },
    { fieldId: "sec_cik_or_lei", fieldName: "SEC CIK / Legal Entity Identifier", surface: "real_markets", defaultUnit: "identifier", classification: "DIRECT_FACT", requiredTier: "advanced", description: "Regulatory legal registry identifier." },
    { fieldId: "exchange_trading_state", fieldName: "Trading Halt / Circuit Breaker State", surface: "real_markets", defaultUnit: "status", classification: "DIRECT_FACT", requiredTier: "basic", description: "Trading state: ACTIVE, HALTED, AUCTION, or PREMARKET." },
    { fieldId: "data_as_of_timestamp", fieldName: "Data As Of Timestamp", surface: "real_markets", defaultUnit: "iso8601", classification: "DIRECT_FACT", requiredTier: "basic", description: "Timestamp of market data tick from exchange feed." },
    { fieldId: "price_freshness_seconds", fieldName: "Price Feed Freshness", surface: "real_markets", defaultUnit: "seconds", classification: "DIRECT_FACT", requiredTier: "basic", description: "Age of feed tick in seconds (must match FRESHNESS status)." },
    { fieldId: "primary_market_provider", fieldName: "Primary Market Feed Provider", surface: "real_markets", defaultUnit: "provider_id", classification: "DIRECT_FACT", requiredTier: "basic", description: "Feed provider providing current price." },
    { fieldId: "secondary_market_provider", fieldName: "Secondary Market Feed Provider", surface: "real_markets", defaultUnit: "provider_id", classification: "DIRECT_FACT", requiredTier: "pro", description: "Independent secondary feed corroborating market price." },
    { fieldId: "cross_provider_divergence_bps", fieldName: "Cross-Provider Divergence", surface: "real_markets", defaultUnit: "basis points (bps)", classification: "CALCULATED", requiredTier: "pro", description: "Divergence between primary and secondary feeds (must be <= 50 bps)." }
  ]
};
