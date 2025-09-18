"use client";
import { useEffect, useState } from "react";

type Attendee = {
  id: string;
  name?: string;
  role?: string;
  company?: string;
  interests?: string[];
  goals?: string[];
  bio?: string;
};

type Tab = "all" | "pending" | "confirmed";

export default function MatchesPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/attendees");
        const json = await res.json();
        if (res.ok && json.ok) setAttendees(json.attendees || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
  ];

  const list = attendees; // backend wiring for statuses can be added later

  return (
    <main className="px-6 pt-16 pb-16">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Matches</h1>
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm -mb-px border-b-2 ${
                tab === t.key ? "border-[var(--accent)] text-foreground" : "border-transparent text-gray-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "all" && (
          <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300 mb-6">
            This view will populate once intros are flowing. For now, check the All tab.
          </div>
        )}

        {loading ? (
          <ul className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="border rounded-xl p-4 bg-white dark:bg-black">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
                    <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {list.map((p) => {
              const initials = p.name ? p.name.split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("") : "?";
              return (
                <li key={p.id} className="border rounded-xl p-4 bg-white dark:bg-black">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold ring-1 ring-gray-300 dark:ring-gray-700">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.name || p.id}</div>
                      <div className="text-xs text-gray-600 truncate">{[p.role, p.company].filter(Boolean).join(" • ")}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(p.interests || []).slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      <a href="/chat" className="text-xs rounded-md border px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900">Chat</a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
