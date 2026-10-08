"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);
  const { activeBusiness } = useBusiness();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
  }, [activeBusiness, productId]);

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
        <p className="text-[14px] text-ink-500 mt-1">ID #{productId}</p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
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

            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-5">Pricing</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Selling price" type="number" step="0.01" min="0" value={form.price} onChange={update("price")} required />
                <Input label="Cost" type="number" step="0.01" min="0" value={form.cost} onChange={update("cost")} />
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
    </div>
  );
}