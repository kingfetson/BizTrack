"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { BusinessProvider, useBusiness } from "@/lib/business";
import { useTheme } from "@/lib/theme";

function PosChrome({ children }: { children: React.ReactNode }) {
  const { activeBusiness } = useBusiness();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-white dark:bg-ink-900 border-b border-ink-200/70 dark:border-white/10 flex items-center px-4 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-ink-700 dark:text-ink-200 hover:text-ink-900 dark:hover:text-white transition-colors"
        >
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-bold text-xs">
            B
          </span>
          <span className="text-[13.5px] font-medium">Back to dashboard</span>
        </Link>

        <div className="ml-6 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            POS
          </span>
          {activeBusiness && (
            <>
              <span className="text-ink-300 dark:text-ink-600">·</span>
              <span className="text-[13px] font-medium text-ink-800 dark:text-ink-100">
                {activeBusiness.name}
              </span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex min-h-0">{children}</main>
    </div>
  );
}

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-950 text-ink-400">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-2 border-ink-700 border-t-brand-500 animate-spin" />
          <span className="text-sm">Loading POS…</span>
        </div>
      </div>
    );
  }

  return (
    <BusinessProvider>
      <PosChrome>{children}</PosChrome>
    </BusinessProvider>
  );
}