"use client";

import { useEffect, useState } from "react";
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
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-[13px] font-medium text-brand-600 mb-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight">
          Welcome back, {user?.first_name || "there"}.
        </h1>
        <p className="mt-2 text-ink-500 text-[14.5px]">
          Here's an overview of your BizTrack workspace.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
        <StatCard
          label="Account name"
          value={user?.full_name ?? "—"}
          icon="◉"
        />
        <StatCard
          label="Email address"
          value={user?.email ?? "—"}
          icon="✉"
          truncate
        />
        <StatCard
          label="Businesses"
          value={businesses === null ? "…" : String(businesses.length)}
          icon="▣"
          highlight
        />
      </div>

      {/* Businesses */}
      <div className="mt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900 tracking-tight">
              Your businesses
            </h2>
            <p className="text-[13px] text-ink-500 mt-0.5">
              All shops and organizations you belong to.
            </p>
          </div>
          <Button variant="ghost" size="sm" disabled>
            + New business
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-4">
            <p className="text-[13px] text-red-700">{error}</p>
          </div>
        )}

        {businesses === null && !error && (
          <Card className="p-10 text-center">
            <span className="inline-block w-5 h-5 border-2 border-ink-200 border-t-brand-500 rounded-full animate-spin" />
          </Card>
        )}

        {businesses && businesses.length === 0 && (
          <Card className="p-10 md:p-14 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 grid place-items-center text-2xl mb-4">
              🏪
            </div>
            <h3 className="text-[15px] font-semibold text-ink-900">
              No businesses yet
            </h3>
            <p className="text-[13.5px] text-ink-500 mt-1.5 max-w-sm mx-auto">
              Business creation arrives in the next stage. Your account is ready
              to host multiple businesses with isolated teams and data.
            </p>
            <Button variant="ghost" size="sm" className="mt-5" disabled>
              Coming in Stage 2
            </Button>
          </Card>
        )}

        {businesses && businesses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {businesses.map((b) => (
              <Card key={b.id} className="p-5 hover:shadow-elevated transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-bold shadow-soft">
                    {b.name[0]?.toUpperCase() ?? "B"}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-wider px-2 py-1 rounded-full bg-accent-50 text-accent-700">
                    <span className="w-1 h-1 rounded-full bg-accent-500" />
                    Active
                  </span>
                </div>
                <p className="font-semibold text-ink-900 truncate">{b.name}</p>
                <p className="text-[13px] text-ink-500 mt-0.5">
                  {b.business_type} · {b.currency}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="mt-12 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-brand-600 text-white grid place-items-center text-lg shrink-0">
            →
          </div>
          <div>
            <h3 className="font-semibold text-ink-900">What's next</h3>
            <p className="mt-1 text-[13.5px] text-ink-600 leading-relaxed">
              Stage 1 delivers accounts, authentication, and the multi-business
              foundation. Products, inventory, sales, and POS modules arrive in
              the next stages — all on top of this same secure base.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  truncate,
  highlight,
}: {
  label: string;
  value: string;
  icon: string;
  truncate?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`p-5 ${highlight ? "border-brand-200 bg-gradient-to-br from-brand-50/60 to-white" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-medium uppercase tracking-wider text-ink-500">
          {label}
        </p>
        <span className="w-8 h-8 rounded-lg bg-ink-100 grid place-items-center text-ink-500 text-[13px]">
          {icon}
        </span>
      </div>
      <p
        className={`text-[15px] font-semibold text-ink-900 ${
          truncate ? "truncate" : ""
        }`}
        title={truncate ? value : undefined}
      >
        {value}
      </p>
    </Card>
  );
}