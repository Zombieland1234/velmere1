# Velmère P33 — AI interaction transparency internal scope memo

**State:** `INTERNAL_DRAFT / PROFESSIONAL_LEGAL_CREDIT = 0 / GO_PAID_BLOCKING_REVIEW_OPEN`  
**Applies to:** Angel, VLM Brain, any customer-facing generative or agentic workflow.  
**Current authority:** current SOURCE_ONLY + canonical finish methodology.  

## 1. Product fact pattern

Angel is a customer-facing AI interaction. The current floating surface is restricted to the Basic evidence-safe lane and does not receive authority to grant entitlements, execute trades, move funds, change account rights, or create provider/data truth.

The customer surface must disclose, before substantive interaction, that:

1. the user is interacting with an AI system;
2. the system can make mistakes;
3. outputs are evidence-bound informational decision support;
4. outputs are not personalized investment or legal advice;
5. missing, stale, conflicting, or unavailable evidence can limit the answer.

## 2. Current P33 implementation

The Angel panel includes a visible PL/EN/DE disclosure with semantic markers:

- `data-ai-interaction-disclosure="visible"`
- `data-angel-product-boundary="informational-decision-support"`
- overlay mode `evidence-bound-basic`
- `aiInteraction="disclosed"`

Internal numbered PASS topology and hidden proof rails were removed from the Angel customer DOM.

## 3. Required technical controls

- Disclosure must be visible without opening a secondary legal page.
- Server authorization must remain independent of model output.
- The model cannot create entitlement, provider rights, truth state, or customer action authority.
- Tool use must be allowlisted and bounded.
- Public output must retain `UNAVAILABLE`, `CONFLICTED`, `REAL_STALE`, and abstention states.
- Prompt injection, system-prompt leakage, sensitive-output handling, excessive agency, and unbounded-consumption tests remain mandatory.
- Customer-visible disclosure parity must be tested in PL/EN/DE.
- Any change from informational Q&A toward automated action requires a new applicability review and a new release contract.

## 4. Evidence and receipts required before controlled pilot

- current-byte screenshot/DOM receipt showing the visible disclosure;
- accessibility receipt proving the disclosure is exposed to assistive technology;
- current Angel public-schema receipt;
- prompt-injection and excessive-agency campaign receipt;
- retention/privacy classification for conversation history and memory;
- internal applicability decision signed by the release owner.

## 5. Evidence required before GO_PAID

- professional legal review of the actual paid Angel scope and customer contract;
- final terms/privacy/retention alignment;
- evidence that marketing copy matches actual system behavior;
- a real-customer protocol measuring comprehension, false trust, utility, and negative evidence;
- no unsupported claim that a disclaimer alone changes regulatory classification.

## 6. Stop conditions

`GO_PAID` remains blocked if the disclosure is absent, hidden, localized inconsistently, contradicted by marketing, or if the product behaves like personalized advice despite informational wording.
