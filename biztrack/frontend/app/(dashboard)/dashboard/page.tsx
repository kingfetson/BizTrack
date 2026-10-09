"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBusiness } from "@/lib/business";

type Sale = {
  id: number;
  customer_name: string;
  total: string;
  payment_method: string;
  created_at: string;
  item_count: number;
};

type InventoryReport = {
  total_products: number;
  total_units: number;
  total_value_at_cost: string;
  potential_profit: string;
  low_stock_count: number;
  low_stock_items: {
    product_id: number;
    name: string;
    sku: string;
    quantity: number;
    threshold: number;
  }[];
};

type SalesSummary = {
  total_revenue: string;
  sale_count: number;
  item_count: number;
};

type Business = {
  id: number;
  name: string;
  business_type: string;
  currency: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeBusiness, loading: businessLoading } = useBusiness();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [todaySummary, setTodaySummary] = useState<SalesSummary | null>(null);
  const [monthSummary, setMonthSummary] = useState<SalesSummary | null>(null);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Business[]>("/businesses/").then(setBusinesses).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeBusiness) return;
    setLoading(true);
    setError("");

    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStart = firstOfMonth.toISOString().slice(0, 10);

    const base = `/businesses/${activeBusiness.id}`;

    Promise.all([
      // Today's sales list
      api<Sale[]>(`${base}/sales/?ordering=-created_at`).catch(() => []),
      // Today's report (single-day range)
      api<SalesSummary>(`${base}/reports/sales-summary/?start=${today}&end=${today}`).catch(() => null),
      // This month's report
      api<SalesSummary>(`${base}/reports/sales-summary/?start=${monthStart}&end=${today}`).catch(() => null),
      // Inventory report
      api<InventoryReport>(`${base}/reports/inventory/`).catch(() => null),
    ])
      .then(([allSales, todaySum, monthSum, inv]) => {
        // Filter today's sales client-side from the full list
        const todayStr = new Date().toDateString();
        const todays = allSales.filter(
          (s) => new Date(s.created_at).toDateString() === todayStr
        );
        setTodaySales(todays);
        setRecentSales(allSales.slice(0, 5));
        setTodaySummary(todaySum);
        setMonthSummary(monthSum);
        setInventory(inv);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [activeBusiness]);

  const currency = activeBusiness?.currency ?? "KES";

  if (!businessLoading && !activeBusiness) {
    return (
      <div>
        <Header user={user} />
        <Card className="mt-6 p-10 text-center">
          <p className="text-ink-600 dark:text-ink-300">
            You don't have a business yet. Create one to get started.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Greeting */}
      <Header user={user} />

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <QuickAction
          href="/dashboard/sales/new"
          icon="₵"
          title="Record a sale"
          description="Ring up a customer"
          tone="brand"
        />
        <QuickAction
          href="/dashboard/purchases/new"
          icon="▼"
          title="New purchase"
          description="Add stock from a supplier"
          tone="accent"
        />
        <QuickAction
          href="/dashboard/products/new"
          icon="+"
          title="Add product"
          description="Create a new SKU"
          tone="neutral"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-4 py-3 mb-6">
          <p className="text-[13px] text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <KpiCard
          label="Today's revenue"
          value={
            loading ? "…" : `${currency} ${Number(todaySummary?.total_revenue ?? 0).toLocaleString()}`
          }
          hint={
            todaySummary
              ? `${todaySummary.sale_count} sale${todaySummary.sale_count === 1 ? "" : "s"} today`
              : undefined
          }
          icon="₵"
          tone="good"
        />
        <KpiCard
          label="This month"
          value={
            loading ? "…" : `${currency} ${Number(monthSummary?.total_revenue ?? 0).toLocaleString()}`
          }
          hint={
            monthSummary
              ? `${monthSummary.sale_count} sale${monthSummary.sale_count === 1 ? "" : "s"} this month`
              : undefined
          }
          icon="▤"
        />
        <KpiCard
          label="Products in catalog"
          value={loading ? "…" : String(inventory?.total_products ?? 0)}
          hint={`${(inventory?.total_units ?? 0).toLocaleString()} units in stock`}
          icon="◫"
        />
        <KpiCard
          label="Low stock alerts"
          value={loading ? "…" : String(inventory?.low_stock_count ?? 0)}
          hint={
            (inventory?.low_stock_count ?? 0) > 0
              ? "Needs restocking"
              : "All good"
          }
          icon="⚠"
          tone={
            (inventory?.low_stock_count ?? 0) > 0 ? "warn" : "good"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent sales */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-semibold text-ink-900 dark:text-ink-100 tracking-tight">
                  Recent sales
                </h2>
                <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
                  Last {recentSales.length} transactions
                </p>
              </div>
              <Link href="/dashboard/sales">
                <Button variant="ghost" size="sm">View all →</Button>
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center">
                <span className="inline-block w-5 h-5 border-2 border-ink-200 dark:border-white/10 border-t-brand-500 rounded-full animate-spin" />
              </div>
            ) : recentSales.length === 0 ? (
              <EmptyState
                icon="₵"
                title="No sales yet"
                description="Record your first sale to see it here."
                ctaLabel="+ Record sale"
                ctaHref="/dashboard/sales/new"
              />
            ) : (
              <div className="-mx-6 -mb-6">
                <table className="w-full text-left">
                  <thead className="border-b border-ink-100 dark:border-white/5">
                    <tr className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      <th className="px-6 py-2 font-semibold">#</th>
                      <th className="px-6 py-2 font-semibold">Customer</th>
                      <th className="px-6 py-2 font-semibold">When</th>
                      <th className="px-6 py-2 font-semibold text-right">Items</th>
                      <th className="px-6 py-2 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-ink-50 dark:border-white/5 last:border-0"
                      >
                        <td className="px-6 py-3">
                          <Link
                            href={`/dashboard/sales/${s.id}`}
                            className="font-mono text-[13px] text-brand-600 dark:text-brand-400 hover:underline"
                          >
                            #{s.id}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-[13.5px] text-ink-800 dark:text-ink-200">
                          {s.customer_name || (
                            <span className="text-ink-400 dark:text-ink-500">Walk-in</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-[12.5px] text-ink-500 dark:text-ink-400 whitespace-nowrap">
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-[13.5px] text-ink-600 dark:text-ink-300 text-right">
                          {s.item_count}
                        </td>
                        <td className="px-6 py-3 text-[13.5px] font-semibold text-ink-900 dark:text-ink-100 text-right">
                          {s.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Info banner */}
          <div className="mt-6 rounded-xl border border-brand-200 dark:border-brand-900/50 bg-gradient-to-br from-brand-50 to-white dark:from-brand-950/40 dark:to-ink-900 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-600 text-white grid place-items-center text-lg shrink-0">
                →
              </div>
              <div>
                <h3 className="font-semibold text-ink-900 dark:text-ink-100">What's next</h3>
                <p className="mt-1 text-[13.5px] text-ink-600 dark:text-ink-300 leading-relaxed">
                  Stages 1–7 are live: products, inventory, sales, customers,
                  suppliers, purchases, and reports. Coming next: POS interface,
                  M-Pesa integration, and subscriptions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: business + low stock */}
        <div className="space-y-6">
          {/* Your businesses */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-ink-900 dark:text-ink-100 tracking-tight">
                Your businesses
              </h2>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-ink-100 dark:bg-white/10 text-ink-600 dark:text-ink-300">
                {businesses.length}
              </span>
            </div>
            {businesses.length === 0 ? (
              <p className="text-[13px] text-ink-500 dark:text-ink-400">
                No businesses yet.
              </p>
            ) : (
              <div className="space-y-3">
                {businesses.map((b) => {
                  const isActive = b.id === activeBusiness?.id;
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isActive
                          ? "border-brand-300 dark:border-brand-700 bg-brand-50/60 dark:bg-brand-950/30"
                          : "border-ink-100 dark:border-white/5"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-bold text-sm">
                        {b.name[0]?.toUpperCase() ?? "B"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-ink-900 dark:text-ink-100 truncate">
                          {b.name}
                        </p>
                        <p className="text-[11.5px] text-ink-500 dark:text-ink-400">
                          {b.business_type} · {b.currency}
                        </p>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300">
                          Active
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Low stock */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-ink-900 dark:text-ink-100 tracking-tight">
                Low stock
              </h2>
              {(inventory?.low_stock_count ?? 0) > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                  {inventory?.low_stock_count} item{inventory?.low_stock_count === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-6 text-center">
                <span className="inline-block w-4 h-4 border-2 border-ink-200 dark:border-white/10 border-t-brand-500 rounded-full animate-spin" />
              </div>
            ) : !inventory || inventory.low_stock_items.length === 0 ? (
              <p className="text-[13px] text-ink-500 dark:text-ink-400">
                Nothing needs restocking. 🎉
              </p>
            ) : (
              <ul className="space-y-3">
                {inventory.low_stock_items.slice(0, 5).map((p) => (
                  <li key={p.product_id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/products/${p.product_id}`}
                        className="text-[13px] font-medium text-ink-900 dark:text-ink-100 hover:text-brand-600 dark:hover:text-brand-400 truncate block"
                      >
                        {p.name}
                      </Link>
                      {p.sku && (
                        <p className="text-[11.5px] text-ink-500 dark:text-ink-400 font-mono">
                          {p.sku}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                        {p.quantity}
                      </p>
                      <p className="text-[10.5px] text-ink-400 dark:text-ink-500">
                        min {p.threshold}
                      </p>
                    </div>
                  </li>
                ))}
                {inventory.low_stock_items.length > 5 && (
                  <li className="pt-2 border-t border-ink-100 dark:border-white/5">
                    <Link
                      href="/dashboard/reports"
                      className="text-[12.5px] text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      View all {inventory.low_stock_items.length} →
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Header({ user }: { user: { first_name?: string; full_name?: string } | null }) {
  return (
    <div className="mb-8">
      <p className="text-[13px] font-medium text-brand-600 dark:text-brand-400 mb-1">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>
      <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 dark:text-ink-100 tracking-tight">
        Welcome back, {user?.first_name || "there"}.
      </h1>
      <p className="mt-2 text-ink-500 dark:text-ink-400 text-[14.5px]">
        Here's what's happening in your workspace today.
      </p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
  tone,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  tone: "brand" | "accent" | "neutral";
}) {
  const toneClasses =
    tone === "brand"
      ? "border-brand-200 dark:border-brand-900/50 hover:border-brand-400 dark:hover:border-brand-700 bg-gradient-to-br from-brand-50/40 to-white dark:from-brand-950/30 dark:to-ink-900"
      : tone === "accent"
      ? "border-accent-200 dark:border-accent-900/50 hover:border-accent-400 dark:hover:border-accent-700 bg-gradient-to-br from-accent-50/40 to-white dark:from-accent-950/30 dark:to-ink-900"
      : "border-ink-200 dark:border-white/10 hover:border-ink-300 dark:hover:border-white/20 bg-white dark:bg-ink-900";

  const iconBg =
    tone === "brand"
      ? "bg-brand-600 text-white"
      : tone === "accent"
      ? "bg-accent-600 text-white"
      : "bg-ink-900 dark:bg-white/10 text-white dark:text-ink-100";

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-card ${toneClasses}`}
    >
      <span className={`w-10 h-10 rounded-lg grid place-items-center text-lg font-bold shrink-0 ${iconBg}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-ink-900 dark:text-ink-100 truncate">
          {title}
        </p>
        <p className="text-[12px] text-ink-500 dark:text-ink-400 truncate">
          {description}
        </p>
      </div>
    </Link>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  tone?: "default" | "good" | "warn";
}) {
  const valueTone =
    tone === "good"
      ? "text-accent-700 dark:text-accent-400"
      : tone === "warn"
      ? "text-amber-700 dark:text-amber-400"
      : "text-ink-900 dark:text-ink-100";

  return (
    <Card className="p-5" variant="light">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
          {label}
        </p>
        <span className="w-8 h-8 rounded-lg bg-ink-100 dark:bg-white/10 grid place-items-center text-ink-500 dark:text-ink-400 text-[13px]">
          {icon}
        </span>
      </div>
      <p className={`text-[22px] font-semibold tracking-tight ${valueTone}`}>{value}</p>
      {hint && (
        <p className="text-[12px] text-ink-500 dark:text-ink-400 mt-1">{hint}</p>
      )}
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  icon: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="py-8 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 dark:from-brand-900/40 dark:to-accent-900/40 grid place-items-center text-xl mb-3">
        {icon}
      </div>
      <p className="text-[14px] font-medium text-ink-900 dark:text-ink-100">{title}</p>
      <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-1">{description}</p>
      <Link href={ctaHref}>
        <Button size="sm" className="mt-4">{ctaLabel}</Button>
      </Link>
    </div>
  );
}