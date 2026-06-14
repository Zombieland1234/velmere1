"use client";

import { ReactNode, useMemo } from "react";
import { LockKeyhole, Wallet } from "lucide-react";
import { useWalletUiStore } from "@/store/useWalletUiStore";
import { useWalletConnect } from "@/lib/wallet/useWalletConnect";

type TokenGateProps = {
  children: ReactNode;
  required?: number;
  className?: string;
};

function readNumericBalance(label: string) {
  const match = label.replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : 0;
}

export default function TokenGate({ children, required = 10000, className = "" }: TokenGateProps) {
  const walletUi = useWalletUiStore();
  const wallet = useWalletConnect();
  const balance = useMemo(() => readNumericBalance(walletUi.tokenBalanceLabel), [walletUi.tokenBalanceLabel]);
  const hasAccess = walletUi.connected && balance >= required;

  return (
    <section className={`relative ${className}`} aria-live="polite">
      <div className={hasAccess ? "" : "select-none filter blur-[8px] grayscale pointer-events-none"}>
        {children}
      </div>
      {!hasAccess ? (
        <div className="absolute inset-0 z-20 flex items-start justify-center rounded-[1.5rem] border border-[#c8a96a]/[0.15] bg-[#050506]/[0.45] p-4 backdrop-blur-[1px] md:items-center md:p-8">
          <div className="w-full max-w-xl rounded-2xl border border-[#c8a96a]/[0.25] bg-[#1A1A1C]/[0.95] p-5 text-center shadow-2xl shadow-black/[0.50] md:p-7">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#c8a96a]/[0.30] bg-[#c8a96a]/[0.10] text-[#c8a96a]">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-4 break-words font-mono text-[10px] uppercase leading-6 tracking-[0.22em] text-[#c8a96a]">
              {"[ ENCRYPTED_ASSET ] // VLM ACCESS DENIED // BALANCE REQUIRED: "}{required.toLocaleString("en-US")}{" VLM"}
            </p>
            <p className="mt-3 text-xs leading-6 text-white/[0.50]">
              Wallet must hold the required VLM access balance. Public preview remains intentionally obscured until the access layer is satisfied.
            </p>
            <button
              type="button"
              onClick={() => void wallet.connectMetaMask()}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#c8a96a]/[0.30] bg-[#c8a96a]/[0.10] px-5 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#c8a96a] transition hover:bg-[#c8a96a]/[0.15] active:scale-95"
            >
              <Wallet className="h-4 w-4" aria-hidden="true" />
              [ CONNECT WALLET ]
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
