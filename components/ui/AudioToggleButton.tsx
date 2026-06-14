"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useAudioStore, type AudioState } from "@/store/useAudioStore";

export default function AudioToggleButton() {
  const [hydrated, setHydrated] = useState(false);
  const isMuted = useAudioStore((state: AudioState) => state.isMuted);
  const toggleMuted = useAudioStore((state: AudioState) => state.toggleMuted);

  useEffect(() => {
    void useAudioStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const Icon = hydrated && !isMuted ? Volume2 : VolumeX;

  return (
    <button
      type="button"
      aria-pressed={hydrated ? !isMuted : false}
      aria-label={hydrated && !isMuted ? "Mute interface sound" : "Enable interface sound"}
      onClick={() => {
        navigator.vibrate?.(20);
        toggleMuted();
      }}
      className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-[#151517] text-white/[0.60] transition hover:border-white/[0.25] hover:bg-[#1f1f22] hover:text-white active:scale-95 md:inline-flex"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
