"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
};

type Props = {
  businessId: number;
  selectedId: number | null;
  onSelect: (customer: Customer | null) => void;
};

export default function CustomerPicker({ businessId, selectedId, onSelect }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    api<Customer[]>(`/businesses/${businessId}/customers/`)
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, [businessId]);

  const filtered = useMemo(() => {
    if (!search) return customers.slice(0, 20);
    const q = search.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [customers, search]);

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  return (
    <div>
      {selected ? (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-ink-200 bg-ink-50">
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-ink-900 truncate">
              {selected.name}
            </p>
            {selected.phone && (
              <p className="text-[12px] text-ink-500">{selected.phone}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-ink-400 hover:text-red-600 text-[13px] ml-2"
            aria-label="Remove customer"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full text-left px-3.5 py-2.5 rounded-lg border border-dashed border-ink-300 text-[13.5px] text-ink-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
        >
          + Add a saved customer
        </button>
      )}

      {open && !selected && (
        <div className="mt-3 rounded-lg border border-ink-200 overflow-hidden">
          <div className="p-2 border-b border-ink-100">
            <input
              id="customer-picker-search"
              name="customer-picker-search"
              aria-label="Search customers"
              type="text"
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded border border-ink-200 text-[13.5px] focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto divide-y divide-ink-100">
            {loading ? (
              <p className="p-4 text-center text-[13px] text-ink-400">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-center text-[13px] text-ink-400">
                No matching customers.
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelect(c);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-ink-50 transition-colors"
                >
                  <p className="text-[13.5px] font-medium text-ink-900">{c.name}</p>
                  {c.phone && (
                    <p className="text-[12px] text-ink-500">{c.phone}</p>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="p-2 border-t border-ink-100 text-center">
            <a
              href="/dashboard/customers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12.5px] text-brand-600 hover:text-brand-700"
            >
              Manage customers →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}