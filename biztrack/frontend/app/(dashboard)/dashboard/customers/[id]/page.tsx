"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  total_spent: string;
  sale_count: number;
  last_purchase_at: string | null;
};

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = Number(params.id);
  const { activeBusiness } = useBusiness();

  const [form, setForm] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!activeBusiness || !customerId) return;
    api<Customer>(`/businesses/${activeBusiness.id}/customers/${customerId}/`)
      .then(setForm)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"))
      .finally(() => setLoading(false));
  }, [activeBusiness, customerId]);

  function update<K extends keyof Customer>(field: K) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setForm((f) => (f ? { ...f, [field]: e.target.value } : f));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness || !form) return;
    setError("");
    setSaving(true);
    try {
      await api(`/businesses/${activeBusiness.id}/customers/${customerId}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          notes: form.notes,
        }),
      });
      router.push("/dashboard/customers");
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
      await api(`/businesses/${activeBusiness.id}/customers/${customerId}/`, {
        method: "DELETE",
      });
      router.push("/dashboard/customers");
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
        <p className="text-ink-600">{error || "Customer not found."}</p>
        <Link href="/dashboard/customers">
          <Button variant="ghost" className="mt-4">Back to customers</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/customers" className="text-[13px] text-ink-500 hover:text-ink-900">
          ← Back to customers
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink-900 tracking-tight">Edit customer</h1>
        <p className="text-[14px] text-ink-500 mt-1">{form.name}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={onSubmit}>
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-5">Contact</h2>
              <div className="space-y-4">
                <Input label="Name" name="name" value={form.name} onChange={update("name")} required />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Phone" name="phone" value={form.phone} onChange={update("phone")} />
                  <Input label="Email" name="email" type="email" value={form.email} onChange={update("email")} />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={update("address")}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Notes</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={update("notes")}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 mt-4">
                  <p className="text-[13px] text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <Button type="submit" loading={saving}>Save changes</Button>
                <Link href="/dashboard/customers">
                  <Button variant="ghost" type="button">Cancel</Button>
                </Link>
              </div>
            </Card>
          </form>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Stats</h2>
            <div className="space-y-3">
              <div>
                <p className="text-[11.5px] uppercase tracking-wider text-ink-500 mb-0.5">Total spent</p>
                <p className="text-xl font-semibold text-ink-900">{form.total_spent ?? "0.00"}</p>
              </div>
              <div>
                <p className="text-[11.5px] uppercase tracking-wider text-ink-500 mb-0.5">Sales</p>
                <p className="text-xl font-semibold text-ink-900">{form.sale_count ?? 0}</p>
              </div>
              <div>
                <p className="text-[11.5px] uppercase tracking-wider text-ink-500 mb-0.5">Last purchase</p>
                <p className="text-[13.5px] text-ink-800">
                  {form.last_purchase_at ? new Date(form.last_purchase_at).toLocaleString() : "—"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-red-200">
            <h2 className="text-[15px] font-semibold text-red-700 mb-3">Danger zone</h2>
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-[13px] text-red-700">
                  Delete this customer? Their sales will be preserved, but will no longer be linked.
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={onDelete} type="button">Yes, delete</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} type="button">Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" type="button" onClick={() => setConfirmDelete(true)}>
                Delete customer
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}