"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/site/Navbar";

type Attendee = {
  id: string;
  name?: string;
  role?: string;
  company?: string;
  interests?: string[];
  goals?: string[];
  bio?: string;
  telegram?: string;
  x_handle?: string;
  event_id?: string;
};

type Tab = "all" | "pending" | "confirmed" | "declined";

export default function MatchesPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [intros, setIntros] = useState<Array<{ id: string; status: string; partner: Attendee & { telegram?: string; x_handle?: string } }>>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [tVal, setTVal] = useState("");
  const [xVal, setXVal] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (typeof window !== 'undefined') {
          const mid = window.localStorage.getItem('attendee_id');
          setMeId(mid);
          // Load self to get event_id and contact handles
          if (mid) {
            try {
              const selfRes = await fetch(`/api/attendees?id=${encodeURIComponent(mid)}`);
              const selfJson = await selfRes.json();
              if (selfRes.ok && selfJson.ok && selfJson.attendee) {
                const me = selfJson.attendee as Attendee;
                if (me.event_id) setEventId(me.event_id);
                if (me.telegram) setTVal(me.telegram.startsWith('@') ? me.telegram.slice(1) : me.telegram);
                if (me.x_handle) setXVal(me.x_handle.startsWith('@') ? me.x_handle.slice(1) : me.x_handle);
              }
            } catch {}
          }
        }
        // Scope attendees by event if available
        const res = await fetch(eventId ? `/api/attendees?event_id=${encodeURIComponent(eventId)}` : "/api/attendees");
        const json = await res.json();
        if (res.ok && json.ok) setAttendees(json.attendees || []);
        // load my intros
        const me = typeof window !== 'undefined' ? window.localStorage.getItem('attendee_id') : null;
        if (me) await loadIntros(me);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  // Auto-hide toast notices after 3 seconds
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "declined", label: "Declined" },
  ];

  const list = attendees.filter((p) => !meId || p.id !== meId); // hide my own profile in 'All'
  const filteredIntros = intros.filter((it) => {
    if (tab === 'pending') return it.status === 'proposed';
    if (tab === 'confirmed') return it.status === 'accepted';
    if (tab === 'declined') return it.status === 'declined';
    return true;
  });

  async function loadIntros(attendeeId: string) {
    try {
      const res = await fetch(`/api/intros/mine?attendeeId=${encodeURIComponent(attendeeId)}`);
      const json = await res.json();
      if (res.ok && json.ok) setIntros(json.intros || []);
    } catch {}
  }

  async function actOnIntro(introId: string, action: 'accept'|'decline') {
    let who = meId;
    if (!who && typeof window !== 'undefined') {
      who = window.localStorage.getItem('attendee_id');
      if (who) setMeId(who);
    }
    if (!who) { setNotice('Please open Chat and complete onboarding once to create your attendee.'); return; }
    try {
      const res = await fetch('/api/intros/act', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendeeId: who, introId, action }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed');
      await loadIntros(who);
      setNotice(action === 'accept' ? 'Intro accepted. Contact options unlocked.' : 'Intro declined.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Failed to update intro');
    }
  }

  return (
    <div className="font-sans min-h-screen grid grid-rows-[auto_1fr] bg-white dark:bg-black">
      <Navbar />
      <main className="px-6 pt-16 pb-16">
        <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Matches</h1>
        {/* Contact editor */}
        {meId && (
          <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-black/70">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Your contact</h2>
              <button className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-900" onClick={() => setEditOpen(v => !v)}>
                {editOpen ? 'Close' : 'Edit'}
              </button>
            </div>
            {editOpen && (
              <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={async (e) => {
                e.preventDefault();
                if (!meId) return;
                try {
                  const body: Partial<Attendee> & { id: string } = { id: meId };
                  body.telegram = tVal ? tVal.replace(/^@/, '') : undefined;
                  body.x_handle = xVal ? xVal.replace(/^@/, '') : undefined;
                  const res = await fetch('/api/attendees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                  const js = await res.json();
                  if (!res.ok || !js.ok) throw new Error(js.error || 'Failed to save');
                  setNotice('Contact updated');
                  setEditOpen(false);
                } catch {
                  setNotice('Failed to save');
                }
              }}>
                <div>
                  <label className="text-xs text-gray-600">Telegram</label>
                  <div className="flex items-center">
                    <span className="px-2 py-2 text-sm border border-r-0 rounded-l-md bg-gray-50 dark:bg-gray-900">@</span>
                    <input value={tVal} onChange={(e)=>setTVal(e.target.value)} className="w-full border rounded-r-md px-3 py-2 text-sm border-gray-200 dark:border-gray-800" placeholder="username" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600">X / Twitter</label>
                  <div className="flex items-center">
                    <span className="px-2 py-2 text-sm border border-r-0 rounded-l-md bg-gray-50 dark:bg-gray-900">@</span>
                    <input value={xVal} onChange={(e)=>setXVal(e.target.value)} className="w-full border rounded-r-md px-3 py-2 text-sm border-gray-200 dark:border-gray-800" placeholder="handle" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="rounded-md text-white px-4 py-2 text-sm" style={{ background: 'var(--accent)' }}>Save</button>
                </div>
              </form>
            )}
          </div>
        )}
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

        {/* Your intros (filtered by tab if not 'all') */}
        {meId && (tab !== 'all') && (
          <section className="mb-8">
            <h2 className="text-lg font-medium mb-2">{
              tab === 'pending' ? 'Pending intros' : tab === 'confirmed' ? 'Confirmed intros' : 'Declined intros'
            }</h2>
            <ul className="space-y-2">
              {filteredIntros.map((it) => {
                const p = it.partner;
                const toUser = (raw?: string) => {
                  if (!raw) return '';
                  let s = String(raw).trim().replace(/^@/, '');
                  if (/^https?:\/\//i.test(s)) {
                    try {
                      const u = new URL(s);
                      const parts = u.pathname.split('/').filter(Boolean);
                      if (parts[0]) s = parts[0];
                    } catch {}
                  }
                  return s;
                };
                const tHandle = toUser(p.telegram);
                const xHandle = toUser(p.x_handle);
                const xLink = xHandle ? `https://x.com/${xHandle}` : null;
                const initials = p.name ? p.name.split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("") : "?";
                return (
                  <li key={it.id} className="border rounded-xl p-4 bg-white dark:bg-black">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold ring-1 ring-gray-300 dark:ring-gray-700">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.name || p.id}</div>
                        <div className="text-xs text-gray-600 truncate">Status: {it.status}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-2 shrink-0">
                        {it.status === 'proposed' && (
                          <>
                            <button className="text-xs rounded-md border px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900" onClick={() => actOnIntro(it.id, 'accept')}>Accept</button>
                            <button className="text-xs rounded-md border px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900" onClick={() => actOnIntro(it.id, 'decline')}>Decline</button>
                          </>
                        )}
                        {it.status === 'accepted' && (
                          <>
                            {tHandle && (
                              <a
                                className="text-xs rounded-md border px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900"
                                href={`https://t.me/${tHandle}`}
                                onClick={() => {
                                  try {
                                    const app = `tg://resolve?domain=${tHandle}`;
                                    window.location.href = app;
                                    setTimeout(() => { window.open(`https://t.me/${tHandle}`, '_blank'); }, 400);
                                  } catch {}
                                }}
                                target="_blank"
                              >
                                Open Telegram
                              </a>
                            )}
                            {xLink && <a className="text-xs rounded-md border px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900" href={xLink} target="_blank">Open X</a>}
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {tab === 'all' && (loading ? (
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
                      <button
                        disabled={!meId}
                        onClick={async () => {
                          if (!meId) { setNotice('Please register first.'); return; }
                          try {
                            const res = await fetch('/api/intros/request', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ requesterId: meId, partnerId: p.id })
                            });
                            const json = await res.json();
                            if (res.ok && json.ok) {
                              if (json.note === 'existing_intro') setNotice('Intro already requested. Waiting for response.');
                              else setNotice('Intro requested. Your match can accept in-app.');
                            }
                            else setNotice(json.error || 'Failed to request intro');
                          } catch { setNotice('Failed to request intro'); }
                        }}
                        className="text-xs rounded-md border px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50"
                      >
                        Request Intro
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ))}
        </div>
      </main>
    </div>
  );
}
