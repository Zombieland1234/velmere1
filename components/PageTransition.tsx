"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useVelmereMotionProfile } from "@/components/ui/useVelmereMotionProfile";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const motionProfile = useVelmereMotionProfile();
  const reducedMotion = motionProfile.duration.standard === 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <motion.div
      key={pathname}
      initial={reducedMotion ? false : { opacity: 0, y: Math.min(motionProfile.distance.micro, 8) }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: Math.min(motionProfile.duration.standard, 0.34), ease: motionProfile.easing }}
      className="velmere-page-transition relative z-10 flex-grow overflow-x-clip"
      data-pass627-motion-profile={reducedMotion ? "reduced" : "state-bound"}
      data-pass677-route-motion="stable"
    >
      {!reducedMotion ? <span className="velmere-route-wash" aria-hidden="true" /> : null}
      {children}
    </motion.div>
  );
}
