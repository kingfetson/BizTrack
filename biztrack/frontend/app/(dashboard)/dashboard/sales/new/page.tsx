"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ProductPicker from "@/components/ProductPicker";
import CustomerPicker from "@/components/CustomerPicker";
import { api } from "@/lib/api";
import { useBusiness } from "@/lib/business";

type Product = {
  id: number;
  name: string;
  sku: string;
  price: string;
};

type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
};

type CartItem = {
  product: Product;
  quantity: number;
  unit_price: string;
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
];

export default function NewSalePage() {
  const router = useRouter();
  const { activeBusiness } = useBusiness();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
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
      return [...prev, { product: p, quantity: 1, unit_price: p.price }];
    });
  }

  function updateQty(id: number, qty: number) {
    if (qty <= 0) return removeItem(id);
    setCart((prev) =>
      prev.map((c) => (c.product.id === id ? { ...c, quantity: qty } : c))
    );
  }

  function updatePrice(id: number, price: string) {
    setCart((prev) =>
      prev.map((c) => (c.product.id === id ? { ...c, unit_price: price } : c))
    );
  }

  function removeItem(id: number) {
    setCart((prev) => prev.filter((c) => c.product.id !== id));
  }

  function handleSelectCustomer(c: Customer | null) {
    setSelectedCustomer(c);
    if (c) {
      // Autofill the free-text fields from the saved customer
      setCustomerName(c.name);
      setCustomerPhone(c.phone || "");
    }
  }

  const subtotal = cart.reduce(
    (sum, c) => sum + Number(c.unit_price) * c.quantity,
    0
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    if (cart.length === 0) {
      setError("Add at least one product to the sale.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
          unit_price: c.unit_price,
        })),
        payment_method: paymentMethod,
        customer_id: selectedCustomer?.id ?? null,
        customer_name: customerName,
        customer_phone: customerPhone,
        note,
      };
      const sale = await api<{ id: number }>(
        `/businesses/${activeBusiness.id}/sales/`,
        { method: "POST", body: JSON.stringify(payload) }
      );
      router.replace(`/dashboard/sales/${sale.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/sales" className="text-[13px] text-ink-500 hover:text-ink-900">
          ← Back to sales
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink-900 tracking-tight">New sale</h1>
        <p className="text-[14px] text-ink-500 mt-1">
          Record a sale for {activeBusiness?.name ?? "your business"}.
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

          {/* Cart + customer + payment */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Cart</h2>
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
                          aria-label={`Remove ${c.product.name} from cart`}
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
                            htmlFor={`price-${c.product.id}`}
                            className="block text-[11px] font-medium uppercase tracking-wider text-ink-500 mb-1"
                          >
                            Price
                          </label>
                          <input
                            id={`price-${c.product.id}`}
                            name={`price-${c.product.id}`}
                            aria-label={`Unit price for ${c.product.name}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={c.unit_price}
                            onChange={(e) =>
                              updatePrice(c.product.id, e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded border border-ink-200 text-[13px] focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      </div>
                      <p className="text-[12px] text-ink-500 text-right mt-2">
                        Subtotal: {(Number(c.unit_price) * c.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-ink-100 mt-4 pt-4">
                <div className="flex justify-between text-[15px]">
                  <span className="text-ink-600">Total</span>
                  <span className="font-semibold text-ink-900">
                    {activeBusiness?.currency ?? "KES"} {subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Customer</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] font-medium text-ink-700 mb-1.5">
                    Saved customer
                  </label>
                  {activeBusiness && (
                    <CustomerPicker
                      businessId={activeBusiness.id}
                      selectedId={selectedCustomer?.id ?? null}
                      onSelect={handleSelectCustomer}
                    />
                  )}
                </div>
                <Input
                  label="Name"
                  name="customer_name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in"
                  autoComplete="name"
                />
                <Input
                  label="Phone"
                  name="customer_phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Optional"
                  autoComplete="tel"
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Payment</h2>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="payment_method"
                    className="block text-[13px] font-medium text-ink-700 mb-1.5"
                  >
                    Method
                  </label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Note"
                  name="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional"
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
                  Complete sale
                </Button>
                <Link href="/dashboard/sales">
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