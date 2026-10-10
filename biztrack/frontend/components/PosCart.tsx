"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export type CartItem = {
  productId: number;
  name: string;
  sku: string;
  unitPrice: string;
  quantity: number;
};

type Props = {
  items: CartItem[];
  currency: string;
  onUpdateQty: (productId: number, qty: number) => void;
  onRemove: (productId: number) => void;
  onClear: () => void;
  onComplete: (paymentMethod: string, customerName: string, customerPhone: string) => void;
  completing: boolean;
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
];

export default function PosCart({
  items,
  currency,
  onUpdateQty,
  onRemove,
  onClear,
  onComplete,
  completing,
}: Props) {
  const [payment, setPayment] = useState("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);

  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.unitPrice) * i.quantity,
    0
  );

  const total = subtotal;

  return (
    <div className="w-[380px] lg:w-[420px] flex flex-col bg-white dark:bg-ink-900 border-l border-ink-200/70 dark:border-white/10 shrink-0">
      {/* Header */}
      <div className="h-14 px-4 border-b border-ink-200/70 dark:border-white/10 flex items-center justify-between shrink-0">
        <h2 className="text-[14.5px] font-semibold text-ink-900 dark:text-ink-100">
          Cart {items.length > 0 && <span className="text-ink-500 dark:text-ink-400 font-normal">({items.length})</span>}
        </h2>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="text-[12.5px] text-ink-500 dark:text-ink-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="h-full grid place-items-center text-center px-6">
            <div>
              <div className="w-14 h-14 mx-auto rounded-2xl bg-ink-100 dark:bg-white/5 grid place-items-center text-2xl mb-3 text-ink-400 dark:text-ink-500">
                ⛒
              </div>
              <p className="text-[13.5px] text-ink-500 dark:text-ink-400">
                Cart is empty.
              </p>
              <p className="text-[12.5px] text-ink-400 dark:text-ink-500 mt-1">
                Click a product to add it.
              </p>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.productId}
              className="p-3 rounded-lg border border-ink-100 dark:border-white/5 hover:border-ink-200 dark:hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[13px] font-medium text-ink-900 dark:text-ink-100 leading-snug line-clamp-2">
                  {item.name}
                </p>
                <button
                  onClick={() => onRemove(item.productId)}
                  className="text-ink-400 hover:text-red-600 dark:hover:text-red-400 text-[13px] shrink-0"
                  aria-label={`Remove ${item.name}`}
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                    className="w-7 h-7 rounded-md bg-ink-100 dark:bg-white/10 hover:bg-ink-200 dark:hover:bg-white/20 text-ink-700 dark:text-ink-200 font-medium"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdateQty(item.productId, parseInt(e.target.value) || 1)
                    }
                    className="w-12 h-7 rounded-md border border-ink-200 dark:border-white/10 bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-100 text-center text-[13px] focus:outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                    className="w-7 h-7 rounded-md bg-ink-100 dark:bg-white/10 hover:bg-ink-200 dark:hover:bg-white/20 text-ink-700 dark:text-ink-200 font-medium"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <p className="text-[13.5px] font-semibold text-ink-900 dark:text-ink-100">
                  {currency} {(Number(item.unitPrice) * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment + Complete */}
      <div className="border-t border-ink-200/70 dark:border-white/10 p-4 space-y-3 shrink-0">
        {/* Customer toggle */}
        {!showCustomer ? (
          <button
            onClick={() => setShowCustomer(true)}
            className="w-full text-[12.5px] text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 text-left"
          >
            + Add customer details
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-ink-200 dark:border-white/10 bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-100 text-[13px] focus:outline-none focus:border-brand-500"
            />
            <input
              type="text"
              placeholder="Phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="px-3 py-2 rounded-lg border border-ink-200 dark:border-white/10 bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-100 text-[13px] focus:outline-none focus:border-brand-500"
            />
          </div>
        )}

        {/* Payment method */}
        <div>
          <label className="block text-[11.5px] font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-2">
            Payment
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setPayment(m.value)}
                className={`py-2 rounded-lg text-[12px] font-medium transition-colors ${
                  payment === m.value
                    ? "bg-brand-600 text-white"
                    : "bg-ink-100 dark:bg-white/10 text-ink-700 dark:text-ink-200 hover:bg-ink-200 dark:hover:bg-white/20"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-baseline justify-between pt-2 border-t border-ink-100 dark:border-white/5">
          <span className="text-[13.5px] text-ink-600 dark:text-ink-300">Total</span>
          <span className="text-2xl font-semibold text-ink-900 dark:text-ink-100 tracking-tight">
            {currency} {total.toFixed(2)}
          </span>
        </div>

        {/* Complete */}
        <Button
          onClick={() => onComplete(payment, customerName, customerPhone)}
          loading={completing}
          disabled={items.length === 0}
          size="lg"
          className="w-full"
        >
          Complete sale · {currency} {total.toFixed(2)}
        </Button>
        <p className="text-[11px] text-center text-ink-400 dark:text-ink-500">
          <kbd className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-white/10 font-mono">F4</kbd> to pay ·{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-white/10 font-mono">Esc</kbd> to clear
        </p>
      </div>
    </div>
  );
}