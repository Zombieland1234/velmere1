"use client";

export type VlmInterfaceMode = "basic" | "pro";

import { useModeStore } from "@/store/useModeStore";

type VlmModeContextValue = {
  mode: VlmInterfaceMode;
  setMode: (mode: VlmInterfaceMode) => void;
  mounted: boolean;
  isPro: boolean;
};

export function VlmModeProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function useVlmMode(): VlmModeContextValue {
  const { mode, setMode, isProMode } = useModeStore();
  return {
    mode,
    setMode,
    mounted: true,
    isPro: isProMode,
  };
}
