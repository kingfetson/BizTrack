"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

type Category = {
  id: number;
  name: string;
  description: string;
  product_count?: number;
};

export default function CategoriesPage() {
  const { activeBusiness } = useBusiness();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  async function load(businessId: number) {
    setLoading(true);
    setError("");
    try {
      const data = await api<Category[]>(`/businesses/${businessId}/categories/`);
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeBusiness) load(activeBusiness.id);
  }, [activeBusiness]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setCreating(true);
    try {
      await api(`/businesses/${activeBusiness.id}/categories/`, {
        method: "POST",
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      setNewName("");
      setNewDesc("");
      await load(activeBusiness.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDesc(c.description);
  }

  async function saveEdit(id: number) {
    if (!activeBusiness) return;
    try {
      await api(`/businesses/${activeBusiness.id}/categories/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      setEditingId(null);
      await load(activeBusiness.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function onDelete(id: number) {
    if (!activeBusiness) return;
    if (!confirm("Delete this category? Products will become uncategorized.")) return;
    try {
      await api(`/businesses/${activeBusiness.id}/categories/${id}/`, {
        method: "DELETE",
      });
      await load(activeBusiness.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/products"
          className="text-[13px] text-ink-500 hover:text-ink-900"
        >
          ← Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink-900 tracking-tight">
          Categories
        </h1>
        <p className="text-[14px] text-ink-500 mt-1">
          Organize products in {activeBusiness?.name ?? "your business"}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-[15px] font-semibold text-ink-900 mb-4">
              Add category
            </h2>
            <form onSubmit={onCreate} className="space-y-4">
              <Input
                label="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="e.g. Beverages"
              />
              <div>
                <label className="block text-[13px] font-medium text-ink-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
                  placeholder="Optional"
                />
              </div>
              <Button type="submit" loading={creating} className="w-full">
                + Add category
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-4">
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <Card className="p-10 text-center">
              <span className="inline-block w-5 h-5 border-2 border-ink-200 border-t-brand-500 rounded-full animate-spin" />
            </Card>
          ) : categories.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-ink-500">No categories yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {categories.map((c) => (
                <Card key={c.id} className="p-5">
                  {editingId === c.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={2}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(c.id)} type="button">
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          type="button"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink-900">{c.name}</p>
                        {c.description && (
                          <p className="text-[13px] text-ink-500 mt-0.5">
                            {c.description}
                          </p>
                        )}
                        <p className="text-[12px] text-ink-400 mt-1">
                          {c.product_count ?? 0} product
                          {(c.product_count ?? 0) === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(c)}
                          type="button"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(c.id)}
                          type="button"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}