"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    password: "",
    password_confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.password_confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register(form);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-ink-950">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent-500/15 blur-[120px]" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-brand-600/20 blur-[120px]" />

      <div className="relative min-h-screen flex flex-col">
        <header className="px-6 py-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-bold shadow-glow">
              B
            </span>
            <span className="text-white font-semibold tracking-tight">BizTrack</span>
          </Link>
        </header>

        <div className="flex-1 grid place-items-center px-4 pb-16">
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-ink-900/60 backdrop-blur-xl border border-white/10 shadow-elevated p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-white tracking-tight">
                  Create your account
                </h1>
                <p className="text-sm text-ink-400 mt-2">
                  Takes less than a minute. No credit card required.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  tone="dark"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First name"
                    value={form.first_name}
                    onChange={update("first_name")}
                    placeholder="Festus"
                    required
                    tone="dark"
                  />
                  <Input
                    label="Last name"
                    value={form.last_name}
                    onChange={update("last_name")}
                    placeholder="Kimedu"
                    required
                    tone="dark"
                  />
                </div>
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={update("phone")}
                  placeholder="Optional"
                  tone="dark"
                />
                <Input
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={update("password")}
                  placeholder="At least 8 characters"
                  hint="Use a mix of letters, numbers, and symbols."
                  required
                  autoComplete="new-password"
                  tone="dark"
                />
                <Input
                  label="Confirm password"
                  type="password"
                  value={form.password_confirm}
                  onChange={update("password_confirm")}
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                  tone="dark"
                />

                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 py-2.5">
                    <p className="text-[13px] text-red-300">{error}</p>
                  </div>
                )}

                <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
                  Create account
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-ink-400">
                Already have an account?{" "}
                <Link href="/login" className="text-brand-300 hover:text-brand-200 font-medium">
                  Log in
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-ink-600">
              By creating an account you agree to our terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}