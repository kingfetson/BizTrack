"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ProductPicker from "@/components/ProductPicker";
import SupplierPicker from "@/components/SupplierPicker";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

type Product = {
  id: number;
  name: string;
  sku: string;
  price: string;
};

type Supplier = {
  id: number;
  name: string;
  phone: string;
  email: string;
};

type CartItem = {
  product: Product;
  quantity: number;
  unit_cost: string;
};

export default function NewPurchasePage() {
  const router = useRouter();
  const { activeBusiness } = useBusiness();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addProduct(p: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === p.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === p.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      // Default cost to 0 - the cashier fills in what they paid
      return [...prev, { product: p, quantity: 1, unit_cost: "0.00" }];
    });
  }

  function updateQty(id: number, qty: number) {
    if (qty <= 0) return removeItem(id);
    setCart((prev) =>
      prev.map((c) => (c.product.id === id ? { ...c, quantity: qty } : c))
    );
  }

  function updateCost(id: number, cost: string) {
    setCart((prev) =>
      prev.map((c) => (c.product.id === id ? { ...c, unit_cost: cost } : c))
    );
  }

  function removeItem(id: number) {
    setCart((prev) => prev.filter((c) => c.product.id !== id));
  }

  function handleSelectSupplier(s: Supplier | null) {
    setSelectedSupplier(s);
    if (s) {
      setSupplierName(s.name);
      setSupplierPhone(s.phone || "");
    }
  }

  const total = cart.reduce(
    (sum, c) => sum + Number(c.unit_cost) * c.quantity,
    0
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    if (cart.length === 0) {
      setError("Add at least one product to the purchase.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
          unit_cost: c.unit_cost,
        })),
        supplier_id: selectedSupplier?.id ?? null,
        supplier_name: supplierName,
        supplier_phone: supplierPhone,
        is_paid: isPaid,
        note,
      };
      const purchase = await api<{ id: number }>(
        `/businesses/${activeBusiness.id}/purchases/`,
        { method: "POST", body: JSON.stringify(payload) }
      );
      router.replace(`/dashboard/purchases/${purchase.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record purchase");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/purchases" className="text-[13px] text-ink-500 hover:text-ink-900">
          ← Back to purchases
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink-900 tracking-tight">New purchase</h1>
        <p className="text-[14px] text-ink-500 mt-1">
          Record stock coming into {activeBusiness?.name ?? "your business"}.
        </p>
      </div>

      <form onSubmit={submit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Product picker */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-4">
                Add products
              </h2>
              {activeBusiness && (
                <ProductPicker businessId={activeBusiness.id} onAdd={addProduct} />
              )}
            </Card>
          </div>

          {/* Cart + supplier + payment */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Purchase list</h2>
              {cart.length === 0 ? (
                <p className="text-[13px] text-ink-500">No items yet.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((c) => (
                    <div key={c.product.id} className="border border-ink-100 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-[13.5px] font-medium text-ink-900 truncate">
                          {c.product.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItem(c.product.id)}
                          className="text-ink-400 hover:text-red-600 text-[13px]"
                          aria-label={`Remove ${c.product.name} from purchase`}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label
                            htmlFor={`qty-${c.product.id}`}
                            className="block text-[11px] font-medium uppercase tracking-wider text-ink-500 mb-1"
                          >
                            Qty
                          </label>
                          <input
                            id={`qty-${c.product.id}`}
                            name={`qty-${c.product.id}`}
                            aria-label={`Quantity for ${c.product.name}`}
                            type="number"
                            min="1"
                            value={c.quantity}
                            onChange={(e) =>
                              updateQty(c.product.id, parseInt(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1.5 rounded border border-ink-200 text-[13px] focus:outline-none focus:border-brand-500"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`cost-${c.product.id}`}
                            className="block text-[11px] font-medium uppercase tracking-wider text-ink-500 mb-1"
                          >
                            Unit cost
                          </label>
                          <input
                            id={`cost-${c.product.id}`}
                            name={`cost-${c.product.id}`}
                            aria-label={`Unit cost for ${c.product.name}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={c.unit_cost}
                            onChange={(e) => updateCost(c.product.id, e.target.value)}
                            className="w-full px-2 py-1.5 rounded border border-ink-200 text-[13px] focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      </div>
                      <p className="text-[12px] text-ink-500 text-right mt-2">
                        Subtotal: {(Number(c.unit_cost) * c.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-ink-100 mt-4 pt-4">
                <div className="flex justify-between text-[15px]">
                  <span className="text-ink-600">Total</span>
                  <span className="font-semibold text-ink-900">
                    {activeBusiness?.currency ?? "KES"} {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Supplier</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] font-medium text-ink-700 mb-1.5">
                    Saved supplier
                  </label>
                  {activeBusiness && (
                    <SupplierPicker
                      businessId={activeBusiness.id}
                      selectedId={selectedSupplier?.id ?? null}
                      onSelect={handleSelectSupplier}
                    />
                  )}
                </div>
                <Input
                  label="Name"
                  name="supplier_name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Ad-hoc supplier"
                />
                <Input
                  label="Phone"
                  name="supplier_phone"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Payment</h2>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id="is_paid"
                  name="is_paid"
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-[13.5px] text-ink-700">
                  Mark as paid now
                </span>
              </label>
              <div className="mt-4">
                <Input
                  label="Note"
                  name="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Invoice #4521"
                />
              </div>
            </Card>

            <Card className="p-6">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 mb-4">
                  <p className="text-[13px] text-red-700">{error}</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button type="submit" loading={submitting} disabled={cart.length === 0}>
                  Record purchase
                </Button>
                <Link href="/dashboard/purchases">
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