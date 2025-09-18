"use client";
import { useEffect } from "react";

export default function WidgetConfigurator() {
  useEffect(() => {
    let cancelled = false;
    interface SensayAPI {
      init?: () => void;
      config?: (opts: Record<string, unknown>) => void;
    }
    const apply = () => {
      // Try to init/config if available
      const w = (typeof window !== 'undefined'
        ? (window as unknown as { SensayChatbot?: SensayAPI }).SensayChatbot
        : undefined);
      if (w) {
        try {
          w.init?.();
          w.config?.({
            widgetPosition: 'BOTTOM_RIGHT',
            // If supported by the SDK, these provide breathing room from edges
            widgetMargin: { bottom: 20, right: 20 },
            primaryColor:
              getComputedStyle(document.documentElement).getPropertyValue('--accent')?.trim() || '#7c3aed',
          });
        } catch {}
        return true;
      }
      return false;
    };

    // Try immediately and a few times after
    if (!apply()) {
      const tries = [200, 500, 1000, 2000];
      let t: number | undefined;
      const run = (i: number) => {
        if (cancelled || i >= tries.length) return;
        t = window.setTimeout(() => {
          if (!apply()) run(i + 1);
        }, tries[i]);
      };
      run(0);
      return () => { cancelled = true; if (t) window.clearTimeout(t); };
    }
  }, []);

  return null;
}
