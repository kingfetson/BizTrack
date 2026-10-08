"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Product = {
  id: number;
  name: string;
  sku: string;
  price: string;
};

type Props = {
  businessId: number;
  onAdd: (product: Product) => void;
};

export default function ProductPicker({ businessId, onAdd }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    api<Product[]>(`/businesses/${businessId}/products/?is_active=true`)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [businessId]);

  const filtered = useMemo(() => {
    if (!search) return products.slice(0, 20);
    const q = search.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [products, search]);

  return (
    <div>
      <input
        id="product-search"
        name="product-search"
$3type="text"
        placeholder="Search products by name or SKU…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
      />

      <div className="mt-3 max-h-[420px] overflow-y-auto rounded-lg border border-ink-200 divide-y divide-ink-100">
        {loading ? (
          <div className="p-6 text-center text-ink-400 text-[13px]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-ink-400 text-[13px]">
            No products match.
          </div>
        ) : (
          filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onAdd(p)}
              className="w-full text-left px-4 py-3 hover:bg-ink-50 transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-ink-900 truncate">
                  {p.name}
                </p>
                {p.sku && (
                  <p className="text-[12px] text-ink-500 font-mono truncate">
                    {p.sku}
                  </p>
                )}
              </div>
              <div className="text-[13.5px] font-medium text-ink-700 shrink-0">
                {p.price}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}