"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
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
    <div className="min-h-screen grid place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-6">
          <span className="w-9 h-9 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">B</span>
          <span className="text-lg font-semibold text-slate-900">BizTrack</span>
        </Link>
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">It takes less than a minute.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Input label="Email" type="email" value={form.email} onChange={update("email")} required autoComplete="email" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" value={form.first_name} onChange={update("first_name")} required />
              <Input label="Last name" value={form.last_name} onChange={update("last_name")} required />
            </div>
            <Input label="Phone" value={form.phone} onChange={update("phone")} placeholder="Optional" />
            <Input label="Password" type="password" value={form.password} onChange={update("password")} required autoComplete="new-password" />
            <Input label="Confirm password" type="password" value={form.password_confirm} onChange={update("password_confirm")} required autoComplete="new-password" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={loading} className="w-full">Create account</Button>
          </form>

          <p className="mt-6 text-sm text-center text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-600 font-medium">Log in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}