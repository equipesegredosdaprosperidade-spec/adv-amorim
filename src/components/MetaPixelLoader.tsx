import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { getPixelConfig } from "@/lib/site-config";

/**
 * Loads the Meta Pixel base code (fbq) once per session when a Pixel ID is
 * configured and the Pixel is enabled. Re-fires `PageView` on every client
 * route change so SPA navigations are tracked in Events Manager.
 *
 * Mounted inside __root.tsx, so it runs on EVERY route/page automatically.
 */
export function MetaPixelLoader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cfg = getPixelConfig();
    if (!cfg.enabled || !cfg.pixelId || !cfg.pixelId.trim()) return;

    // Use any for the dynamic fbq shape (Meta's snippet mutates the function object).
    const w = window as unknown as { fbq?: any; _fbq?: any };

    if (typeof w.fbq !== "function") {
      // Standard Meta Pixel base snippet, rewritten in TS-safe form.
      const f: any = function (...args: unknown[]) {
        f.callMethod ? f.callMethod.apply(f, args) : f.queue.push(args);
      };
      f.queue = [];
      f.loaded = true;
      f.version = "2.0";
      f.push = f;
      w.fbq = f;
      w._fbq = f;

      const s = document.createElement("script");
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);

      w.fbq("init", cfg.pixelId.trim());
    }

    w.fbq("track", "PageView", { path: pathname });
  }, [pathname]);

  return null;
}
