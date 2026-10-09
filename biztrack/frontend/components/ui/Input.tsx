import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "light" | "dark" | "auto";
};

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, icon, tone = "auto", className = "", id, ...rest },
  ref
) {
  const inputId = id ?? rest.name ?? undefined;

  // For "dark" tone (auth pages) → force dark. For "light" → force light.
  // For "auto" → use light by default but swap when .dark is on <html>.
  const labelClass =
    tone === "dark"
      ? "text-ink-300"
      : tone === "light"
      ? "text-ink-700"
      : "text-ink-700 dark:text-ink-300";

  const baseInput =
    tone === "dark"
      ? "bg-white/[0.04] border-white/10 text-white placeholder:text-ink-500 focus:border-brand-400 focus:ring-brand-500/15"
      : tone === "light"
      ? "bg-white border-ink-200 text-ink-900 placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 focus:ring-brand-500/10"
      : "bg-white dark:bg-ink-900 border-ink-200 dark:border-white/10 text-ink-900 dark:text-ink-100 placeholder:text-ink-400 dark:placeholder:text-ink-500 hover:border-ink-300 focus:border-brand-500 focus:ring-brand-500/10";

  const errorInput =
    tone === "dark"
      ? "border-red-500/50 focus:border-red-400 focus:ring-red-500/20"
      : "border-red-400 focus:border-red-500 focus:ring-red-500/10";

  const hintColor = tone === "dark" ? "text-ink-500" : "text-ink-500 dark:text-ink-400";
  const errorColor = tone === "dark" ? "text-red-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-[13px] font-medium mb-1.5 ${labelClass}`}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          {...rest}
          className={`w-full ${icon ? "pl-10" : "pl-3.5"} pr-3.5 py-2.5 rounded-lg border
                      text-[14px] transition-all duration-150 focus:outline-none
                      focus:ring-4
                      ${error ? errorInput : baseInput} ${className}`}
        />
      </div>
      {error ? (
        <p className={`mt-1.5 text-[12.5px] ${errorColor}`}>{error}</p>
      ) : hint ? (
        <p className={`mt-1.5 text-[12.5px] ${hintColor}`}>{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;