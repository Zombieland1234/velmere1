#!/usr/bin/env node
import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, value) { fs.writeFileSync(file, value); }
function mustReplace(src, from, to, label) {
  if (!src.includes(from)) throw new Error(`paid_authz_patch_anchor_missing:${label}`);
  return src.replace(from, to);
}

// Shield / Real Markets paid analysis UI
{
  const file = "components/market-integrity/AnalysisCardsSection.tsx";
  let src = read(file);
  src = mustReplace(src,
`  // Paid gating: Basic is unlocked by default, Pro and Advanced synced on client mount
  const [unlockedTiers, setUnlockedTiers] = useState<Set<string>>(() => new Set(["basic"]));

  useEffect(() => {
    try {
      const saved = localStorage.getItem("velmere_unlocked_tiers");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setUnlockedTiers(new Set(["basic", ...parsed]));
        }
      }
    } catch {}
  }, []);`,
`  // Paid entitlement is memory-only here. Browser storage is never authorization evidence.
  // A paid tier is unlocked only after the server confirms the active checkout session.
  const [unlockedTiers, setUnlockedTiers] = useState<Set<string>>(() => new Set(["basic"]));`,
"analysiscards_remove_localstorage_authority");

  src = mustReplace(src,
`  // Helper to permanently unlock and persist a tier
  const unlockAndSave = (tier: string) => {
    setUnlockedTiers((prev) => {
      const next = new Set([...prev, tier]);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("velmere_unlocked_tiers", JSON.stringify([...next]));
        } catch {}
      }
      return next;
    });
  };`,
`  // Current-session UX state only. Server verification remains the authority.
  const unlockCurrentSession = (tier: string) => {
    setUnlockedTiers((prev) => new Set([...prev, tier]));
  };`,
"analysiscards_memory_only_unlock");
  src = src.split("unlockAndSave(").join("unlockCurrentSession(");

  src = mustReplace(src,
`    if (paymentStatus === "success" && (tierParam === "pro" || tierParam === "advanced")) {
      unlockCurrentSession(tierParam);
      setStripeSuccessNotification(
        \`🎉 Płatność Stripe powiodła się! Licencja analityczna \${tierParam.toUpperCase()} (\${tierParam === "pro" ? "14.99 €" : "149.99 €"}) została pomyślnie aktywowana.\`
      );
      // Clean query params so refresh doesn't replay
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      // Automatically trigger the authentic shield analysis
      setTimeout(() => {
        triggerAnalysis(tierParam);
      }, 100);
    } else if (paymentStatus === "cancelled") {`,
`    if (paymentStatus === "success" && (tierParam === "pro" || tierParam === "advanced")) {
      // A URL query parameter is not payment evidence. Do not unlock from it.
      setStripeSuccessNotification("Powrót z płatności odebrany. Dostęp zostanie aktywowany wyłącznie po serwerowej weryfikacji sesji Stripe.");
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    } else if (paymentStatus === "cancelled") {`,
"analysiscards_query_not_payment_evidence");

  src = mustReplace(src,
`  // Instant unlock for BETA / demo testing
  const handleUnlockTierBeta = (tier: "pro" | "advanced") => {
    unlockCurrentSession(tier);
    setPaywallModal(null);
    triggerAnalysis(tier);
  };`,
`  // Production fail-closed boundary: no client-only beta unlock for paid tiers.
  const handleUnlockTierBeta = (_tier: "pro" | "advanced") => {
    setStripeError("Bezpośrednie odblokowanie testowe jest wyłączone. Wymagana jest zweryfikowana sesja płatności.");
  };`,
"analysiscards_disable_beta_unlock");

  src = mustReplace(src,
`    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "VELMERE_STRIPE_PAYMENT_SUCCESS") {
        if (!event.data.sessionId || event.data.sessionId === sessionId) {
          completePaymentSuccess(tier);
        }
      } else if (event.data?.type === "VELMERE_STRIPE_PAYMENT_CANCELLED") {
        setStripeError("Płatność została anulowana.");
        setStripePopupState(null);
      }
    };`,
`    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popupWindow) return;
      if (event.data?.sessionId !== sessionId) return;
      if (event.data?.type === "VELMERE_STRIPE_PAYMENT_SUCCESS") {
        completePaymentSuccess(tier);
      } else if (event.data?.type === "VELMERE_STRIPE_PAYMENT_CANCELLED") {
        setStripeError("Płatność została anulowana.");
        setStripePopupState(null);
      }
    };`,
"analysiscards_strict_postmessage");
  write(file, src);
}

// Smart Contract Audit paid UI
{
  const file = "components/security/SecurityAuditsCleanPage.tsx";
  let src = read(file);
  src = mustReplace(src,
`  useEffect(() => {
    try {
      const saved = localStorage.getItem("velmere_unlocked_audit_tiers");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setUnlockedAuditTiers(new Set(["basic", ...parsed]));
        }
      }
    } catch {}
  }, []);

  const unlockAuditTierAndSave = (tier: "pro" | "advanced") => {
    setUnlockedAuditTiers((prev) => {
      const next = new Set(prev);
      next.add(tier);
      try {
        localStorage.setItem("velmere_unlocked_audit_tiers", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };`,
`  // Browser storage is never authorization evidence. Keep only current-session UX state
  // after the server has verified the active checkout session.
  const unlockAuditTierForCurrentSession = (tier: "pro" | "advanced") => {
    setUnlockedAuditTiers((prev) => new Set([...prev, tier]));
  };`,
"audit_remove_localstorage_authority");
  src = src.split("unlockAuditTierAndSave(").join("unlockAuditTierForCurrentSession(");

  src = mustReplace(src,
`    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "VELMERE_STRIPE_PAYMENT_SUCCESS") {
        if (!event.data.sessionId || event.data.sessionId === sessionId) {
          completeAuditPaymentSuccess(tier);
        }
      } else if (event.data?.type === "VELMERE_STRIPE_PAYMENT_CANCELLED") {
        setAuditStripeError("Płatność została anulowana.");
        setAuditStripePopupState(null);
      }
    };`,
`    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popupWindow) return;
      if (event.data?.sessionId !== sessionId) return;
      if (event.data?.type === "VELMERE_STRIPE_PAYMENT_SUCCESS") {
        completeAuditPaymentSuccess(tier);
      } else if (event.data?.type === "VELMERE_STRIPE_PAYMENT_CANCELLED") {
        setAuditStripeError("Płatność została anulowana.");
        setAuditStripePopupState(null);
      }
    };`,
"audit_strict_postmessage");

  src = mustReplace(src,
`    setTimeout(() => setGenerationStep(2), 380);
    setTimeout(() => setGenerationStep(3), 760);
    setTimeout(() => setGenerationStep(4), 1140);
    setTimeout(() => {
      window.location.assign(
        \`/\${localeKey}/security/audits/report/\${encodeURIComponent(targetAddress)}?address=\${encodeURIComponent(targetAddress)}&tier=\${encodeURIComponent(tierToRun)}&chainId=\${encodeURIComponent(selectedChainId)}\${bytecodeParam}\`
      );
    }, 1550);

    try {`,
`    setTimeout(() => setGenerationStep(2), 380);
    setTimeout(() => setGenerationStep(3), 760);
    setTimeout(() => setGenerationStep(4), 1140);

    try {`,
"audit_remove_preverification_redirect");

  src = mustReplace(src,
`          tier: selectedTier,`,
`          tier: tierToRun,`,
"audit_request_uses_explicit_tier");
  src = mustReplace(src,
`        if (accountOwned) rememberAuditCaseRef(payload.case.caseRef, { tier: selectedTier });
        setIntakeMessage(\`\${statusMessage}\${durable ? "" : \` \${t.localOnly}\`}\${accountOwned ? "" : \` \${t.anonymousBasic}\`}\`);
        setStaged(true);
        setIntakeState("success");
      }
    } catch {
      // Background intake error handled silently as client continues to canonical report
    }
  };`,
`        if (accountOwned) rememberAuditCaseRef(payload.case.caseRef, { tier: tierToRun });
        setIntakeMessage(\`\${statusMessage}\${durable ? "" : \` \${t.localOnly}\`}\${accountOwned ? "" : \` \${t.anonymousBasic}\`}\`);
        setStaged(true);
        setIntakeState("success");
        window.location.assign(
          \`/\${localeKey}/security/audits/report/\${encodeURIComponent(targetAddress)}?address=\${encodeURIComponent(targetAddress)}&tier=\${encodeURIComponent(tierToRun)}&chainId=\${encodeURIComponent(selectedChainId)}\${bytecodeParam}\`
        );
        return;
      }
      setIntakeState("idle");
      setIntakeMessage(payload.error || "Audit intake was not authorized by the server.");
      if (tierToRun !== "basic") setAuditPaywallModal(tierToRun);
    } catch {
      setIntakeState("idle");
      setIntakeMessage("Audit intake verification failed. No report was opened.");
      if (tierToRun !== "basic") setAuditPaywallModal(tierToRun);
    } finally {
      setIsGenerating(false);
    }
  };`,
"audit_redirect_only_after_server_intake");
  write(file, src);
}

// Asset drawer paid analysis had an unconditional client bypass before the existing stop-sell/token gate.
{
  const file = "components/market-integrity/AssetDetailModal.tsx";
  let src = read(file);
  src = mustReplace(src,
`    // Allow user to execute Pro and Advanced analysis directly
    startLocalAnalysis(tier);
    return;

    const pass35PaidUiStopSell = paidAnalysisUiStopSell(data, paidTier);`,
`    const pass35PaidUiStopSell = paidAnalysisUiStopSell(data, paidTier);`,
"assetdetail_remove_paid_bypass");
  write(file, src);
}

const receipt = {
  schemaVersion: "velmere.r10.paid-authz-remediation.v1",
  classification: "CURRENT_GIT_PATCH_PENDING_VERIFICATION",
  changes: [
    "remove_browser_storage_as_paid_authority",
    "reject_query_param_as_payment_evidence",
    "disable_client_beta_paid_unlock",
    "require_same_origin_same_popup_exact_session_postmessage",
    "remove_asset_detail_unconditional_paid_bypass",
    "redirect_audit_report_only_after_server_intake_success",
  ],
  productionCredit: false,
};
fs.mkdirSync("artifacts/r10/paid-authz", { recursive: true });
fs.writeFileSync("artifacts/r10/paid-authz/PATCH_RECEIPT.json", JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
