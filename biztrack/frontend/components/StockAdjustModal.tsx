"use client";

import { useState } from "react";
import Input from "./ui/Input";
import Button from "./ui/Button";

const REASONS = [
  { value: "PURCHASE", label: "Purchase (restock)" },
  { value: "ADJUSTMENT", label: "Adjustment (correction)" },
  { value: "RETURN", label: "Return from customer" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "LOSS", label: "Loss / damage" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { delta: number; reason: string; note: string }) => Promise<void>;
  productName: string;
  currentQuantity: number;
};

export default function StockAdjustModal({
  open,
  onClose,
  onSubmit,
  productName,
  currentQuantity,
}: Props) {
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("PURCHASE");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const n = parseInt(amount, 10);
    if (!n || n <= 0) {
      setError("Enter a positive number.");
      return;
    }
    const delta = direction === "in" ? n : -n;
    const newTotal = currentQuantity + delta;
    if (newTotal < 0) {
      setError(`This would leave stock at ${newTotal}. Not allowed.`);
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ delta, reason, note });
      // Parent will close the modal
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-elevated border border-ink-200/70 overflow-hidden">
        <div className="px-6 py-5 border-b border-ink-100">
          <h2 className="text-[16px] font-semibold text-ink-900 tracking-tight">
            Adjust stock
          </h2>
          <p className="text-[13px] text-ink-500 mt-0.5 truncate">
            {productName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current state */}
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-ink-50 border border-ink-100">
            <span className="text-[13px] text-ink-600">Current stock</span>
            <span className="text-[15px] font-semibold text-ink-900">
              {currentQuantity}
            </span>
          </div>

          {/* Direction toggle */}
          <div>
            <label className="block text-[13px] font-medium text-ink-700 mb-1.5">
              Movement
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection("in")}
                className={`px-3 py-2 rounded-lg border text-[13.5px] font-medium transition-colors ${
                  direction === "in"
                    ? "bg-accent-50 border-accent-300 text-accent-700"
                    : "bg-white border-ink-200 text-ink-600 hover:bg-ink-50"
                }`}
              >
                + Add stock
              </button>
              <button
                type="button"
                onClick={() => setDirection("out")}
                className={`px-3 py-2 rounded-lg border text-[13.5px] font-medium transition-colors ${
                  direction === "out"
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-white border-ink-200 text-ink-600 hover:bg-ink-50"
                }`}
              >
                − Remove stock
              </button>
            </div>
          </div>

          <Input
            label="Quantity"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0"
            autoFocus
          />

          <div>
            <label className="block text-[13px] font-medium text-ink-700 mb-1.5">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink-700 mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Supplier delivery #1234"
              maxLength={255}
              className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-[14px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5">
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {direction === "in" ? "Add stock" : "Remove stock"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}