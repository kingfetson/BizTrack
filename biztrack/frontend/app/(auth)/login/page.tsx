"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-ink-950">
      {/* Backdrop pattern */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Brand glow */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-brand-600/20 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px]" />

      {/* Content */}
      <div className="relative min-h-screen flex flex-col">
        {/* Top nav */}
        <header className="px-6 py-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-bold shadow-glow">
              B
            </span>
            <span className="text-white font-semibold tracking-tight">BizTrack</span>
          </Link>
        </header>

        {/* Centered card */}
        <div className="flex-1 grid place-items-center px-4 pb-16">
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-ink-900/60 backdrop-blur-xl border border-white/10 shadow-elevated p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-white tracking-tight">
                  Welcome back
                </h1>
                <p className="text-sm text-ink-400 mt-2">
                  Log in to your BizTrack account to continue.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="[&_label]:text-ink-300">
            <Input
  label="Email address"
  type="email"
  name="email"
  placeholder="you@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  autoComplete="email"
  tone="dark"
/>
<Input
  label="Password"
  type="password"
  name="password"
  placeholder="••••••••"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  required
  autoComplete="current-password"
  tone="dark"/>
  </div>
                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 py-2.5">
                    <p className="text-[13px] text-red-300">{error}</p>
                  </div>
                )}

                <Button type="submit" loading={loading} size="lg" className="w-full">
                  Sign in
                </Button>
              </form>

              {/* Footer link */}
              <p className="mt-6 text-center text-sm text-ink-400">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-brand-300 hover:text-brand-200 font-medium">
                  Create one
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-ink-600">
              Protected by JWT authentication · Secured with PBKDF2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}