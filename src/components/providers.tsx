"use client";

import { SessionProvider } from "next-auth/react";
import { NativeShell } from "@/components/native-shell";
import { PwaRegister } from "@/components/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/nextauth">
      {children}
      <NativeShell />
      <PwaRegister />
    </SessionProvider>
  );
}
