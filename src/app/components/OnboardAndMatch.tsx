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

type Suggestion = { partnerId: string; score: number; rationale: string };

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

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
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
      setSuggestions(mjson.suggestions as Suggestion[]);
      setMessage("Profile saved. Here are your suggested matches.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create intro";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm font-medium">Name</label>
          <input className="border rounded px-3 py-2" required value={form.name} onChange={e => update("name", e.target.value)} />
        </div>
        <div className="grid gap-1 md:grid-cols-2 md:gap-3">
          <div>
            <label className="text-sm font-medium">Role</label>
            <input className="border rounded px-3 py-2 w-full" value={form.role} onChange={e => update("role", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Company</label>
            <input className="border rounded px-3 py-2 w-full" value={form.company} onChange={e => update("company", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-medium">Short bio</label>
          <textarea className="border rounded px-3 py-2" rows={3} value={form.bio} onChange={e => update("bio", e.target.value)} />
        </div>
        <div className="grid gap-1 md:grid-cols-2 md:gap-3">
          <div>
            <label className="text-sm font-medium">Interests (comma‑separated)</label>
            <input className="border rounded px-3 py-2 w-full" placeholder="ai, fintech, climate" value={form.interests} onChange={e => update("interests", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Goals (comma‑separated)</label>
            <input className="border rounded px-3 py-2 w-full" placeholder="find cofounder, hire, raise" value={form.goals} onChange={e => update("goals", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-medium">Availability</label>
          <input className="border rounded px-3 py-2" placeholder="Fri PM" value={form.availability} onChange={e => update("availability", e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="rounded bg-foreground text-background px-4 py-2 disabled:opacity-70">
          {loading ? "Saving..." : "Save & Find Matches"}
        </button>
      </form>

      {error && <div className="text-red-600 text-sm">{error}</div>}
      {message && <div className="text-green-700 text-sm">{message}</div>}

      {attendee && (
        <div className="text-sm text-gray-600">Your ID: <code>{attendee.id}</code></div>
      )}

      {suggestions && (
        <div className="space-y-3">
          <h3 className="font-medium">Suggested matches</h3>
          {suggestions.length === 0 && <div className="text-sm text-gray-600">No matches yet. Try adding more attendees.</div>}
          <ul className="space-y-2">
            {suggestions.map(s => (
              <li key={s.partnerId} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm">Partner: <code>{s.partnerId}</code></div>
                  <div className="text-xs text-gray-600">{s.rationale} • Score {s.score.toFixed(2)}</div>
                </div>
                <button onClick={() => requestIntro(s.partnerId)} className="text-sm rounded border px-3 py-1 hover:bg-gray-50">
                  Request Intro
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
