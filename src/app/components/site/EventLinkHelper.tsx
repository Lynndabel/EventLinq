"use client";
import { useMemo, useState } from "react";

export default function EventLinkHelper() {
  const [slug, setSlug] = useState("");
  const base = useMemo(() => {
    const envBase = process.env.NEXT_PUBLIC_APP_BASE_URL;
    if (envBase && typeof envBase === "string" && envBase.trim()) return envBase.replace(/\/$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    // Fallback for SSR build
    return "";
  }, []);
  const clean = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "-");
  const ev = clean(slug);
  const chatUrl = ev ? `${base}/chat?event=${encodeURIComponent(ev)}` : "";
  const matchesUrl = ev ? `${base}/matches?event=${encodeURIComponent(ev)}` : "";

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); alert("Copied!"); } catch {}
  };

  return (
    <section className="px-6 pb-16">
      <div className="max-w-7xl mx-auto rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white/60 dark:bg-black/60 backdrop-blur">
        <h3 className="font-medium mb-2">Create an event link</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
          Share a scoped link so attendees land in Chat for your event. Use a short, lowercase slug.
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="text-xs text-gray-600 dark:text-gray-400 md:w-48">Event slug</label>
          <input
            value={slug}
            onChange={(e)=>setSlug(e.target.value)}
            placeholder="e.g., devcon, eth-london"
            className="flex-1 rounded-md border px-3 py-2 text-sm border-gray-200 dark:border-gray-800"
          />
        </div>
        {ev && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
              <div className="text-xs text-gray-600 mb-1">Chat link</div>
              <div className="flex items-center gap-2">
                <code className="text-xs break-all flex-1">{chatUrl || ""}</code>
                {chatUrl && (
                  <button className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-900" onClick={()=>copy(chatUrl)}>Copy</button>
                )}
              </div>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
              <div className="text-xs text-gray-600 mb-1">Matches link (optional)</div>
              <div className="flex items-center gap-2">
                <code className="text-xs break-all flex-1">{matchesUrl || ""}</code>
                {matchesUrl && (
                  <button className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-900" onClick={()=>copy(matchesUrl)}>Copy</button>
                )}
              </div>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-gray-600 dark:text-gray-400">
          Tip: You can also paste this link in your website or QR code. The app will auto-scope onboarding and matching to <code>{ev || "<slug>"}</code>.
        </p>
      </div>
    </section>
  );
}
