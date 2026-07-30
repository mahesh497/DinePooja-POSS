"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore SW errors in dev */
      });
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      const dismissed = sessionStorage.getItem("pwa-install-dismissed");
      if (!dismissed) setShow(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setShow(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !show || !deferred) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-md rounded-2xl border border-[var(--line)] bg-white p-4 shadow-xl md:left-auto">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-teal-700 p-2 text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Install DinePooja app</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Add to your home screen for fullscreen POS on tablet or phone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                setShow(false);
                setDeferred(null);
              }}
            >
              Install
            </button>
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-semibold"
              onClick={() => {
                sessionStorage.setItem("pwa-install-dismissed", "1");
                setShow(false);
              }}
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          className="text-[var(--muted)]"
          onClick={() => {
            sessionStorage.setItem("pwa-install-dismissed", "1");
            setShow(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
