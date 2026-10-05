type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: "light" | "elevated" | "dark";
};

const variants = {
  light: "bg-white border border-ink-200/70 shadow-soft",
  elevated: "bg-white border border-ink-200/60 shadow-card",
  dark: "bg-ink-900/80 backdrop-blur border border-white/5 shadow-elevated text-white",
};

export default function Card({
  children,
  className = "",
  variant = "elevated",
}: Props) {
  return (
    <div className={`rounded-xl ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}