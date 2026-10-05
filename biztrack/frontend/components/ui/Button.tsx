"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "ghost" | "danger" | "dark" | "gold";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
};

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 hover:bg-brand-500 text-white shadow-glow hover:shadow-[0_0_0_1px_rgb(59_109_255/0.1),0_12px_28px_-6px_rgb(59_109_255/0.4)]",
  accent:
    "bg-accent-600 hover:bg-accent-500 text-white shadow-soft",
  ghost:
    "bg-transparent border border-ink-200 hover:border-ink-300 hover:bg-ink-50 text-ink-700",
  danger:
    "bg-red-600 hover:bg-red-500 text-white shadow-soft",
  dark:
    "bg-ink-900 hover:bg-ink-800 text-white shadow-card",
  gold:
    "bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold shadow-soft",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
                  ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <>
          <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Please wait...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}