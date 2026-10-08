"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

type Product = {
  id: number;
  name: string;
  sku: string;
  price: string;
  cost: string;
  category: number | null;
  category_name: string | null;
  is_active: boolean;
  stock_quantity?: number;
  stock_low?: boolean;
};

type Category = { id: number; name: string };

export default function ProductsPage() {
  const { activeBusiness, loading: businessLoading } = useBusiness();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  async function loadProducts(businessId: number) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (statusFilter) params.set("is_active", statusFilter);
      const qs = params.toString();
      const url = `/businesses/${businessId}/products/${qs ? "?" + qs : ""}`;
      const data = await api<Product[]>(url);

      const withStock = await Promise.all(
        data.map(async (p) => {
          try {
            const s = await api<{ quantity: number; is_low: boolean }>(
              `/businesses/${businessId}/products/${p.id}/stock/`
            );
            return { ...p, stock_quantity: s.quantity, stock_low: s.is_low };
          } catch {
            return p;
          }
        })
      );
      setProducts(withStock);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories(businessId: number) {
    try {
      const data = await api<Category[]>(`/businesses/${businessId}/categories/`);
      setCategories(data);
    } catch {}
  }

  useEffect(() => {
    if (!activeBusiness) return;
    loadCategories(activeBusiness.id);
  }, [activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    const t = setTimeout(() => loadProducts(activeBusiness.id), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness, search, categoryFilter, statusFilter]);

  if (!businessLoading && !activeBusiness) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Products</h1>
        <Card className="mt-6 p-10 text-center">
          <p className="text-ink-600">Create a business first to add products.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Products</h1>
          <p className="text-[14px] text-ink-500 mt-1">
            Manage products in {activeBusiness?.name ?? "your business"}.
          </p>
        </div>
        <Link href="/dashboard/products/new">
          <Button size="md">+ New product</Button>
        </Link>
      </div>

      <Card className="p-4 mb-6" variant="light">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by name, SKU, barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
          >
            <option value="">All status</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-4">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <Card className="p-10 text-center">
          <span className="inline-block w-5 h-5 border-2 border-ink-200 border-t-brand-500 rounded-full animate-spin" />
        </Card>
      )}

      {!loading && products.length === 0 && !error && (
        <Card className="p-10 md:p-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 grid place-items-center text-2xl mb-4">
            📦
          </div>
          <h3 className="text-[15px] font-semibold text-ink-900">No products yet</h3>
          <p className="text-[13.5px] text-ink-500 mt-1.5 max-w-sm mx-auto">
            Add your first product to start tracking inventory and sales.
          </p>
          <Link href="/dashboard/products/new">
            <Button className="mt-5">+ Add product</Button>
          </Link>
        </Card>
      )}

      {!loading && products.length > 0 && (
        <Card className="p-0 overflow-hidden" variant="elevated">
          <table className="w-full text-left">
            <thead className="bg-ink-50 border-b border-ink-200/70">
              <tr>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Product</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">SKU</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Category</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500 text-right">Stock</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500 text-right">Price</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500 text-right">Cost</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60 transition-colors"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/products/${p.id}`}
                      className="font-medium text-ink-900 hover:text-brand-600"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[13.5px] text-ink-600 font-mono">{p.sku || "—"}</td>
                  <td className="px-5 py-4 text-[13.5px] text-ink-600">{p.category_name || "—"}</td>
                  <td className="px-5 py-4 text-[13.5px] text-right">
                    {p.stock_quantity === undefined ? (
                      <span className="text-ink-400">—</span>
                    ) : p.stock_low ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {p.stock_quantity}
                      </span>
                    ) : (
                      <span className="text-ink-900">{p.stock_quantity}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-[13.5px] text-ink-900 font-medium text-right">{p.price}</td>
                  <td className="px-5 py-4 text-[13.5px] text-ink-600 text-right">{p.cost}</td>
                  <td className="px-5 py-4">
                    {p.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded-full bg-accent-50 text-accent-700">
                        <span className="w-1 h-1 rounded-full bg-accent-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded-full bg-ink-100 text-ink-500">
                        Inactive
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