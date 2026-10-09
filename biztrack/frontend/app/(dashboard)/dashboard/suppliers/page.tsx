"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

type Supplier = {
  id: number;
  name: string;
  phone: string;
  email: string;
  created_at: string;
};

export default function SuppliersPage() {
  const { activeBusiness, loading: businessLoading } = useBusiness();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);

  async function load(businessId: number) {
    setLoading(true);
    setError("");
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await api<Supplier[]>(`/businesses/${businessId}/suppliers/${qs}`);
      setSuppliers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeBusiness) return;
    const t = setTimeout(() => load(activeBusiness.id), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness, search]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setCreating(true);
    try {
      await api(`/businesses/${activeBusiness.id}/suppliers/`, {
        method: "POST",
        body: JSON.stringify({ name: newName, phone: newPhone, email: newEmail }),
      });
      setNewName(""); setNewPhone(""); setNewEmail("");
      setShowCreate(false);
      await load(activeBusiness.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  if (!businessLoading && !activeBusiness) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Suppliers</h1>
        <Card className="mt-6 p-10 text-center">
          <p className="text-ink-600">Create a business first to add suppliers.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Suppliers</h1>
          <p className="text-[14px] text-ink-500 mt-1">
            Who you buy stock from.
          </p>
        </div>
        <Button size="md" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "+ New supplier"}
        </Button>
      </div>

      {showCreate && (
        <Card className="p-6 mb-6">
          <h2 className="text-[15px] font-semibold text-ink-900 mb-4">New supplier</h2>
          <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-4">
            <Input label="Name" name="name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            <Input label="Phone" name="phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Optional" />
            <Input label="Email" name="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Optional" />
            <div className="flex items-end">
              <Button type="submit" loading={creating} className="w-full">Create</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-4 mb-6" variant="light">
        <input
          id="supplier-search"
          name="supplier-search"
          type="text"
          placeholder="Search by name, phone, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
        />
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
      ) : suppliers.length === 0 ? (
        <Card className="p-10 md:p-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 grid place-items-center text-2xl mb-4">
            ◆
          </div>
          <h3 className="text-[15px] font-semibold text-ink-900">No suppliers yet</h3>
          <p className="text-[13.5px] text-ink-500 mt-1.5 max-w-sm mx-auto">
            Track who you buy stock from. Purchases link to suppliers in a later stage.
          </p>
          <Button className="mt-5" onClick={() => setShowCreate(true)}>
            + Add supplier
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden" variant="elevated">
          <table className="w-full text-left">
            <thead className="bg-ink-50 border-b border-ink-200/70">
              <tr>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Name</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Phone</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Email</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Added</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/suppliers/${s.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[13.5px] text-ink-600">{s.phone || "—"}</td>
                  <td className="px-5 py-4 text-[13.5px] text-ink-600 truncate max-w-[240px]">{s.email || "—"}</td>
                  <td className="px-5 py-4 text-[12.5px] text-ink-500">
                    {new Date(s.created_at).toLocaleDateString()}
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