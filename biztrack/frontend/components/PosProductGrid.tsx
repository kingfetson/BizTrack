"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Product = {
  id: number;
  name: string;
  sku: string;
  price: string;
  category: number | null;
  category_name: string | null;
  is_active: boolean;
};

type Category = {
  id: number;
  name: string;
};

type Props = {
  businessId: number;
  currency: string;
  search: string;
  onAdd: (product: Product) => void;
};

export default function PosProductGrid({ businessId, currency, search, onAdd }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<Product[]>(`/businesses/${businessId}/products/?is_active=true`),
      api<Category[]>(`/businesses/${businessId}/categories/`).catch(() => []),
    ])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== null) {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, activeCategory, search]);

  if (loading) {
    return (
      <div className="flex-1 grid place-items-center">
        <span className="inline-block w-6 h-6 border-2 border-ink-200 dark:border-white/10 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Category tabs */}
      <div className="px-4 py-3 border-b border-ink-200/70 dark:border-white/10 bg-white dark:bg-ink-900 overflow-x-auto shrink-0">
        <div className="flex gap-1.5">
          <CategoryPill
            label="All"
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          />
          {categories.map((c) => (
            <CategoryPill
              key={c.id}
              label={c.name}
              active={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="h-full grid place-items-center text-ink-500 dark:text-ink-400 text-[13.5px]">
            No products match your search.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => onAdd(p)}
                className="text-left p-3.5 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-white/10 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-card transition-all focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <p className="text-[13.5px] font-medium text-ink-900 dark:text-ink-100 leading-snug line-clamp-2 min-h-[2.4em]">
                  {p.name}
                </p>
                {p.sku && (
                  <p className="text-[11px] font-mono text-ink-500 dark:text-ink-400 mt-1 truncate">
                    {p.sku}
                  </p>
                )}
                <p className="text-[13.5px] font-semibold text-brand-600 dark:text-brand-400 mt-2">
                  {currency} {p.price}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-brand-600 text-white"
          : "text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}