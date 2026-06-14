"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import LuxuryActionModal from "@/components/ui/LuxuryActionModal";
import VlmAccessHeroVisual from "@/components/vlm/VlmAccessHeroVisual";
import VlmActionBar, { type VlmActionKey } from "@/components/vlm/VlmActionBar";
import VlmContractRegistrySidePanel from "@/components/vlm/VlmContractRegistrySidePanel";
import VlmHowToBuySidePanel from "@/components/vlm/VlmHowToBuySidePanel";
import VlmProtocolLabSidePanel from "@/components/vlm/VlmProtocolLabSidePanel";
import VlmTradeModalContent from "@/components/vlm/VlmTradeModalContent";
import VlmTradePreview from "@/components/vlm/VlmTradePreview";
import VlmWalletModalContent from "@/components/vlm/VlmWalletModalContent";
import LiveClock from "@/components/ui/LiveClock";
import { fadeUp } from "@/lib/motion";
import { SECTION_WIDE } from "@/lib/vlm/layout";

type ModalKey = VlmActionKey | null;

const statusChips = ["launchInterface", "evmFirst", "registryPending"] as const;

export default function VlmLaunchDashboard() {
  const t = useTranslations("VlmLaunchDashboard");
  const modals = useTranslations("VlmDashboardPanels");
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  const closeModal = () => setActiveModal(null);

  return (
    <>
      <section className={`${SECTION_WIDE} scroll-mt-28 py-10 md:py-14 lg:py-16`}>
        <div className="mb-6 px-2 md:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">{t("kicker")}</p>
            <LiveClock className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/[0.35]" />
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[0.78fr_0.70fr_1.05fr]">
          <motion.div {...fadeUp} className="velmere-command-shell velmere-hover-lift min-w-0 space-y-5 rounded-[1.5rem] p-4 md:p-5">
            <h1 className="max-w-[14ch] font-serif text-4xl leading-[0.92] tracking-[-0.03em] text-[#FFFFF0] md:text-5xl xl:text-6xl">
              {t("title")}
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-[#FFFFF0]/[0.65] md:text-base">{t("description")}</p>
            <div className="flex flex-wrap gap-2">
              {statusChips.map((chip) => (
                <span
                  key={chip}
                  className="velmere-command-pill inline-flex min-h-8 items-center px-3 text-[10px] uppercase tracking-[0.16em] text-white/[0.55]"
                >
                  {t(`chips.${chip}`)}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="min-w-0">
            <VlmTradePreview />
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.08 }}
            className="velmere-command-shell velmere-hover-lift min-w-0 rounded-[1.5rem] p-4 xl:sticky xl:top-28"
          >
            <VlmAccessHeroVisual compact animationActive captionBelow />
          </motion.div>
        </div>

        <div className="mt-8 px-2 md:mt-10 md:px-4">
          <VlmActionBar onAction={setActiveModal} />
        </div>
      </section>

      <LuxuryActionModal
        open={activeModal === "wallet"}
        onClose={closeModal}
        title={modals("walletTitle")}
        kicker={modals("walletKicker")}
        size="md"
      >
        <VlmWalletModalContent />
      </LuxuryActionModal>

      <LuxuryActionModal open={activeModal === "trade"} onClose={closeModal} title={modals("tradeTitle")} kicker={modals("tradeKicker")} size="lg">
        <VlmTradeModalContent />
      </LuxuryActionModal>

      <LuxuryActionModal open={activeModal === "registry"} onClose={closeModal} title={modals("registryTitle")} kicker={modals("registryKicker")} size="md">
        <VlmContractRegistrySidePanel />
      </LuxuryActionModal>

      <LuxuryActionModal open={activeModal === "guide"} onClose={closeModal} title={modals("howToBuyTitle")} kicker={modals("howToBuyKicker")} size="md">
        <VlmHowToBuySidePanel />
      </LuxuryActionModal>

      <LuxuryActionModal open={activeModal === "lab"} onClose={closeModal} title={modals("labTitle")} kicker={modals("labKicker")} size="xl">
        <VlmProtocolLabSidePanel />
      </LuxuryActionModal>
    </>
  );
}
