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
    <div className="grid gap-6 md:grid-cols-2">
      {/* Left: Form */}
      <form onSubmit={submit} className="grid gap-4">
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
      <aside className="md:sticky md:top-4 h-fit space-y-3">
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
                  <li key={s.partnerId} className="relative border rounded-xl p-4 bg-white dark:bg-black hover:shadow-sm transition-all">
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
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{t}</span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 truncate">{s.rationale}</div>
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
                      <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 transition-all">
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
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {message && <div className="text-green-700 text-sm">{message}</div>}
        {attendee && (
          <div className="text-xs text-gray-600">Your ID: <code>{attendee.id}</code></div>
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
    </div>
  );
}
