"use client";

import { useEffect, useState } from "react";

const CHARACTERS = "VLM01Xy$9@!#%&<>/{}[]ETHSUI";

export function useScrambleText(text: string, duration = 620) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!text) {
      setDisplay("");
      return;
    }

    let frame = 0;
    const totalFrames = Math.max(10, Math.floor(duration / 32));
    const interval = window.setInterval(() => {
      frame += 1;
      const progress = frame / totalFrames;
      const revealCount = Math.floor(text.length * progress);

      const scrambled = text
        .split("")
        .map((character, index) => {
          if (character === " " || character === "\n") return character;
          if (index < revealCount) return character;
          return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        })
        .join("");

      setDisplay(scrambled);

      if (frame >= totalFrames) {
        window.clearInterval(interval);
        setDisplay(text);
      }
    }, 32);

    return () => window.clearInterval(interval);
  }, [duration, text]);

  return display;
}
