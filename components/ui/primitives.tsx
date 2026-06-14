import * as React from "react";
import { cn } from "@/lib/utils";

export function PageContainer({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Section({ className, children }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("py-16 md:py-24", className)}>{children}</section>;
}

type ButtonVariant = "primary" | "secondary" | "ghost";
export function Button({ className, variant = "primary", type = "button", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: "border border-velmere-ivory bg-velmere-ivory text-black hover:bg-velmere-gold hover:border-velmere-gold",
    secondary: "border border-white/[0.14] bg-white/[0.035] text-velmere-ivory hover:border-velmere-gold/[0.50] hover:text-velmere-gold",
    ghost: "border border-transparent bg-transparent text-velmere-muted hover:bg-white/[0.045] hover:text-velmere-ivory",
  };
  return <button className={cn("velmere-ui-button inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-velmere focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-velmere-gold/[0.60] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45", variants[variant], className)} type={type} {...props} />;
}

export function Card({ className, children }: React.HTMLAttributes<HTMLElement>) {
  return <article className={cn("velmere-ui-card rounded-2xl border border-white/[0.08] bg-velmere-surface/[0.90] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-8", className)}>{children}</article>;
}

export function Input({ className, type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("velmere-ui-input min-h-12 w-full rounded-full border border-white/[0.10] bg-black/[0.20] px-5 text-base text-velmere-ivory outline-none placeholder:text-velmere-muted/[0.60] focus:border-velmere-gold/[0.55] focus:ring-2 focus:ring-velmere-gold/[0.15]", className)} type={type} {...props} />;
}

export function Badge({ className, children }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("velmere-ui-badge inline-flex min-h-7 items-center rounded-full border border-white/[0.10] bg-white/[0.04] px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-velmere-muted", className)}>{children}</span>;
}
