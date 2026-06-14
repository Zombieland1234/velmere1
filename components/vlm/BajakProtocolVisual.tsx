"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

function drawProtocol(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, reduced: boolean) {
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createRadialGradient(width * 0.62, height * 0.38, 0, width * 0.62, height * 0.38, width * 0.72);
  gradient.addColorStop(0, "rgba(200,169,106,0.18)");
  gradient.addColorStop(0.42, "rgba(245,240,232,0.035)");
  gradient.addColorStop(1, "rgba(3,3,3,0.96)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(245,240,232,0.045)";
  ctx.lineWidth = 1;
  const grid = Math.max(36, width / 14);
  for (let x = -grid; x < width + grid; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(time * 0.0002 + x) * 2, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = -grid; y < height + grid; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + Math.cos(time * 0.00018 + y) * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(245,240,232,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 6) {
    const phase = reduced ? 0 : time * 0.001;
    const y =
      height * 0.52 +
      Math.sin(x * 0.017 + phase) * height * 0.055 +
      Math.sin(x * 0.043 - phase * 0.7) * height * 0.026;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const points = PRIMES.map((prime, index) => {
    const x = ((prime * 37) % 101) / 101 * width;
    const y = ((prime * 53 + index * 17) % 97) / 97 * height;
    return {
      prime,
      x: width * 0.1 + x * 0.8,
      y: height * 0.15 + y * 0.7,
    };
  });

  ctx.lineWidth = 1;
  points.forEach((point, index) => {
    const next = points[(index + 7) % points.length];
    const distance = Math.hypot(point.x - next.x, point.y - next.y);
    if (distance < width * 0.42) {
      ctx.strokeStyle = index % 4 === 0 ? "rgba(200,169,106,0.24)" : "rgba(245,240,232,0.10)";
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
  });

  points.forEach((point, index) => {
    const pulse = reduced ? 0.6 : 0.45 + Math.sin(time * 0.002 + index) * 0.28;
    ctx.fillStyle = index % 5 === 0 ? `rgba(200,169,106,${0.62 + pulse * 0.3})` : `rgba(245,240,232,${0.4 + pulse * 0.22})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, index % 5 === 0 ? 3.2 : 2.1, 0, Math.PI * 2);
    ctx.fill();
    if (index % 6 === 0) {
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "rgba(245,240,232,0.34)";
      ctx.fillText(String(point.prime), point.x + 8, point.y - 8);
    }
  });

  const signalIndex = reduced ? 0 : Math.floor(time * 0.004) % points.length;
  const signal = points[signalIndex];
  const ring = reduced ? 16 : 14 + Math.sin(time * 0.006) * 6;
  ctx.strokeStyle = "rgba(200,169,106,0.72)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(signal.x, signal.y, ring, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.fillRect(0, height - 86, width, 86);
}

export default function BajakProtocolVisual() {
  const t = useTranslations("BajakProtocol");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 1;
    let height = 1;
    let frameId = 0;
    let visible = true;
    let tabVisible = !document.hidden;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawProtocol(context, width, height, performance.now(), reducedMotion);
    };

    const animate = (time: number) => {
      frameId = 0;
      drawProtocol(context, width, height, time, reducedMotion);
      if (visible && tabVisible && !reducedMotion) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    const start = () => {
      if (!frameId && visible && tabVisible && !reducedMotion) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    const stop = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });

    const onVisibilityChange = () => {
      tabVisible = !document.hidden;
      if (tabVisible) start();
      else stop();
    };

    resize();
    start();
    observer.observe(canvas);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-3xl border border-white/[0.10] bg-white/[0.04]">
      <div className="relative h-[360px] md:h-[460px]">
        <canvas ref={canvasRef} className="pointer-events-none h-full w-full touch-pan-y" aria-label={t("aria")} role="img" />
        <div className="absolute inset-x-0 bottom-0 border-t border-white/[0.10] bg-black/[0.64] p-5 backdrop-blur-xl md:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-velmere-gold">{t("title")}</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/[0.58]">{t("body")}</p>
        </div>
      </div>
    </section>
  );
}
