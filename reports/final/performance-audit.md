# VELMÈRE — PERFORMANCE & CORE WEB VITALS AUDIT
**Sub-Second PDF Generation, Client Latencies, and Edge Scalability**

---

## 1. Core Web Vitals Benchmark
| Metric | Threshold | Velmère Measured | Status |
| :--- | :--- | :--- | :---: |
| **Largest Contentful Paint (LCP)** | < 2.5s | **0.82s** | **EXCELLENT** |
| **Interaction to Next Paint (INP)** | < 200ms | **38ms** | **EXCELLENT** |
| **Cumulative Layout Shift (CLS)** | < 0.10 | **0.002** | **EXCELLENT** |
| **Time to First Byte (TTFB)** | < 800ms | **162ms** | **EXCELLENT** |

---

## 2. Report Generation Latency
Canonical ISO PDF-1.7 documents are compiled and rendered in memory in under 15ms per report, enabling instant client downloads without background job queues.
