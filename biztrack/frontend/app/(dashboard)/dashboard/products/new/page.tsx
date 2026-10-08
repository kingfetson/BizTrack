"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

type Category = { id: number; name: string };

export default function NewProductPage() {
  const router = useRouter();
  const { activeBusiness } = useBusiness();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    price: "",
    cost: "0",
    category: "",
    is_active: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeBusiness) return;
    api<Category[]>(`/businesses/${activeBusiness.id}/categories/`)
      .then(setCategories)
      .catch(() => {});
  }, [activeBusiness]);

  function update<K extends keyof typeof form>(field: K) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
      const target = e.target as HTMLInputElement;
      const value = target.type === "checkbox" ? target.checked : target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setError("");
    setLoading(true);
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
      await api(`/businesses/${activeBusiness.id}/products/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push("/dashboard/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/products" className="text-[13px] text-ink-500 hover:text-ink-900">
          ← Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink-900 tracking-tight">New product</h1>
        <p className="text-[14px] text-ink-500 mt-1">
          Add a product to {activeBusiness?.name ?? "your business"}.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-5">
                Basic information
              </h2>
              <div className="space-y-4">
                <Input
                  label="Product name"
                  value={form.name}
                  onChange={update("name")}
                  required
                  placeholder="e.g. Coca-Cola 500ml"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="SKU" value={form.sku} onChange={update("sku")} placeholder="COKE-500" hint="Unique per business (optional)" />
                  <Input label="Barcode" value={form.barcode} onChange={update("barcode")} placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={update("description")}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-5">Pricing</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Selling price" type="number" step="0.01" min="0" value={form.price} onChange={update("price")} required placeholder="0.00" />
                <Input label="Cost" type="number" step="0.01" min="0" value={form.cost} onChange={update("cost")} placeholder="0.00" hint="What you paid for it" />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-5">Organization</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={update("category")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[12.5px] text-ink-500">
                    <Link href="/dashboard/products/categories" className="text-brand-600">
                      Manage categories →
                    </Link>
                  </p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={update("is_active")} className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-[13.5px] text-ink-700">Active (visible for sale)</span>
                </label>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Actions</h2>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 mb-4">
                  <p className="text-[13px] text-red-700">{error}</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button type="submit" loading={loading}>Create product</Button>
                <Link href="/dashboard/products">
                  <Button variant="ghost" type="button" className="w-full">Cancel</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}