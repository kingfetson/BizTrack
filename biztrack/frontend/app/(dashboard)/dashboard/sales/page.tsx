"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

type Sale = {
  id: number;
  customer_name: string;
  customer_phone: string;
  total: string;
  payment_method: string;
  status: string;
  created_at: string;
  item_count: number;
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  MPESA: "M-Pesa",
  CARD: "Card",
  BANK: "Bank",
  OTHER: "Other",
};

export default function SalesListPage() {
  const { activeBusiness, loading: businessLoading } = useBusiness();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  async function load(businessId: number) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (paymentFilter) params.set("payment_method", paymentFilter);
      const qs = params.toString();
      const data = await api<Sale[]>(
        `/businesses/${businessId}/sales/${qs ? "?" + qs : ""}`
      );
      setSales(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeBusiness) return;
    const t = setTimeout(() => load(activeBusiness.id), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness, statusFilter, paymentFilter]);

  const totalToday = sales
    .filter(
      (s) =>
        s.status === "COMPLETED" &&
        new Date(s.created_at).toDateString() === new Date().toDateString()
    )
    .reduce((sum, s) => sum + Number(s.total), 0);

  if (!businessLoading && !activeBusiness) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Sales</h1>
        <Card className="mt-6 p-10 text-center">
          <p className="text-ink-600">Create a business first to record sales.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Sales</h1>
          <p className="text-[14px] text-ink-500 mt-1">
            Sales for {activeBusiness?.name ?? "your business"}.
          </p>
        </div>
        <Link href="/dashboard/sales/new">
          <Button size="md">+ New sale</Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-5" variant="light">
          <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-500">
            Today's total
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink-900 tracking-tight">
            {activeBusiness?.currency ?? "KES"} {totalToday.toFixed(2)}
          </p>
        </Card>
        <Card className="p-5" variant="light">
          <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-500">
            Sales today
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink-900 tracking-tight">
            {
              sales.filter(
                (s) =>
                  s.status === "COMPLETED" &&
                  new Date(s.created_at).toDateString() ===
                    new Date().toDateString()
              ).length
            }
          </p>
        </Card>
        <Card className="p-5" variant="light">
          <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-500">
            Total sales
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink-900 tracking-tight">
            {sales.length}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6" variant="light">
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
          >
            <option value="">All statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="VOIDED">Voided</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
          >
            <option value="">All payment methods</option>
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-4">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <Card className="p-10 text-center">
          <span className="inline-block w-5 h-5 border-2 border-ink-200 border-t-brand-500 rounded-full animate-spin" />
        </Card>
      ) : sales.length === 0 ? (
        <Card className="p-10 md:p-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 grid place-items-center text-2xl mb-4">
            ₵
          </div>
          <h3 className="text-[15px] font-semibold text-ink-900">No sales yet</h3>
          <p className="text-[13.5px] text-ink-500 mt-1.5 max-w-sm mx-auto">
            Record your first sale to see it here and automatically update stock.
          </p>
          <Link href="/dashboard/sales/new">
            <Button className="mt-5">+ Record a sale</Button>
          </Link>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden" variant="elevated">
          <table className="w-full text-left">
            <thead className="bg-ink-50 border-b border-ink-200/70">
              <tr>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">#</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Customer</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Date</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500 text-right">Items</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500 text-right">Total</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Payment</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/sales/${s.id}`} className="font-mono text-[13.5px] text-ink-700 hover:text-brand-600">
                      #{s.id}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[13.5px] text-ink-700">
                    {s.customer_name || <span className="text-ink-400">Walk-in</span>}
                  </td>
                  <td className="px-5 py-4 text-[13px] text-ink-500 whitespace-nowrap">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-[13.5px] text-ink-700 text-right">
                    {s.item_count}
                  </td>
                  <td className="px-5 py-4 text-[13.5px] font-semibold text-ink-900 text-right">
                    {s.total}
                  </td>
                  <td className="px-5 py-4 text-[13px] text-ink-600">
                    {PAYMENT_LABELS[s.payment_method] ?? s.payment_method}
                  </td>
                  <td className="px-5 py-4">
                    {s.status === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded-full bg-accent-50 text-accent-700">
                        <span className="w-1 h-1 rounded-full bg-accent-500" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded-full bg-red-50 text-red-600">
                        <span className="w-1 h-1 rounded-full bg-red-500" />
                        Voided
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}