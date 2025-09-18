"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Tries to open Sensay widget if present, else navigates to /chat
export default function FloatingAskAI() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check if the widget script has initialized a global API
    const check = () => {
      const api = (typeof window !== "undefined"
        ? (window as unknown as { sensayWidget?: { open?: () => void } }).sensayWidget
        : undefined);
      const exists = !!(api && typeof api.open === 'function');
      setReady(!!exists);
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, []);

  const onClick = () => {
    try {
      const api = (window as unknown as { sensayWidget?: { open?: () => void } }).sensayWidget;
      if (api && typeof api.open === 'function') {
        api.open();
        return;
      }
    } catch {}
    router.push("/chat");
  };

  return (
    <button
      onClick={onClick}
      aria-label="Ask EventLinq AI"
      title={ready ? "Ask EventLinq AI" : "Open chat"}
      className="fixed bottom-5 right-5 z-50 group shadow-lg rounded-full px-4 py-3 flex items-center gap-2 text-white"
      style={{ background: "linear-gradient(135deg, var(--accent), #22d3ee)" }}
    >
      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-white/90 group-hover:scale-110 transition-transform" />
      <span className="text-sm font-medium">Ask EventLinq AI</span>
    </button>
  );
}
