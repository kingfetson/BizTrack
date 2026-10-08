"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

export type Business = {
  id: number;
  name: string;
  business_type: string;
  currency: string;
  phone: string;
  email: string;
  address: string;
  logo: string | null;
  created_at: string;
  updated_at: string;
};

type BusinessContextValue = {
  businesses: Business[];
  activeBusiness: Business | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  setActiveBusiness: (b: Business) => void;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

const STORAGE_KEY = "biztrack_active_business_id";

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusinessState] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setActiveBusiness = useCallback((b: Business) => {
    setActiveBusinessState(b);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(b.id));
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await api<Business[]>("/businesses/");
      setBusinesses(list);

      // Prefer the stored active business, else the first one
      const storedId =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;

      let next: Business | null = null;
      if (storedId) {
        next = list.find((b) => String(b.id) === storedId) ?? null;
      }
      if (!next && list.length > 0) {
        next = list[0];
      }

      setActiveBusinessState(next);
      if (next && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, String(next.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load businesses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <BusinessContext.Provider
      value={{ businesses, activeBusiness, loading, error, refresh, setActiveBusiness }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used inside BusinessProvider");
  return ctx;
}