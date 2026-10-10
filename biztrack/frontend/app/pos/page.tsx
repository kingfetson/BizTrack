"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PosProductGrid from "@/components/PosProductGrid";
import PosCart, { type CartItem } from "@/components/PosCart";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

type Product = {
  id: number;
  name: string;
  sku: string;
  price: string;
  category: number | null;
  category_name: string | null;
  is_active: boolean;
};

export default function PosPage() {
  const router = useRouter();
  const { activeBusiness, loading: businessLoading } = useBusiness();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);

  const addProduct = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: product.price,
          quantity: 1,
        },
      ];
    });
  }, []);

  // Barcode-scanner behavior: when Enter is hit in search and there's exactly
  // one matching product, add it and clear the search.
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && search.trim()) {
      // We rely on the product grid's filter to fetch matches. But for barcode
      // scanning, we want exact SKU match. Do a quick fetch here.
      e.preventDefault();
      api<Product[]>(
        `/businesses/${activeBusiness?.id}/products/?search=${encodeURIComponent(search.trim())}`
      )
        .then((results) => {
          // Prefer exact SKU match
          const exact = results.find(
            (p) => p.sku.toLowerCase() === search.trim().toLowerCase()
          );
          const target = exact || (results.length === 1 ? results[0] : null);
          if (target) {
            addProduct(target);
            setSearch("");
            setToast(`Added ${target.name}`);
            setTimeout(() => setToast(""), 1200);
          }
        })
        .catch(() => {});
    }
  }

  function updateQty(productId: number, qty: number) {
    if (qty <= 0) return removeItem(productId);
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, quantity: qty } : c))
    );
  }

  function removeItem(productId: number) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  async function completeSale(
    paymentMethod: string,
    customerName: string,
    customerPhone: string
  ) {
    if (!activeBusiness) return;
    if (cart.length === 0) {
      setError("Cart is empty.");
      return;
    }
    setError("");
    setCompleting(true);
    try {
      const payload = {
        items: cart.map((c) => ({
          product_id: c.productId,
          quantity: c.quantity,
          unit_price: c.unitPrice,
        })),
        payment_method: paymentMethod,
        customer_name: customerName,
        customer_phone: customerPhone,
        note: "POS sale",
      };
      const sale = await api<{ id: number }>(
        `/businesses/${activeBusiness.id}/sales/`,
        { method: "POST", body: JSON.stringify(payload) }
      );
      // Navigate to receipt — replace so back goes to POS, not receipt
      router.replace(`/pos/receipt/${sale.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete sale");
      setCompleting(false);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape") {
        if (document.activeElement === searchRef.current) {
          setSearch("");
        } else if (cart.length > 0) {
          if (confirm("Clear the cart?")) setCart([]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart.length]);

  if (!businessLoading && !activeBusiness) {
    return (
      <div className="flex-1 grid place-items-center p-6">
        <div className="text-center">
          <p className="text-ink-600 dark:text-ink-300">
            No active business. Create one to use the POS.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* Left: search + product grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-ink-200/70 dark:border-white/10 bg-white dark:bg-ink-900 shrink-0">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search products or scan barcode… (F2)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-4 py-2.5 pl-10 rounded-lg border border-ink-200 dark:border-white/10 bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-100 placeholder:text-ink-400 dark:placeholder:text-ink-500 text-[14px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 dark:text-ink-500">
              ⌕
            </span>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {error && (
            <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-3 py-2">
              <p className="text-[12.5px] text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          {toast && (
            <div className="mt-2 rounded-lg bg-accent-50 dark:bg-accent-950/40 border border-accent-200 dark:border-accent-900/50 px-3 py-2">
              <p className="text-[12.5px] text-accent-700 dark:text-accent-300">{toast}</p>
            </div>
          )}
        </div>

        {/* Product grid */}
        {activeBusiness && (
          <PosProductGrid
            businessId={activeBusiness.id}
            currency={activeBusiness.currency}
            search={search}
            onAdd={addProduct}
          />
        )}
      </div>

      {/* Right: cart */}
      <PosCart
        items={cart}
        currency={activeBusiness?.currency ?? "KES"}
        onUpdateQty={updateQty}
        onRemove={removeItem}
        onClear={clearCart}
        onComplete={completeSale}
        completing={completing}
      />
    </div>
  );
}