"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitLicenseUnlock } from "@/lib/actions/license";

export function LicenseActivate({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#ecfdf5,transparent_55%),linear-gradient(180deg,#f8fafc,#e2e8f0)] p-6">
      <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">License expired</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">Unlock Sampada</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This installation expired on {new Date(expiresAt).toLocaleDateString("en-IN")}. Enter the
          6-digit unlock code from your vendor to extend for another 6 months.
        </p>

        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              try {
                setError("");
                await submitLicenseUnlock(code);
                router.replace("/dashboard");
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unlock failed");
              }
            });
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit unlock code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-center font-mono text-2xl tracking-[0.35em]"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={pending || code.length !== 6}
            className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Checking…" : "Unlock for 6 months"}
          </button>
        </form>
      </div>
    </div>
  );
}
