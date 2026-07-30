"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/** Native shell chrome: status bar, splash, back button */
export function NativeShell() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeBack: (() => void) | undefined;

    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setBackgroundColor({ color: "#0f766e" });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {
        /* web / unsupported */
      }

      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* ignore */
      }

      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        removeBack = () => {
          void handle.remove();
        };
      } catch {
        /* ignore */
      }
    })();

    return () => removeBack?.();
  }, []);

  return null;
}
