# VELMÈRE — COMPREHENSIVE VISUAL REGRESSION & DESIGN SYSTEM MATRIX

## 1. Executive Summary
This document establishes the institutional design token integrity, geometric alignment, and multi-surface visual consistency of the Velmère application suite across **Audit, Shield, Shield Pro, Real Markets, Browser, and Shield Map**.

---

## 2. Global Design System Specifications

| Token Dimension | Design Specification | Implementation Standard | Compliance Status |
| :--- | :--- | :--- | :---: |
| **Color Palette (Dark)** | Strict institutional monochrome (#07090b, #0d1117, #161b22, #21262d) | CSS variables / Tailwind utility classes | **VERIFIED PASS** |
| **Accent Hue** | Refined Champagne Gold (`#d8c49a` / `rgba(216, 196, 154, 0.85)`) | High-contrast indicator accents | **VERIFIED PASS** |
| **Typography** | Inter / JetBrains Mono (monospaced metrics and hashes) | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto` | **VERIFIED PASS** |
| **Border Radius** | 8px (inner tags), 12px (cards & inputs), 16px (major modals) | `rounded-lg`, `rounded-xl`, `rounded-2xl` | **VERIFIED PASS** |
| **Shadows & Depth** | Soft ambient dark elevation with 1px border stroke (`rgba(255, 255, 255, 0.08)`) | Layered elevation without muddy blur | **VERIFIED PASS** |
| **Spacing Rhythm** | 4px / 8px / 12px / 16px / 24px / 32px grid | Strict adherence across all containers | **VERIFIED PASS** |

---

## 3. Product Surface Visual Consistency Matrix

| Product Surface | Primary Container | Grid System | Chart Proportions | Modal Integration | Responsive 375px | Responsive 1440px | Alignment Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Security Audits** | Hero Control Bar + Tier Selection Cards | 3-Card Balanced Tier Grid | Vector SVG / Canvas QC | `HowRiskIsCalculatedModal` | Clean stack, no horizontal scroll | Symmetrical 1280px max-width | **ALIGNED & VERIFIED** |
| **Shield Dashboard** | Monitored Markets Hero + Threat Feed | Multi-column responsive grid | Real OHLC + Volume Strip | `AssetDetailModal` | Touch-optimized cards | 1440px grid spacing | **ALIGNED & VERIFIED** |
| **Shield Pro** | 6 Institutional Status Cards | Strict Symmetrical 6-Col Grid (`.shield-pro-v4608-status-grid`) | Real Sparklines + Micro-charts | `AssetDetailModal` + Scroll-Lock | 1-Col Stack | 6-Col Balanced Row | **ALIGNED & VERIFIED** |
| **Real Markets** | Cross-Asset Scanner (Equities, FX, Crypto) | Unified Data Table + Detail Pane | 24h/7d Canvas Candles | `AssetDetailModal` | Swipeable table view | Multi-column parity | **ALIGNED & VERIFIED** |
| **Browser / Lens** | Deep Protocol Research Scanner | 2-Column Split Pane (Metadata / Feed) | Interactive Canvas Kline | Pre-purchase gate modal | Single column tabbed | Dual inspection pane | **ALIGNED & VERIFIED** |
| **Shield Map** | Multi-chain Ecosystem Spatial Graph | Full-bleed interactive canvas/map | Chain liquidity bubbles | Asset Inspector Drawer | Bottom sheet modal | Centered canvas layout | **ALIGNED & VERIFIED** |

---

## 4. Modal Architecture & Scroll Lock Integrity (PASS 20 & 24)

All modals across the product utilize the institutional `useModalScrollLock` standard:
1. **Background Scroll Suppression**: Upon mount, `document.body.style.overflow = "hidden"` is locked and exact window scroll offset is memorized.
2. **Scroll Restoration**: Upon unmount, previous scroll offset is restored to the exact pixel coordinate.
3. **Internal Region Isolation**: Scrollable modal bodies are isolated with `data-modal-scroll-region="true"` and `overflow-y-auto`, preventing touch bleed-through to underlying pages.

---

## 5. Chart Engine V2 Visual Standards (PASS 19)

- **Zero Random Candles**: Before live provider data or sparkline arrive, zero synthetic or trigonometric placeholder candles are rendered.
- **Skeleton Shimmer State**: Visual placeholder consists of 12 pulsing translucent candle silhouettes (`animate-pulse`) with explicit `"Loading Market Data…"` feedback.
- **Aspect Ratio Integrity**: Canvas elements use device pixel ratio scaling (`window.devicePixelRatio || 1`) preventing blurry lines, pixelation, or slash-like distortions.
