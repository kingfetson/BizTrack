"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SalesSummary = {
  range: { start: string; end: string };
  total_revenue: string;
  sale_count: number;
  item_count: number;
  avg_sale_value: string;
  daily: { date: string; revenue: string; count: number }[];
  top_products: { product_id: number; name: string; quantity: number; revenue: string }[];
  payment_methods: { method: string; revenue: string; count: number }[];
};

type InventoryReport = {
  total_products: number;
  total_units: number;
  total_value_at_cost: string;
  total_value_at_price: string;
  potential_profit: string;
  low_stock_count: number;
  low_stock_items: { product_id: number; name: string; sku: string; quantity: number; threshold: number }[];
  out_of_stock_items: { product_id: number; name: string; sku: string; category: string | null }[];
};

type PurchasesSummary = {
  range: { start: string; end: string };
  total_spend: string;
  purchase_count: number;
  unpaid_total: string;
  by_supplier: { supplier: string; total: string; count: number }[];
  monthly: { month: string; total: string; count: number }[];
};

type ProfitReport = {
  range: { start: string; end: string };
  revenue: string;
  cost_of_goods_sold: string;
  gross_profit: string;
  margin_percent: number;
  by_product: {
    product_id: number; name: string; units_sold: number;
    revenue: string; cost: string; profit: string; margin_percent: number;
  }[];
};

type Tab = "sales" | "inventory" | "purchases" | "profit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function thirtyDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}

function currency(amount: string | number, symbol = "KES") {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `${symbol} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ReportsPage() {
  const { activeBusiness } = useBusiness();
  const [tab, setTab] = useState<Tab>("sales");
  const [start, setStart] = useState(thirtyDaysAgoISO());
  const [end, setEnd] = useState(todayISO());

  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [purchases, setPurchases] = useState<PurchasesSummary | null>(null);
  const [profit, setProfit] = useState<ProfitReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currencyCode = activeBusiness?.currency ?? "KES";

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    setError("");
    try {
      const qs = `?start=${start}&end=${end}`;
      if (tab === "sales") {
        setSales(await api<SalesSummary>(`/businesses/${activeBusiness.id}/reports/sales-summary/${qs}`));
      } else if (tab === "inventory") {
        setInventory(await api<InventoryReport>(`/businesses/${activeBusiness.id}/reports/inventory/`));
      } else if (tab === "purchases") {
        setPurchases(await api<PurchasesSummary>(`/businesses/${activeBusiness.id}/reports/purchases-summary/${qs}`));
      } else if (tab === "profit") {
        setProfit(await api<ProfitReport>(`/businesses/${activeBusiness.id}/reports/profit/${qs}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, tab, start, end]);

  useEffect(() => {
    load();
  }, [load]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "sales", label: "Sales" },
    { id: "inventory", label: "Inventory" },
    { id: "purchases", label: "Purchases" },
    { id: "profit", label: "Profit" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Reports</h1>
        <p className="text-[14px] text-ink-500 mt-1">
          Analytics for {activeBusiness?.name ?? "your business"}.
        </p>
      </div>

      {/* Tabs + Date range */}
      <Card className="p-4 mb-6" variant="light">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3.5 py-1.5 rounded-lg text-[13.5px] font-medium transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "bg-brand-600 text-white"
                    : "text-ink-600 hover:bg-ink-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Date range */}
          {tab !== "inventory" && (
            <div className="flex items-center gap-2 lg:ml-auto">
              <label className="text-[12.5px] text-ink-600">From</label>
              <input
                type="date"
                value={start}
                max={end}
                onChange={(e) => setStart(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-ink-200 text-[13.5px] focus:outline-none focus:border-brand-500"
              />
              <label className="text-[12.5px] text-ink-600">To</label>
              <input
                type="date"
                value={end}
                min={start}
                max={todayISO()}
                onChange={(e) => setEnd(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-ink-200 text-[13.5px] focus:outline-none focus:border-brand-500"
              />
              <Button size="sm" variant="ghost" onClick={load}>Refresh</Button>
            </div>
          )}
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
      ) : (
        <>
          {tab === "sales" && sales && <SalesTab data={sales} currency={currencyCode} />}
          {tab === "inventory" && inventory && <InventoryTab data={inventory} currency={currencyCode} />}
          {tab === "purchases" && purchases && <PurchasesTab data={purchases} currency={currencyCode} />}
          {tab === "profit" && profit && <ProfitTab data={profit} currency={currencyCode} />}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
function KpiCard({
  label, value, hint, tone = "default",
}: {
  label: string; value: string; hint?: string; tone?: "default" | "good" | "warn";
}) {
  const toneClasses =
    tone === "good" ? "text-accent-700" : tone === "warn" ? "text-amber-700" : "text-ink-900";
  return (
    <Card className="p-5" variant="light">
      <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${toneClasses}`}>{value}</p>
      {hint && <p className="text-[12px] text-ink-500 mt-1">{hint}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Bar chart (SVG, no library)
// ---------------------------------------------------------------------------
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="text-[13px] text-ink-500 py-8 text-center">No data for this period.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-32 mt-4 overflow-x-auto">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 shrink-0 group">
          <div className="relative w-6 bg-brand-500/20 rounded-t hover:bg-brand-500/40 transition-colors"
               style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? "4px" : "0px" }}>
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-ink-600 opacity-0 group-hover:opacity-100 whitespace-nowrap">
              {d.value.toLocaleString()}
            </span>
          </div>
          <span className="text-[9px] text-ink-500 rotate-45 origin-left whitespace-nowrap">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sales Tab
// ---------------------------------------------------------------------------
function SalesTab({ data, currency: cur }: { data: SalesSummary; currency: string }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Revenue" value={currency(data.total_revenue, cur)} tone="good" />
        <KpiCard label="Sales" value={String(data.sale_count)} />
        <KpiCard label="Items sold" value={String(data.item_count)} />
        <KpiCard label="Avg sale" value={currency(data.avg_sale_value, cur)} />
      </div>

      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-ink-900 mb-2">Daily revenue</h2>
        <p className="text-[13px] text-ink-500">
          {data.range.start} → {data.range.end}
        </p>
        <BarChart data={data.daily.map((d) => ({
          label: d.date.slice(5),
          value: Number(d.revenue),
        }))} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Top products</h2>
          {data.top_products.length === 0 ? (
            <p className="text-[13px] text-ink-500">No sales.</p>
          ) : (
            <table className="w-full text-left text-[13.5px]">
              <thead className="text-[11.5px] uppercase tracking-wider text-ink-500 border-b border-ink-100">
                <tr>
                  <th className="py-2 font-semibold">Product</th>
                  <th className="py-2 font-semibold text-right">Qty</th>
                  <th className="py-2 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.top_products.map((p) => (
                  <tr key={p.product_id} className="border-b border-ink-50 last:border-0">
                    <td className="py-2 text-ink-800">{p.name}</td>
                    <td className="py-2 text-right text-ink-600">{p.quantity}</td>
                    <td className="py-2 text-right font-medium text-ink-900">{p.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Payment methods</h2>
          {data.payment_methods.length === 0 ? (
            <p className="text-[13px] text-ink-500">No data.</p>
          ) : (
            <ul className="space-y-3">
              {data.payment_methods.map((m) => {
                const total = data.payment_methods.reduce((s, x) => s + Number(x.revenue), 0);
                const pct = total > 0 ? (Number(m.revenue) / total) * 100 : 0;
                return (
                  <li key={m.method}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="font-medium text-ink-800">{m.method}</span>
                      <span className="text-ink-600">{m.revenue} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inventory Tab
// ---------------------------------------------------------------------------
function InventoryTab({ data, currency: cur }: { data: InventoryReport; currency: string }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Products" value={String(data.total_products)} />
        <KpiCard label="Units in stock" value={data.total_units.toLocaleString()} />
        <KpiCard label="Value at cost" value={currency(data.total_value_at_cost, cur)} />
        <KpiCard label="Potential profit" value={currency(data.potential_profit, cur)} tone="good" />
      </div>

      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-ink-900 mb-4">
          Out of stock ({data.out_of_stock_items.length})
        </h2>
        {data.out_of_stock_items.length === 0 ? (
          <p className="text-[13px] text-ink-500">Nothing is out of stock. 🎉</p>
        ) : (
          <table className="w-full text-left text-[13.5px]">
            <thead className="text-[11.5px] uppercase tracking-wider text-ink-500 border-b border-ink-100">
              <tr>
                <th className="py-2 font-semibold">Product</th>
                <th className="py-2 font-semibold">SKU</th>
                <th className="py-2 font-semibold">Category</th>
              </tr>
            </thead>
            <tbody>
              {data.out_of_stock_items.map((p) => (
                <tr key={p.product_id} className="border-b border-ink-50 last:border-0">
                  <td className="py-2 text-ink-800">{p.name}</td>
                  <td className="py-2 text-ink-600 font-mono text-[12px]">{p.sku || "—"}</td>
                  <td className="py-2 text-ink-600">{p.category ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-ink-900 mb-4">
          Low stock ({data.low_stock_items.length})
        </h2>
        {data.low_stock_items.length === 0 ? (
          <p className="text-[13px] text-ink-500">No items are low on stock.</p>
        ) : (
          <table className="w-full text-left text-[13.5px]">
            <thead className="text-[11.5px] uppercase tracking-wider text-ink-500 border-b border-ink-100">
              <tr>
                <th className="py-2 font-semibold">Product</th>
                <th className="py-2 font-semibold">SKU</th>
                <th className="py-2 font-semibold text-right">Quantity</th>
                <th className="py-2 font-semibold text-right">Threshold</th>
              </tr>
            </thead>
            <tbody>
              {data.low_stock_items.map((p) => (
                <tr key={p.product_id} className="border-b border-ink-50 last:border-0">
                  <td className="py-2 text-ink-800">{p.name}</td>
                  <td className="py-2 text-ink-600 font-mono text-[12px]">{p.sku || "—"}</td>
                  <td className="py-2 text-right font-medium text-amber-700">{p.quantity}</td>
                  <td className="py-2 text-right text-ink-600">{p.threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Purchases Tab
// ---------------------------------------------------------------------------
function PurchasesTab({ data, currency: cur }: { data: PurchasesSummary; currency: string }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total spend" value={currency(data.total_spend, cur)} />
        <KpiCard label="Purchases" value={String(data.purchase_count)} />
        <KpiCard label="Unpaid" value={currency(data.unpaid_total, cur)} tone="warn" />
      </div>

      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Top suppliers</h2>
        {data.by_supplier.length === 0 ? (
          <p className="text-[13px] text-ink-500">No purchases in this period.</p>
        ) : (
          <table className="w-full text-left text-[13.5px]">
            <thead className="text-[11.5px] uppercase tracking-wider text-ink-500 border-b border-ink-100">
              <tr>
                <th className="py-2 font-semibold">Supplier</th>
                <th className="py-2 font-semibold text-right">Orders</th>
                <th className="py-2 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.by_supplier.map((s, i) => (
                <tr key={i} className="border-b border-ink-50 last:border-0">
                  <td className="py-2 text-ink-800">{s.supplier}</td>
                  <td className="py-2 text-right text-ink-600">{s.count}</td>
                  <td className="py-2 text-right font-medium text-ink-900">{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profit Tab
// ---------------------------------------------------------------------------
function ProfitTab({ data, currency: cur }: { data: ProfitReport; currency: string }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Revenue" value={currency(data.revenue, cur)} />
        <KpiCard label="COGS" value={currency(data.cost_of_goods_sold, cur)} />
        <KpiCard label="Gross profit" value={currency(data.gross_profit, cur)} tone="good" />
        <KpiCard label="Margin" value={`${data.margin_percent.toFixed(2)}%`} tone="good" />
      </div>

      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Profit by product</h2>
        {data.by_product.length === 0 ? (
          <p className="text-[13px] text-ink-500">No sales in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="text-[11.5px] uppercase tracking-wider text-ink-500 border-b border-ink-100">
                <tr>
                  <th className="py-2 font-semibold">Product</th>
                  <th className="py-2 font-semibold text-right">Units</th>
                  <th className="py-2 font-semibold text-right">Revenue</th>
                  <th className="py-2 font-semibold text-right">Cost</th>
                  <th className="py-2 font-semibold text-right">Profit</th>
                  <th className="py-2 font-semibold text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.by_product.map((p) => (
                  <tr key={p.product_id} className="border-b border-ink-50 last:border-0">
                    <td className="py-2 text-ink-800">{p.name}</td>
                    <td className="py-2 text-right text-ink-600">{p.units_sold}</td>
                    <td className="py-2 text-right text-ink-800">{p.revenue}</td>
                    <td className="py-2 text-right text-ink-600">{p.cost}</td>
                    <td className="py-2 text-right font-medium text-accent-700">{p.profit}</td>
                    <td className="py-2 text-right text-ink-600">{p.margin_percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}