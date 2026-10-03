"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Business = {
  id: number;
  name: string;
  business_type: string;
  currency: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Business[]>("/businesses/")
      .then(setBusinesses)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="text-slate-500 mt-1">Overview of your businesses and activity.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Your name</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{user?.full_name}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Email</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 truncate">{user?.email}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Businesses</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {businesses === null ? "…" : businesses.length}
          </p>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Your businesses</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {businesses === null && !error && (
          <p className="mt-4 text-slate-500">Loading…</p>
        )}

        {businesses && businesses.length === 0 && (
          <Card className="mt-4 text-center">
            <p className="text-slate-600">You don't have a business yet.</p>
            <p className="text-sm text-slate-500 mt-1">
              Business creation UI is coming in the next stage.
            </p>
            <Button variant="ghost" className="mt-4" disabled>
              Create a business (coming soon)
            </Button>
          </Card>
        )}

        {businesses && businesses.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {businesses.map((b) => (
              <Card key={b.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{b.name}</p>
                    <p className="text-sm text-slate-500">{b.business_type} · {b.currency}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-brand-50 text-brand-700">Active</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12 p-6 rounded-xl bg-brand-50 border border-brand-100">
        <h3 className="font-semibold text-brand-900">What's next?</h3>
        <p className="mt-2 text-sm text-brand-800">
          Stage 1 delivers accounts and multi-business foundations. Products, inventory, sales,
          and POS modules arrive in the next stage.
        </p>
      </div>
    </div>
  );
}