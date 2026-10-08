"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

type SaleItem = {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
};

type Sale = {
  id: number;
  customer_name: string;
  customer_phone: string;
  total: string;
  payment_method: string;
  status: string;
  note: string;
  created_by_email: string | null;
  created_at: string;
  voided_at: string | null;
  voided_by_email: string | null;
  void_reason: string;
  items: SaleItem[];
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  MPESA: "M-Pesa",
  CARD: "Card",
  BANK: "Bank transfer",
  OTHER: "Other",
};

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const saleId = Number(params.id);
  const { activeBusiness } = useBusiness();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const load = useCallback(async () => {
    if (!activeBusiness || !saleId) return;
    setLoading(true);
    try {
      const data = await api<Sale>(
        `/businesses/${activeBusiness.id}/sales/${saleId}/`
      );
      setSale(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, saleId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onVoid() {
    if (!activeBusiness) return;
    setVoiding(true);
    try {
      await api(`/businesses/${activeBusiness.id}/sales/${saleId}/void/`, {
        method: "POST",
        body: JSON.stringify({ reason: voidReason }),
      });
      setConfirmVoid(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void");
      setVoiding(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-10 text-center">
        <span className="inline-block w-5 h-5 border-2 border-ink-200 border-t-brand-500 rounded-full animate-spin" />
      </Card>
    );
  }

  if (!sale) {
    return (
      <Card className="p-10 text-center">
        <p className="text-ink-600">{error || "Sale not found."}</p>
        <Link href="/dashboard/sales">
          <Button variant="ghost" className="mt-4">Back to sales</Button>
        </Link>
      </Card>
    );
  }

  const isVoided = sale.status === "VOIDED";

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/sales" className="text-[13px] text-ink-500 hover:text-ink-900">
          ← Back to sales
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
              Sale #{sale.id}
            </h1>
            <p className="text-[14px] text-ink-500 mt-1">
              {new Date(sale.created_at).toLocaleString()}
            </p>
          </div>
          {isVoided ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium px-3 py-1.5 rounded-full bg-red-50 text-red-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Voided
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium px-3 py-1.5 rounded-full bg-accent-50 text-accent-700">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
              Completed
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-4">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-ink-100">
              <h2 className="text-[15px] font-semibold text-ink-900">Items</h2>
            </div>
            <table className="w-full text-left">
              <thead className="bg-ink-50 border-b border-ink-200/70">
                <tr>
                  <th className="px-6 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Product</th>
                  <th className="px-6 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500 text-right">Qty</th>
                  <th className="px-6 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500 text-right">Unit</th>
                  <th className="px-6 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-b border-ink-100 last:border-0">
                    <td className="px-6 py-4">
                      <p className="text-[13.5px] font-medium text-ink-900">{item.product_name}</p>
                      {item.product_sku && (
                        <p className="text-[12px] text-ink-500 font-mono">{item.product_sku}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[13.5px] text-ink-700 text-right">{item.quantity}</td>
                    <td className="px-6 py-4 text-[13.5px] text-ink-600 text-right">{item.unit_price}</td>
                    <td className="px-6 py-4 text-[13.5px] font-medium text-ink-900 text-right">{item.subtotal}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-ink-50 border-t border-ink-200/70">
                <tr>
                  <td colSpan={3} className="px-6 py-3 text-right text-[13.5px] font-semibold text-ink-700">
                    Total
                  </td>
                  <td className="px-6 py-3 text-right text-[15px] font-bold text-ink-900">
                    {sale.total}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>

          {/* Void history */}
          {isVoided && (
            <Card className="p-6 border-red-200">
              <h2 className="text-[15px] font-semibold text-red-700 mb-3">
                Voided
              </h2>
              <p className="text-[13.5px] text-ink-700">
                Voided at {sale.voided_at && new Date(sale.voided_at).toLocaleString()}
              </p>
              {sale.voided_by_email && (
                <p className="text-[13px] text-ink-500">by {sale.voided_by_email}</p>
              )}
              {sale.void_reason && (
                <p className="text-[13px] text-ink-600 mt-2 italic">
                  "{sale.void_reason}"
                </p>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Customer</h2>
            <div className="space-y-3 text-[13.5px]">
              <div>
                <p className="text-[11.5px] uppercase tracking-wider text-ink-500 mb-0.5">Name</p>
                <p className="text-ink-900">{sale.customer_name || "Walk-in"}</p>
              </div>
              {sale.customer_phone && (
                <div>
                  <p className="text-[11.5px] uppercase tracking-wider text-ink-500 mb-0.5">Phone</p>
                  <p className="text-ink-900">{sale.customer_phone}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Payment</h2>
            <p className="text-[13.5px] text-ink-900">
              {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}
            </p>
            {sale.note && (
              <p className="text-[12.5px] text-ink-500 mt-3 italic">
                {sale.note}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Details</h2>
            <div className="space-y-3 text-[13.5px]">
              <div>
                <p className="text-[11.5px] uppercase tracking-wider text-ink-500 mb-0.5">Created by</p>
                <p className="text-ink-900">{sale.created_by_email ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11.5px] uppercase tracking-wider text-ink-500 mb-0.5">Items</p>
                <p className="text-ink-900">{sale.items.length}</p>
              </div>
            </div>
          </Card>

          {!isVoided && (
            <Card className="p-6 border-red-200">
              <h2 className="text-[15px] font-semibold text-red-700 mb-3">Danger zone</h2>
              {confirmVoid ? (
                <div className="space-y-3">
                  <p className="text-[13px] text-red-700">
                    Voiding will restore stock and mark the sale as voided.
                  </p>
                  <input
                    id="void-reason"
                    name="void-reason"
                    type="text"
$4value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full px-3 py-2 rounded border border-ink-200 text-[13px] focus:outline-none focus:border-red-400"
                  />
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={onVoid} loading={voiding} type="button">
                      Confirm void
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmVoid(false)} type="button">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" type="button" onClick={() => setConfirmVoid(true)}>
                  Void sale
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}