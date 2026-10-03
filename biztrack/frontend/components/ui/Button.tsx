"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "ghost" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 hover:bg-brand-700 text-white",
  accent:  "bg-accent-600 hover:bg-accent-700 text-white",
  ghost:   "bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700",
  danger:  "bg-red-600 hover:bg-red-700 text-white",
};

export default function Button({
  variant = "primary",
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
      className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition
                  disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}