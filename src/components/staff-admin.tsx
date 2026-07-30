"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createStaff, toggleStaff } from "@/lib/actions/admin";
import type { Role } from "@prisma/client";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

export function StaffAdmin({ staff }: { staff: Staff[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "password123",
    role: "CASHIER" as Role,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Staff</h1>
        <p className="text-sm text-[var(--muted)]">Roles: Owner, Manager, Cashier, Captain.</p>
      </div>

      <form
        className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            await createStaff(form);
            setForm({ name: "", email: "", password: "password123", role: "CASHIER" });
            router.refresh();
          });
        }}
      >
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        />
        <input
          required
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        >
          <option value="OWNER">Owner</option>
          <option value="MANAGER">Manager</option>
          <option value="CASHIER">Cashier</option>
          <option value="CAPTAIN">Captain</option>
        </select>
        <button
          disabled={pending}
          type="submit"
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-white md:col-span-2"
        >
          Add staff
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--chip)] text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">{u.active ? "Active" : "Disabled"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-lg bg-[var(--chip)] px-3 py-1"
                    onClick={() =>
                      startTransition(async () => {
                        await toggleStaff(u.id, !u.active);
                        router.refresh();
                      })
                    }
                  >
                    {u.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
