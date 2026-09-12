"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, XCircle, Loader2 } from "lucide-react";

export default function StripePopupCallbackPage() {
  const searchParams = useSearchParams();
  const statusHint = searchParams.get("status") || "returned";
  const tier = searchParams.get("tier") || "pro";
  const serviceType = searchParams.get("serviceType") || "analysis";
  const sessionId = searchParams.get("session_id") || "";

  const isCancelled = statusHint === "cancelled";
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    // This page is not payment authority. It only tells the opener that the
    // browser returned from Stripe. The opener must verify the exact session,
    // authenticated account, product/target and current payment state server-side.
    if (typeof window !== "undefined" && window.opener) {
      try {
        window.opener.postMessage(
          {
            type: isCancelled
              ? "VELMERE_STRIPE_PAYMENT_CANCELLED"
              : "VELMERE_STRIPE_CHECKOUT_RETURNED",
            tier,
            serviceType,
            sessionId,
            statusHint,
            entitlementGranted: false,
          },
          window.location.origin,
        );
      } catch (e) {
        console.warn("Could not postMessage checkout return to opener:", e);
      }

      const timer = setTimeout(() => {
        try {
          window.close();
          setClosed(true);
        } catch (e) {
          console.warn("Could not close popup window:", e);
        }
      }, 900);

      return () => clearTimeout(timer);
    }
  }, [isCancelled, tier, serviceType, sessionId, statusHint]);

  const handleManualClose = () => {
    try {
      window.close();
    } catch {
      // Browser may refuse scripted close; no authority state is changed here.
    }
  };

  return (
    <div className="min-h-screen bg-[#061016] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0a1820]/95 p-8 shadow-2xl backdrop-blur-xl">
        {!isCancelled ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-300">
              <ShieldCheck className="h-9 w-9" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Powrót z płatności otrzymany
            </h1>
            <p className="text-sm text-white/70 mb-6">
              Sesja dla poziomu <span className="font-semibold text-sky-300 uppercase">{tier}</span> musi zostać jeszcze potwierdzona po stronie serwera. Ten ekran nie aktywuje licencji ani dostępu.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-white/50 mb-6 bg-white/[0.03] py-2 px-4 rounded-lg border border-white/5 font-mono">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />
              <span>Oczekiwanie na niezależną weryfikację serwerową...</span>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <XCircle className="h-9 w-9" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Płatność anulowana
            </h1>
            <p className="text-sm text-white/70 mb-6">
              Nie przyznano żadnego uprawnienia ani dostępu.
            </p>
          </>
        )}

        <button
          onClick={handleManualClose}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all"
        >
          {closed ? "Okno zamknięte" : "Zamknij to okno"}
        </button>
      </div>
    </div>
  );
}
