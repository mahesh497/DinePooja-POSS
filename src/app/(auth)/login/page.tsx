"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("owner@dinepooja.local");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(params.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8 shadow-sm">
        <BrandLogo size={52} showWordmark wordmarkClassName="text-3xl text-[var(--accent)]" />
        <p className="mt-3 text-sm text-[var(--muted)]">
          Restaurant billing, KOT, tables & reports — demo ready.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Email</span>
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--accent)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Password</span>
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--accent)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="mt-6 rounded-xl bg-[var(--chip)] p-3 text-xs text-[var(--muted)]">
          <p className="font-medium text-[var(--ink)]">Demo logins (password123)</p>
          <p className="mt-1">owner@dinepooja.local · manager@ · cashier@ · captain@</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
