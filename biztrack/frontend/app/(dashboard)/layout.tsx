"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: "▦" },
  { label: "Products", href: "#", icon: "◫", soon: true },
  { label: "Sales", href: "#", icon: "₵", soon: true },
  { label: "Customers", href: "#", icon: "◍", soon: true },
  { label: "Reports", href: "#", icon: "▤", soon: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-950 text-ink-400">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-2 border-ink-700 border-t-brand-500 animate-spin" />
          <span className="text-sm">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  const initials =
    (user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "") ||
    user.email[0].toUpperCase();

  return (
    <div className="min-h-screen bg-ink-50 flex dark-scroll">
      {/* ===== Desktop sidebar ===== */}
      <aside className="hidden md:flex md:w-[260px] flex-col bg-ink-950 text-ink-300 border-r border-ink-900">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-bold shadow-glow text-sm">
              B
            </span>
            <span className="text-white font-semibold tracking-tight">BizTrack</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto dark-scroll">
          <p className="px-3 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-600">
            Workspace
          </p>
          {nav.map((item) => {
            const active = pathname === item.href;
            const disabled = item.soon;
            return (
              <Link
                key={item.label}
                href={disabled ? "#" : item.href}
                className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-colors ${
                  active
                    ? "bg-white/[0.06] text-white font-medium"
                    : disabled
                    ? "text-ink-600 cursor-not-allowed"
                    : "text-ink-300 hover:bg-white/[0.04] hover:text-white"
                }`}
                onClick={(e) => disabled && e.preventDefault()}
              >
                <span
                  className={`w-5 text-center text-base ${
                    active ? "text-brand-400" : "text-ink-500 group-hover:text-ink-300"
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {disabled && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-ink-500">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-colors">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white grid place-items-center text-sm font-semibold">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-white truncate">
                {user.full_name}
              </p>
              <p className="text-[11.5px] text-ink-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full mt-1 text-left px-3 py-2 rounded-lg text-[13px] text-ink-400 hover:bg-white/[0.04] hover:text-white transition-colors flex items-center gap-2"
          >
            <span>↪</span>
            Log out
          </button>
        </div>
      </aside>

      {/* ===== Mobile overlay ===== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ===== Mobile sidebar ===== */}
      <aside
        className={`fixed inset-y-0 left-0 w-[280px] bg-ink-950 text-ink-300 border-r border-ink-900 z-50 transform transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center px-5 border-b border-white/5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-bold text-sm mr-2.5">
            B
          </span>
          <span className="text-white font-semibold">BizTrack</span>
        </div>
        <nav className="p-3 space-y-0.5">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.soon ? "#" : item.href}
              onClick={(e) => {
                if (item.soon) e.preventDefault();
                setMobileOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] ${
                pathname === item.href
                  ? "bg-white/[0.06] text-white font-medium"
                  : item.soon
                  ? "text-ink-600"
                  : "text-ink-300 hover:bg-white/[0.04]"
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5">
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-ink-400 hover:bg-white/[0.04] hover:text-white"
          >
            ↪ Log out
          </button>
        </div>
      </aside>

      {/* ===== Main ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-ink-200/70 flex items-center px-4 md:px-8 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-ink-100 transition-colors"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
            </svg>
          </button>
          <div className="ml-2 md:ml-0 flex items-center gap-2 min-w-0">
            <h1 className="text-[15px] font-semibold text-ink-900 tracking-tight truncate">
              {nav.find((n) => n.href === pathname)?.label ?? "Workspace"}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] text-ink-500 px-2.5 py-1 rounded-full bg-ink-100">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
              Live
            </span>
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white grid place-items-center text-[12px] font-semibold">
              {initials}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 bg-ink-50">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}