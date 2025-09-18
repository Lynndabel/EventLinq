"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { id: string; role: "user" | "assistant"; text: string; rich?: React.ReactNode };

type Attendee = {
  id?: string;
  name?: string;
  role?: string;
  company?: string;
  bio?: string;
  interests?: string[];
  goals?: string[];
  availability?: string;
  consent_intro?: boolean;
};

type Suggestion = { partnerId: string; score: number; rationale: string } & { _partner?: Attendee };

export default function ChatUI() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attendee, setAttendee] = useState<Attendee>({ consent_intro: true });
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // intro message
    setMessages([
      { id: crypto.randomUUID(), role: "assistant", text: "Hi! I can introduce you to great people at this event. Let's get you onboarded in a few quick steps." },
      { id: crypto.randomUUID(), role: "assistant", text: "What's your name?" },
    ]);
  }, []);

  useEffect(() => {
    // auto scroll
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const push = (m: Msg) => setMessages((prev) => [...prev, m]);

  const handleUser = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    push({ id: crypto.randomUUID(), role: "user", text: trimmed });

    // simple step flow based on what is still missing
    const a = { ...attendee };
    if (!a.name) {
      a.name = trimmed;
      setAttendee(a);
      push({ id: crypto.randomUUID(), role: "assistant", text: "Nice to meet you! What's your role? (e.g., Founder, Engineer, Investor)" });
      return;
    }
    if (!a.role) {
      a.role = trimmed;
      setAttendee(a);
      push({ id: crypto.randomUUID(), role: "assistant", text: "Great. What's your company? (or say 'skip')" });
      return;
    }
    if (a.company === undefined) {
      a.company = trimmed.toLowerCase() === "skip" ? undefined : trimmed;
      setAttendee(a);
      push({ id: crypto.randomUUID(), role: "assistant", text: "Add a short bio (1–2 lines) or say 'skip'." });
      return;
    }
    if (a.bio === undefined) {
      a.bio = trimmed.toLowerCase() === "skip" ? undefined : trimmed;
      setAttendee(a);
      push({ id: crypto.randomUUID(), role: "assistant", text: "List your interests (comma-separated), e.g., ai, fintech, climate" });
      return;
    }
    if (!a.interests) {
      a.interests = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      setAttendee(a);
      push({ id: crypto.randomUUID(), role: "assistant", text: "List your goals (comma-separated), e.g., find cofounder, hire, raise" });
      return;
    }
    if (!a.goals) {
      a.goals = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      setAttendee(a);
      push({ id: crypto.randomUUID(), role: "assistant", text: "When are you available? (e.g., Fri PM)" });
      return;
    }
    if (!a.availability) {
      a.availability = trimmed;
      setAttendee(a);
      await saveAndMatch(a);
      return;
    }

    // After onboarding, interpret simple commands
    if (/^match$/i.test(trimmed) && attendee.id) {
      await runMatching(attendee.id);
      return;
    }
    push({ id: crypto.randomUUID(), role: "assistant", text: "You can type 'match' to get suggestions again, or select a suggestion to request an intro." });
  };

  const saveAndMatch = async (a: Attendee) => {
    try {
      setLoading(true);
      push({ id: crypto.randomUUID(), role: "assistant", text: "Saving your profile…" });
      // save attendee
      const res = await fetch("/api/attendees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to save profile");
      const saved: Attendee = json.attendee;
      setAttendee(saved);
      push({ id: crypto.randomUUID(), role: "assistant", text: "Great! Finding matches…" });
      await runMatching(saved.id!);
    } catch (e) {
      push({ id: crypto.randomUUID(), role: "assistant", text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  const runMatching = async (id: string) => {
    try {
      setLoading(true);
      const mres = await fetch("/api/match/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attendeeId: id, limit: 3 }) });
      const mjson = await mres.json();
      if (!mres.ok || !mjson.ok) throw new Error(mjson.error || "Failed to run matching");
      const sugs: Suggestion[] = mjson.suggestions || [];
      setSuggestions(sugs);
      if (sugs.length === 0) {
        push({ id: crypto.randomUUID(), role: "assistant", text: "No matches yet. Try again shortly or invite more attendees." });
        return;
      }
      // enrich
      const ids = sugs.map((s) => s.partnerId).join(",");
      const dres = await fetch(`/api/attendees?ids=${encodeURIComponent(ids)}`);
      const djson = await dres.json();
      const map: Record<string, Attendee> = {};
      if (dres.ok && djson.ok && Array.isArray(djson.attendees)) {
        (djson.attendees as Attendee[]).forEach((p) => (map[p.id!] = p));
      }
      // render as a rich assistant message
      push({
        id: crypto.randomUUID(),
        role: "assistant",
        text: "Here are your top matches:",
        rich: (
          <ul className="mt-2 space-y-2">
            {sugs.map((s) => {
              const p = map[s.partnerId];
              const initials = p?.name ? p.name.split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("") : "?";
              return (
                <li key={s.partnerId} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold">{initials}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p?.name || s.partnerId}</div>
                      <div className="text-xs text-gray-600 truncate">{[p?.role, p?.company].filter(Boolean).join(" • ")}</div>
                      <div className="text-[10px] text-gray-600 mt-1 truncate">{s.rationale} • Score {s.score.toFixed(2)}</div>
                    </div>
                  </div>
                  <button className="text-xs rounded-md text-white px-3 py-1.5 hover:opacity-90 whitespace-nowrap" style={{ background: 'var(--accent)' }} onClick={() => requestIntro(s.partnerId)}>Request Intro</button>
                </li>
              );
            })}
          </ul>
        ),
      });
    } catch (e) {
      push({ id: crypto.randomUUID(), role: "assistant", text: e instanceof Error ? e.message : "Failed to run matching" });
    } finally {
      setLoading(false);
    }
  };

  const requestIntro = async (partnerId: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/sensay/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "intro.confirm", payload: { a_id: attendee.id, b_id: partnerId, status: "proposed" } }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to create intro");
      push({ id: crypto.randomUUID(), role: "assistant", text: "Intro proposed. We'll notify both parties." });
    } catch (e) {
      push({ id: crypto.randomUUID(), role: "assistant", text: e instanceof Error ? e.message : "Failed to create intro" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input;
    setInput("");
    void handleUser(v);
  };

  return (
    <div className="h-[calc(100vh-4rem)] max-w-4xl mx-auto border rounded-xl overflow-hidden bg-white/60 dark:bg-black/60 backdrop-blur">
      <div ref={scrollerRef} className="h-[calc(100%-64px)] overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-[var(--accent)] text-white' : 'bg-gray-100 dark:bg-gray-900'}`}>
              {m.text}
              {m.rich}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500">Thinking…</div>}
      </div>
      <form onSubmit={onSubmit} className="h-16 border-t bg-white/80 dark:bg-black/80 px-3 flex items-center gap-2">
        <input
          className="flex-1 rounded-md border px-3 py-2 text-sm border-gray-200 dark:border-gray-800"
          placeholder={attendee.id ? 'Type a message… (or `match`)' : 'Type here…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="rounded-md text-white px-4 py-2 text-sm" style={{ background: 'var(--accent)' }}>
          Send
        </button>
      </form>
    </div>
  );
}
