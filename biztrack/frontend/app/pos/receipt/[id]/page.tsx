"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BusinessProvider, useBusiness } from "@/lib/business";

type SaleItem = {
  id: number;
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
  created_by_email: string | null;
  created_at: string;
  items: SaleItem[];
};

function ReceiptInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { activeBusiness } = useBusiness();
  const { user } = useAuth();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeBusiness || !params.id) return;
    api<Sale>(`/businesses/${activeBusiness.id}/sales/${params.id}/`)
      .then(setSale)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [activeBusiness, params.id]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-50 dark:bg-ink-950">
        <span className="inline-block w-6 h-6 border-2 border-ink-200 dark:border-white/10 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-50 dark:bg-ink-950 p-6">
        <div className="text-center">
          <p className="text-ink-600 dark:text-ink-300">{error || "Sale not found."}</p>
          <Link href="/pos">
            <Button variant="ghost" className="mt-4">Back to POS</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currency = activeBusiness?.currency ?? "KES";
  const itemCount = sale.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      {/* Screen-only chrome */}
      <div className="print:hidden bg-ink-50 dark:bg-ink-950 min-h-screen py-8 px-4">
        <div className="max-w-md mx-auto">
          {/* Success banner */}
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-accent-50 dark:bg-accent-950/40 border border-accent-200 dark:border-accent-900/50">
            <span className="w-10 h-10 rounded-full bg-accent-600 text-white grid place-items-center text-lg">
              ✓
            </span>
            <div>
              <p className="font-semibold text-accent-900 dark:text-accent-200">
                Sale recorded
              </p>
              <p className="text-[12.5px] text-accent-700 dark:text-accent-300">
                #{sale.id} · {currency} {sale.total}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button
              variant="ghost"
              onClick={() => window.print()}
              className="w-full"
            >
              🖨 Print receipt
            </Button>
            <Button onClick={() => router.push("/pos")} className="w-full">
              New sale →
            </Button>
          </div>

          {/* Receipt content (also shown on print) */}
          <div className="bg-white dark:bg-ink-900 rounded-xl border border-ink-200 dark:border-white/10 p-6 print:bg-white print:text-black print:border-0 print:rounded-none print:p-0">
            <ReceiptContent sale={sale} currency={currency} itemCount={itemCount} businessName={activeBusiness?.name ?? ""} email={user?.email ?? ""} />
          </div>
        </div>
      </div>

      {/* Print-only view */}
      <div className="hidden print:block p-4">
        <ReceiptContent sale={sale} currency={currency} itemCount={itemCount} businessName={activeBusiness?.name ?? ""} email={user?.email ?? ""} />
      </div>
    </>
  );
}

function ReceiptContent({
  sale,
  currency,
  itemCount,
  businessName,
  email,
}: {
  sale: Sale;
  currency: string;
  itemCount: number;
  businessName: string;
  email: string;
}) {
  return (
    <div className="font-mono text-[12.5px] text-ink-900 dark:text-ink-100 print:text-black">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-lg font-bold tracking-tight">{businessName}</p>
        <p className="text-[11px] mt-1 text-ink-500 dark:text-ink-400 print:text-black">
          Receipt
        </p>
      </div>

      <div className="border-t border-dashed border-ink-300 dark:border-white/20 print:border-black my-3" />

      {/* Meta */}
      <div className="space-y-1 text-[11.5px]">
        <div className="flex justify-between">
          <span>Sale #</span>
          <span className="font-semibold">{sale.id}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{new Date(sale.created_at).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier</span>
          <span>{email}</span>
        </div>
        {sale.customer_name && (
          <div className="flex justify-between">
            <span>Customer</span>
            <span>{sale.customer_name}</span>
          </div>
        )}
        {sale.customer_phone && (
          <div className="flex justify-between">
            <span>Phone</span>
            <span>{sale.customer_phone}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-ink-300 dark:border-white/20 print:border-black my-3" />

      {/* Items */}
      <div className="space-y-1.5">
        {sale.items.map((item) => (
          <div key={item.id}>
            <p className="font-medium">{item.product_name}</p>
            <div className="flex justify-between text-[11.5px] text-ink-600 dark:text-ink-400 print:text-black">
              <span>
                {item.quantity} × {item.unit_price}
              </span>
              <span className="font-semibold text-ink-900 dark:text-ink-100 print:text-black">
                {item.subtotal}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-ink-300 dark:border-white/20 print:border-black my-3" />

      {/* Totals */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11.5px]">
          <span>Items</span>
          <span>{itemCount}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>TOTAL</span>
          <span>
            {currency} {sale.total}
          </span>
        </div>
        <div className="flex justify-between text-[11.5px] text-ink-500 dark:text-ink-400 print:text-black">
          <span>Payment</span>
          <span>{sale.payment_method}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-ink-300 dark:border-white/20 print:border-black my-3" />

      <p className="text-center text-[10.5px] text-ink-500 dark:text-ink-400 print:text-black mt-4">
        Thank you for your business!
      </p>
    </div>
  );
}

export default function ReceiptPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-950 text-ink-400">
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <BusinessProvider>
      <ReceiptInner />
    </BusinessProvider>
  );
}