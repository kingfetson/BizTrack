import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "light" | "dark";
};

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, icon, tone = "light", className = "", id, ...rest },
  ref
) {
  const inputId = id ?? rest.name ?? undefined;

  const toneStyles =
    tone === "dark"
      ? {
          label: "text-ink-300",
          base:
            "bg-white/[0.04] border-white/10 text-white placeholder:text-ink-500 " +
            "focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15",
          error: "border-red-500/50 focus:border-red-400 focus:ring-red-500/20",
          hintColor: "text-ink-500",
          errorColor: "text-red-400",
        }
      : {
          label: "text-ink-700",
          base:
            "bg-white border-ink-200 text-ink-900 placeholder:text-ink-400 " +
            "hover:border-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10",
          error: "border-red-400 focus:border-red-500 focus:ring-red-500/10",
          hintColor: "text-ink-500",
          errorColor: "text-red-600",
        };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-[13px] font-medium mb-1.5 ${toneStyles.label}`}
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
                      ${error ? toneStyles.error : toneStyles.base} ${className}`}
        />
      </div>
      {error ? (
        <p className={`mt-1.5 text-[12.5px] ${toneStyles.errorColor}`}>{error}</p>
      ) : hint ? (
        <p className={`mt-1.5 text-[12.5px] ${toneStyles.hintColor}`}>{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;