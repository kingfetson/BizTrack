"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import StockAdjustModal from "@/components/StockAdjustModal";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

type Category = { id: number; name: string };

type Product = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  cost: string;
  category: number | null;
  is_active: boolean;
};

type Stock = {
  product: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  low_stock_threshold: number;
  is_low: boolean;
};

type Movement = {
  id: number;
  reason: string;
  quantity_delta: number;
  quantity_after: number;
  note: string;
  created_by_email: string | null;
  created_at: string;
};

const REASON_LABELS: Record<string, string> = {
  INITIAL: "Initial",
  PURCHASE: "Purchase",
  SALE: "Sale",
  ADJUSTMENT: "Adjustment",
  RETURN: "Return",
  TRANSFER: "Transfer",
  LOSS: "Loss / damage",
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);
  const { activeBusiness } = useBusiness();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Product | null>(null);
  const [stock, setStock] = useState<Stock | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const reloadStock = useCallback(async () => {
    if (!activeBusiness) return;
    try {
      const [s, m] = await Promise.all([
        api<Stock>(`/businesses/${activeBusiness.id}/products/${productId}/stock/`),
        api<Movement[]>(`/businesses/${activeBusiness.id}/products/${productId}/movements/`),
      ]);
      setStock(s);
      setMovements(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock");
    }
  }, [activeBusiness, productId]);

  useEffect(() => {
    if (!activeBusiness || !productId) return;
    Promise.all([
      api<Product>(`/businesses/${activeBusiness.id}/products/${productId}/`),
      api<Category[]>(`/businesses/${activeBusiness.id}/categories/`).catch(() => []),
    ])
      .then(([product, cats]) => {
        setForm(product);
        setCategories(cats);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));

    reloadStock();
  }, [activeBusiness, productId, reloadStock]);

  function update<K extends keyof Product>(field: K) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
      const target = e.target as HTMLInputElement;
      const value = target.type === "checkbox" ? target.checked : target.value;
      setForm((f) => (f ? { ...f, [field]: value } : f));
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness || !form) return;
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode,
        description: form.description,
        price: form.price,
        cost: form.cost || "0",
        category: form.category ? Number(form.category) : null,
        is_active: form.is_active,
      };
      await api(`/businesses/${activeBusiness.id}/products/${productId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      router.push("/dashboard/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!activeBusiness) return;
    setSaving(true);
    try {
      await api(`/businesses/${activeBusiness.id}/products/${productId}/`, {
        method: "DELETE",
      });
      router.push("/dashboard/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setSaving(false);
    }
  }

  async function handleAdjustStock(data: { delta: number; reason: string; note: string }) {
    if (!activeBusiness) return;
    await api(`/businesses/${activeBusiness.id}/products/${productId}/stock/adjust/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    setModalOpen(false);
    await reloadStock();
  }

  if (loading) {
    return (
      <Card className="p-10 text-center">
        <span className="inline-block w-5 h-5 border-2 border-ink-200 border-t-brand-500 rounded-full animate-spin" />
      </Card>
    );
  }

  if (!form) {
    return (
      <Card className="p-10 text-center">
        <p className="text-ink-600">{error || "Product not found."}</p>
        <Link href="/dashboard/products">
          <Button variant="ghost" className="mt-4">Back to products</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/products" className="text-[13px] text-ink-500 hover:text-ink-900">
          ← Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink-900 tracking-tight">Edit product</h1>
        <p className="text-[14px] text-ink-500 mt-1">
          {form.name} · ID #{productId}
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-5">Basic information</h2>
              <div className="space-y-4">
                <Input label="Product name" value={form.name} onChange={update("name")} required />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="SKU" value={form.sku} onChange={update("sku")} />
                  <Input label="Barcode" value={form.barcode} onChange={update("barcode")} />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={update("description")}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
                  />
                </div>
              </div>
            </Card>

            {/* Pricing */}
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-5">Pricing</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Selling price" type="number" step="0.01" min="0" value={form.price} onChange={update("price")} required />
                <Input label="Cost" type="number" step="0.01" min="0" value={form.cost} onChange={update("cost")} />
              </div>
            </Card>

            {/* Movement history */}
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-5">
                Movement history
              </h2>
              {movements.length === 0 ? (
                <p className="text-[13px] text-ink-500">No movements yet.</p>
              ) : (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-ink-500 border-b border-ink-100">
                        <th className="px-2 py-2 font-semibold">Date</th>
                        <th className="px-2 py-2 font-semibold">Reason</th>
                        <th className="px-2 py-2 font-semibold text-right">Change</th>
                        <th className="px-2 py-2 font-semibold text-right">After</th>
                        <th className="px-2 py-2 font-semibold">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => (
                        <tr key={m.id} className="border-b border-ink-50 last:border-0">
                          <td className="px-2 py-2 text-ink-600 whitespace-nowrap">
                            {new Date(m.created_at).toLocaleString()}
                          </td>
                          <td className="px-2 py-2 text-ink-700">
                            {REASON_LABELS[m.reason] ?? m.reason}
                          </td>
                          <td className={`px-2 py-2 text-right font-medium ${
                            m.quantity_delta > 0
                              ? "text-accent-700"
                              : m.quantity_delta < 0
                              ? "text-red-600"
                              : "text-ink-400"
                          }`}>
                            {m.quantity_delta > 0 ? "+" : ""}{m.quantity_delta}
                          </td>
                          <td className="px-2 py-2 text-right text-ink-800 font-medium">
                            {m.quantity_after}
                          </td>
                          <td className="px-2 py-2 text-ink-500 truncate max-w-[160px]">
                            {m.note || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            {/* Stock card */}
            <Card className={`p-6 ${stock?.is_low ? "border-amber-300 bg-amber-50/40" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">Stock</h2>
                {stock?.is_low && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                    <span className="w-1 h-1 rounded-full bg-amber-500" />
                    Low
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-semibold text-ink-900 tracking-tight">
                  {stock?.quantity ?? "—"}
                </p>
                <span className="text-[13px] text-ink-500">units</span>
              </div>
              <p className="text-[12.5px] text-ink-500 mt-1">
                Alert when below {stock?.low_stock_threshold ?? 5}
              </p>
              <Button
                type="button"
                variant="accent"
                className="w-full mt-4"
                onClick={() => setModalOpen(true)}
              >
                Adjust stock
              </Button>
            </Card>

            {/* Organization */}
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-5">Organization</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Category</label>
                  <select
                    value={form.category ?? ""}
                    onChange={update("category")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={update("is_active")}
                    className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-[13.5px] text-ink-700">Active</span>
                </label>
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Actions</h2>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 mb-4">
                  <p className="text-[13px] text-red-700">{error}</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button type="submit" loading={saving}>Save changes</Button>
                <Link href="/dashboard/products">
                  <Button variant="ghost" type="button" className="w-full">Cancel</Button>
                </Link>
              </div>
            </Card>

            {/* Danger */}
            <Card className="p-6 border-red-200">
              <h2 className="text-[15px] font-semibold text-red-700 mb-3">Danger zone</h2>
              {confirmDelete ? (
                <div className="space-y-3">
                  <p className="text-[13px] text-red-700">Delete this product permanently?</p>
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={onDelete} type="button">Yes, delete</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} type="button">Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" type="button" onClick={() => setConfirmDelete(true)}>
                  Delete product
                </Button>
              )}
            </Card>
          </div>
        </div>
      </form>

      {stock && (
        <StockAdjustModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleAdjustStock}
          productName={form.name}
          currentQuantity={stock.quantity}
        />
      )}
    </div>
  );
}