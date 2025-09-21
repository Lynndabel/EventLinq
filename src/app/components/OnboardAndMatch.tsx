"use client";
import { useEffect, useRef, useState } from "react";

type Attendee = {
  id: string;
  name: string;
  role?: string;
  company?: string;
  bio?: string;
  interests?: string[];
  goals?: string[];
  availability?: string;
  consent_intro?: boolean;
  email?: string;
};

type Suggestion = { partnerId: string; score: number; rationale: string; _partner?: Attendee };

type FormState = {
  name: string;
  role: string;
  company: string;
  bio: string;
  interests: string[];
  goals: string[];
  availability: string;
  consent_intro: boolean;
  email?: string;
  event_code?: string;
};

// Simple TagInput for chips-style entry
function TagInput({
  label,
  value,
  onChange,
  placeholder,
  id,
  describedBy,
}: {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  id: string;
  describedBy?: string;
}) {
  const [input, setInput] = useState("");
  const ref = useRef<HTMLInputElement | null>(null);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      // Remove last tag on backspace when input is empty
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium" htmlFor={id}>{label}</label>
      <div className="border rounded px-2 py-2 flex flex-wrap gap-1 items-center border-gray-300 dark:border-gray-700">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {t}
            <button type="button" aria-label={`Remove ${t}`} className="opacity-70 hover:opacity-100" onClick={() => removeTag(t)}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm py-0.5 px-1"
          aria-describedby={describedBy}
        />
      </div>
      {describedBy && (
        <span id={describedBy} className="text-xs text-gray-500">Press Enter or comma to add. Backspace removes last.</span>
      )}
    </div>
  );
}

export default function OnboardAndMatch() {
  const [form, setForm] = useState<FormState>({
    name: "",
    role: "",
    company: "",
    bio: "",
    interests: [],
    goals: [],
    availability: "",
    consent_intro: true,
    email: "",
    event_code: "",
  });
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [valid, setValid] = useState<{ name?: string }>({});
  const [toast, setToast] = useState<{ text: string; kind?: 'success'|'error'}|null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Soft unify: prefill from saved attendee_id and auto-load matches
  useEffect(() => {
    const load = async () => {
      try {
        if (typeof window === 'undefined') return;
        const savedId = window.localStorage.getItem('attendee_id');
        if (!savedId) return;
        const res = await fetch(`/api/attendees?id=${encodeURIComponent(savedId)}`);
        const json = await res.json();
        if (!res.ok || !json.ok || !json.attendee) return;
        const a = json.attendee as Attendee & { consent_intro?: boolean };
        setAttendee(a);
        // Prefill form fields
        setForm((prev) => ({
          ...prev,
          name: a.name || "",
          role: a.role || "",
          company: a.company || "",
          bio: a.bio || "",
          interests: Array.isArray(a.interests) ? a.interests : [],
          goals: Array.isArray(a.goals) ? a.goals : [],
          availability: a.availability || "",
          consent_intro: typeof a.consent_intro === 'boolean' ? a.consent_intro : true,
          email: a.email || "",
        }));
        // Load matches
        const mres = await fetch("/api/match/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attendeeId: a.id, limit: 3 }),
        });
        const mjson = await mres.json();
        if (mres.ok && mjson.ok) {
          const sugs = (mjson.suggestions as Suggestion[]) || [];
          setSuggestions(sugs);
          if (sugs.length > 0) {
            const ids = sugs.map((s: Suggestion) => s.partnerId).join(",");
            const dres = await fetch(`/api/attendees?ids=${encodeURIComponent(ids)}`);
            const djson = await dres.json();
            if (dres.ok && djson.ok && Array.isArray(djson.attendees)) {
              const map: Record<string, Attendee> = {};
              (djson.attendees as Attendee[]).forEach((p: Attendee) => (map[p.id] = p));
              setSuggestions(sugs.map((s) => ({ ...s, _partner: map[s.partnerId] })));
            }
          }
        }
      } catch {
        // ignore prefill errors
      }
    };
    void load();
  }, []);

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
        interests: form.interests,
        goals: form.goals,
        availability: form.availability.trim() || undefined,
        consent_intro: !!form.consent_intro,
        email: (form.email || "").trim() || undefined,
        event_code: (form.event_code || "").trim() || undefined,
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
      // Persist attendee_id for soft unify between form and chat
      try { if (typeof window !== 'undefined') window.localStorage.setItem('attendee_id', a.id); } catch {}

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
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      // Ensure we have an attendee id
      let meId = attendee?.id;
      if (!meId && typeof window !== 'undefined') {
        meId = window.localStorage.getItem('attendee_id') || undefined;
      }
      if (!meId) throw new Error('Please save your profile first.');
      const res = await fetch('/api/intros/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: meId, partnerId })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to request intro');
      setMessage('Intro requested. We\'ll email your match to accept.');
      setToast({ text: 'Intro requested', kind: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to request intro';
      setError(msg);
      setToast({ text: msg, kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="register" className="w-full px-4 sm:px-6 lg:px-8 grid gap-6 grid-cols-1 lg:grid-cols-2 items-start">
      {/* Left: Form */}
      <form onSubmit={submit} className="grid gap-4 border rounded-2xl p-5 bg-white/70 dark:bg-black/60 backdrop-blur border-gray-200 dark:border-gray-800 w-full">
        <header className="space-y-1">
          <h3 className="font-semibold text-base">Register & Find Matches</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">Tell us a bit about you. We’ll suggest the best people to meet.</p>
        </header>
        <div className="grid gap-1">
          <label className="text-sm font-medium" htmlFor="name">Name</label>
          <input
            id="name"
            className={`border rounded px-3 py-2 ${valid.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            value={form.name}
            onChange={e => update("name", e.target.value)}
            placeholder="Your full name"
            aria-invalid={!!valid.name}
            aria-describedby={valid.name ? 'name-error' : undefined}
          />
          {valid.name && <span id="name-error" className="text-xs text-red-600">{valid.name}</span>}
        </div>
        <div className="grid gap-1 md:grid-cols-2 md:gap-3">
          <div>
            <label className="text-sm font-medium" htmlFor="role">Role</label>
            <input id="role" className="border rounded px-3 py-2 w-full border-gray-300 dark:border-gray-700" value={form.role} onChange={e => update("role", e.target.value)} placeholder="e.g. Founder, Engineer, Investor" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="company">Company</label>
            <input id="company" className="border rounded px-3 py-2 w-full border-gray-300 dark:border-gray-700" value={form.company} onChange={e => update("company", e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-medium" htmlFor="bio">Short bio</label>
          <textarea id="bio" className="border rounded px-3 py-2 border-gray-300 dark:border-gray-700" rows={3} value={form.bio} onChange={e => update("bio", e.target.value)} placeholder="1–2 lines about you" />
        </div>
        <div className="grid gap-1 md:grid-cols-2 md:gap-3">
          <div>
            <label className="text-sm font-medium" htmlFor="email">Email (for intros/notifications)</label>
            <input
              id="email"
              type="email"
              className="border rounded px-3 py-2 w-full border-gray-300 dark:border-gray-700"
              value={form.email || ""}
              onChange={e => update("email", e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="event_code">Event code</label>
            <input
              id="event_code"
              className="border rounded px-3 py-2 w-full border-gray-300 dark:border-gray-700"
              value={form.event_code || ""}
              onChange={e => update("event_code", e.target.value)}
              placeholder="e.g. devcon"
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 md:gap-3">
          <TagInput
            label="Interests"
            id="interests"
            value={form.interests}
            onChange={(tags) => update("interests", tags)}
            placeholder="ai, fintech, climate"
            describedBy="interests-help"
          />
          <TagInput
            label="Goals"
            id="goals"
            value={form.goals}
            onChange={(tags) => update("goals", tags)}
            placeholder="find cofounder, hire, raise"
            describedBy="goals-help"
          />
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-medium" htmlFor="availability">Availability</label>
          <input id="availability" className="border rounded px-3 py-2 border-gray-300 dark:border-gray-700" placeholder="Fri PM" value={form.availability} onChange={e => update("availability", e.target.value)} />
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

      {/* Right: Matches panel */}
      <aside className="h-fit space-y-3 border rounded-2xl p-5 bg-white/70 dark:bg-black/60 backdrop-blur border-gray-200 dark:border-gray-800 overflow-hidden w-full">
        <h3 className="font-semibold text-base">Live matches</h3>
        {!attendee && (
          <div className="text-sm text-gray-600">Fill in your profile and save to see suggestions here.</div>
        )}
        {attendee && !suggestions && (
          <ul className="space-y-2" aria-busy="true">
            {[...Array(3)].map((_, i) => (
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
        )}
        {suggestions && (
          <div className="space-y-3">
            {suggestions.length === 0 && <div className="text-sm text-gray-600">No matches yet. Try refining your preferences.</div>}
            <ul className="space-y-2">
              {suggestions.map((s) => {
                const partner = s._partner as Attendee | undefined;
                const initials = partner?.name ? partner.name.split(/\s+/).slice(0,2).map(n=>n[0]?.toUpperCase()).join("") : "?";
                return (
                  <li key={s.partnerId} className="relative border rounded-xl p-4 bg-white dark:bg-black hover:shadow-sm transition-all overflow-hidden">
                    <span className="absolute right-3 top-3 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {Math.round(s.score)}
                    </span>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold ring-1 ring-gray-300 dark:ring-gray-700">
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
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 break-words max-w-[10rem]">{t}</span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 break-words line-clamp-3">{s.rationale}</div>
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
                      <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 transition-all break-words">
                        {partner.bio && <p className="mb-2 break-words">{partner.bio}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          {(partner.interests || []).map((t) => (
                            <span key={`i-${t}`} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 break-words max-w-[12rem]">{t}</span>
                          ))}
                          {(partner.goals || []).map((t) => (
                            <span key={`g-${t}`} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 break-words max-w-[12rem]">{t}</span>
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
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {message && <div className="text-green-700 text-sm">{message}</div>}
        {attendee && (
          <div className="text-xs text-gray-600">Your ID: <code className="break-words">{attendee.id}</code></div>
        )}
      </aside>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`rounded-md px-3 py-2 shadow text-sm ${toast.kind === 'error' ? 'bg-red-600 text-white' : 'bg-black text-white dark:bg-white dark:text-black'}`} role="status">
            <div className="flex items-center gap-2">
              <span>{toast.text}</span>
              <button onClick={() => setToast(null)} className="text-xs opacity-80 hover:opacity-100">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
