# VELMERE AI READINESS MATRIX

| Element | Stan | Blocker |
|---|---|---|
| Centralny VLM output | częściowy | nie wszystkie surface używają jednego kontraktu |
| Gemini provider | zduplikowany | `vlm-brain.ts`, `lib/ai/gemini.ts`, `app/api/angel/route.ts` |
| Model registry | brak jednego źródła | wykryto trzy różne modele |
| Canonical fact packet | częściowy | Real Markets, Lens/PDF, Angel |
| Claim firewall | częściowy | pełny source enforcement i evals |
| Function calling | brak docelowy | tool registry, limity, schema |
| Memory | brak centralna | TTL, privacy, clear |
| Observability | częściowa | token usage, koszt, cache i fallback |
| Live Gemini | niezweryfikowany | prawdziwy klucz i Vercel |
