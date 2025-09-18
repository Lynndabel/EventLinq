"use client";
import { useState } from "react";

type Attendee = {
  id: string;
  name: string;
  role?: string;
  company?: string;
  bio?: string;
  interests?: string[];
  goals?: string[];
  availability?: string;
};

type Suggestion = { partnerId: string; score: number; rationale: string; _partner?: Attendee };

type FormState = {
  name: string;
  role: string;
  company: string;
  bio: string;
  interests: string;
  goals: string;
  availability: string;
  consent_intro: boolean;
};

export default function OnboardAndMatch() {
  const [form, setForm] = useState<FormState>({
    name: "",
    role: "",
    company: "",
    bio: "",
    interests: "",
    goals: "",
    availability: "",
    consent_intro: true,
  });
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [valid, setValid] = useState<{ name?: string }>({});
  const [toast, setToast] = useState<{ text: string; kind?: 'success'|'error'}|null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    // simple validation
    const v: { name?: string } = {};
    if (!form.name.trim()) v.name = "Name is required";
    setValid(v);
    if (Object.keys(v).length > 0) {
      setLoading(false);
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim() || undefined,
        company: form.company.trim() || undefined,
        bio: form.bio.trim() || undefined,
        interests: form.interests
          .split(",")
          .map(s => s.trim())
          .filter(Boolean),
        goals: form.goals
          .split(",")
          .map(s => s.trim())
          .filter(Boolean),
        availability: form.availability.trim() || undefined,
        consent_intro: !!form.consent_intro,
      };
      // Create attendee
      const res = await fetch("/api/attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to save attendee");
      const a: Attendee = json.attendee;
      setAttendee(a);

      // Run matching
      const mres = await fetch("/api/match/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeId: a.id, limit: 3 }),
      });
      const mjson = await mres.json();
      if (!mres.ok || !mjson.ok) throw new Error(mjson.error || "Failed to run matching");
      const sugs = (mjson.suggestions as Suggestion[]) || [];
      setSuggestions(sugs);
      // fetch partner details to enrich cards
      if (sugs.length > 0) {
        const ids = sugs.map((s) => s.partnerId).join(",");
        const dres = await fetch(`/api/attendees?ids=${encodeURIComponent(ids)}`);
        const djson = await dres.json();
        if (dres.ok && djson.ok && Array.isArray(djson.attendees)) {
          // attach detail map to suggestions
          const map: Record<string, Attendee> = {};
          (djson.attendees as Attendee[]).forEach((a) => (map[a.id] = a));
          setSuggestions(
            sugs.map((s) => ({
              ...s,
              _partner: map[s.partnerId],
            }))
          );
        }
      }
      setMessage("Profile saved. Here are your suggested matches.");
      setToast({ text: 'Profile saved and matches generated', kind: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setToast({ text: msg, kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const requestIntro = async (partnerId: string) => {
    if (!attendee) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/sensay/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "intro.confirm",
          payload: { a_id: attendee.id, b_id: partnerId, status: "proposed" },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to create intro");
      setMessage("Intro proposed. We will notify both parties.");
      setToast({ text: 'Intro proposed', kind: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create intro";
      setError(msg);
      setToast({ text: msg, kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm font-medium">Name</label>
          <input
            className={`border rounded px-3 py-2 ${valid.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            value={form.name}
            onChange={e => update("name", e.target.value)}
            placeholder="Your full name"
          />
          {valid.name && <span className="text-xs text-red-600">{valid.name}</span>}
        </div>
        <div className="grid gap-1 md:grid-cols-2 md:gap-3">
          <div>
            <label className="text-sm font-medium">Role</label>
            <input className="border rounded px-3 py-2 w-full border-gray-300 dark:border-gray-700" value={form.role} onChange={e => update("role", e.target.value)} placeholder="e.g. Founder, Engineer, Investor" />
          </div>
          <div>
            <label className="text-sm font-medium">Company</label>
            <input className="border rounded px-3 py-2 w-full border-gray-300 dark:border-gray-700" value={form.company} onChange={e => update("company", e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-medium">Short bio</label>
          <textarea className="border rounded px-3 py-2 border-gray-300 dark:border-gray-700" rows={3} value={form.bio} onChange={e => update("bio", e.target.value)} placeholder="1–2 lines about you" />
        </div>
        <div className="grid gap-1 md:grid-cols-2 md:gap-3">
          <div>
            <label className="text-sm font-medium">Interests (comma‑separated)</label>
            <input className="border rounded px-3 py-2 w-full border-gray-300 dark:border-gray-700" placeholder="ai, fintech, climate" value={form.interests} onChange={e => update("interests", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Goals (comma‑separated)</label>
            <input className="border rounded px-3 py-2 w-full border-gray-300 dark:border-gray-700" placeholder="find cofounder, hire, raise" value={form.goals} onChange={e => update("goals", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-medium">Availability</label>
          <input className="border rounded px-3 py-2 border-gray-300 dark:border-gray-700" placeholder="Fri PM" value={form.availability} onChange={e => update("availability", e.target.value)} />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md text-white px-4 py-2 text-sm font-medium shadow hover:opacity-90 disabled:opacity-60"
          style={{ background: 'var(--accent)' }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
              Saving...
            </span>
          ) : (
            "Save & Find Matches"
          )}
        </button>
      </form>

      {error && <div className="text-red-600 text-sm">{error}</div>}
      {message && <div className="text-green-700 text-sm">{message}</div>}

      {attendee && (
        <div className="text-sm text-gray-600">Your ID: <code>{attendee.id}</code></div>
      )}

      {suggestions && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Suggested matches</h3>
          {suggestions.length === 0 && <div className="text-sm text-gray-600">No matches yet. Try adding more attendees.</div>}
          <ul className="space-y-2">
            {suggestions.map((s) => {
              const partner = s._partner as Attendee | undefined;
              const initials = partner?.name ? partner.name.split(/\s+/).slice(0,2).map(n=>n[0]?.toUpperCase()).join("") : "?";
              return (
                <li key={s.partnerId} className="border rounded-xl p-4 bg-white dark:bg-black hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {partner?.name || s.partnerId}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {[partner?.role, partner?.company].filter(Boolean).join(" • ")}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Array.isArray(partner?.interests) && partner!.interests!.slice(0,3).map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{t}</span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 truncate">{s.rationale} • Score {s.score.toFixed(2)}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      <button onClick={() => setExpanded(prev => ({ ...prev, [s.partnerId]: !prev[s.partnerId] }))} className="text-xs rounded-md border px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900">
                        {expanded[s.partnerId] ? 'Hide' : 'Details'}
                      </button>
                      <button onClick={() => requestIntro(s.partnerId)} className="text-sm rounded-md text-white px-3 py-2 hover:opacity-90 whitespace-nowrap" style={{ background: 'var(--accent)' }}>
                        Request Intro
                      </button>
                    </div>
                  </div>
                  {expanded[s.partnerId] && partner && (
                    <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                      {partner.bio && <p className="mb-2">{partner.bio}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {(partner.interests || []).map((t) => (
                          <span key={`i-${t}`} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{t}</span>
                        ))}
                        {(partner.goals || []).map((t) => (
                          <span key={`g-${t}`} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`rounded-md px-3 py-2 shadow text-sm ${toast.kind === 'error' ? 'bg-red-600 text-white' : 'bg-black text-white dark:bg-white dark:text-black'}`}>
            <div className="flex items-center gap-2">
              <span>{toast.text}</span>
              <button onClick={() => setToast(null)} className="text-xs opacity-80 hover:opacity-100">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
