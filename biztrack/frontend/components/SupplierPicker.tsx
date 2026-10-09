"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Supplier = {
  id: number;
  name: string;
  phone: string;
  email: string;
};

type Props = {
  businessId: number;
  selectedId: number | null;
  onSelect: (supplier: Supplier | null) => void;
};

export default function SupplierPicker({ businessId, selectedId, onSelect }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    api<Supplier[]>(`/businesses/${businessId}/suppliers/`)
      .then(setSuppliers)
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  }, [businessId]);

  const filtered = useMemo(() => {
    if (!search) return suppliers.slice(0, 20);
    const q = search.toLowerCase();
    return suppliers
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.phone && s.phone.toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [suppliers, search]);

  const selected = suppliers.find((s) => s.id === selectedId) ?? null;

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
            aria-label="Remove supplier"
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
          + Add a saved supplier
        </button>
      )}

      {open && !selected && (
        <div className="mt-3 rounded-lg border border-ink-200 overflow-hidden">
          <div className="p-2 border-b border-ink-100">
            <input
              id="supplier-picker-search"
              name="supplier-picker-search"
              aria-label="Search suppliers"
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
                No matching suppliers.
              </p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSelect(s);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-ink-50 transition-colors"
                >
                  <p className="text-[13.5px] font-medium text-ink-900">{s.name}</p>
                  {s.phone && (
                    <p className="text-[12px] text-ink-500">{s.phone}</p>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="p-2 border-t border-ink-100 text-center">
            <a
              href="/dashboard/suppliers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12.5px] text-brand-600 hover:text-brand-700"
            >
              Manage suppliers →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}