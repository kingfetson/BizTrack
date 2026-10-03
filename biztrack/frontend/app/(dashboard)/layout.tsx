"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: "▦" },
  { label: "Products", href: "#", icon: "◫", soon: true },
  { label: "Sales", href: "#", icon: "＄", soon: true },
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
      <div className="min-h-screen grid place-items-center text-slate-500">Loading...</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r border-slate-200">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">B</span>
            <span className="text-lg font-semibold text-slate-900">BizTrack</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            const disabled = item.soon;
            return (
              <Link
                key={item.label}
                href={disabled ? "#" : item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  active
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : disabled
                    ? "text-slate-400 cursor-not-allowed"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={(e) => disabled && e.preventDefault()}
              >
                <span className="w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
                {disabled && <span className="ml-auto text-xs text-slate-400">Soon</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-slate-900 truncate">{user.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 transform transition-transform md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <span className="text-lg font-semibold text-slate-900">BizTrack</span>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.soon ? "#" : item.href}
              onClick={(e) => {
                if (item.soon) e.preventDefault();
                setMobileOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                pathname === item.href
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : item.soon
                  ? "text-slate-400"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200">
          <button onClick={logout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="ml-2 md:ml-0 font-medium text-slate-800">
            Welcome, {user.first_name || user.email}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}