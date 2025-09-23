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
  email?: string;
  event_code?: string;
  telegram?: string;
  x_handle?: string;
};

type Suggestion = { partnerId: string; score: number; rationale: string } & { _partner?: Attendee };

export default function ChatUI() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attendee, setAttendee] = useState<Attendee>({ consent_intro: true });
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [eventCode, setEventCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show my current intros with contact buttons
  const renderMyIntros = async (id: string) => {
    try {
      const res = await fetch(`/api/intros/mine?attendeeId=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok || !json.ok) return;
      const items = json.intros as Array<{ id: string; status: string; partner: Attendee }>;
      if (!items || items.length === 0) return;
      push({ id: crypto.randomUUID(), role: 'assistant', text: 'Your intros:', rich: (
        <ul className="mt-2 space-y-2">
          {items.map((it) => {
            const p = it.partner;
            const toUser = (raw?: string | null) => {
              if (!raw) return '';
              let s = String(raw).trim();
              s = s.replace(/^@/, '');
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
            return (
              <li key={it.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name || p.id}</div>
                    <div className="text-xs text-gray-600 truncate">Status: {it.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {it.status !== 'accepted' ? (
                      <>
                        <button className="text-xs rounded-md border px-2 py-1" onClick={() => actOnIntro(it.id, 'accept')}>Accept</button>
                        <button className="text-xs rounded-md border px-2 py-1" onClick={() => actOnIntro(it.id, 'decline')}>Decline</button>
                      </>
                    ) : (
                      <>
                        {tHandle && (
                          <a
                            className="text-xs rounded-md border px-2 py-1"
                            href={`https://t.me/${tHandle}`}
                            onClick={() => {
                              try {
                                const app = `tg://resolve?domain=${tHandle}`;
                                // Try open app first
                                window.location.href = app;
                                // Fallback to web after a short delay
                                setTimeout(() => {
                                  window.open(`https://t.me/${tHandle}`, '_blank');
                                }, 400);
                              } catch {}
                            }}
                            target="_blank"
                          >
                            Open Telegram
                          </a>
                        )}
                        {xLink && <a className="text-xs rounded-md border px-2 py-1" href={xLink} target="_blank">Open X</a>}
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )});
    } catch {}
  };

  // Run matching and render suggestions
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
        for (const a of djson.attendees as Attendee[]) map[a.id!] = a;
      }
      push({ id: crypto.randomUUID(), role: "assistant", text: "Top suggestions:", rich: (
        <ul className="mt-2 space-y-2">
          {sugs.map((s) => {
            const p = map[s.partnerId];
            const name = p?.name || s.partnerId;
            return (
              <li key={s.partnerId} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{name}</div>
                    <div className="text-xs text-gray-600 truncate">{s.rationale}</div>
                  </div>
                  <button
                    className="text-xs rounded-md border px-2 py-1"
                    style={{ background: 'var(--accent)' }}
                    onClick={() => requestIntro(s.partnerId)}
                  >
                    {myId ? 'Request Intro' : 'Profile'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ),
    });

    // Also show your current intros
    await renderMyIntros(id);
  } catch (e) {
    push({ id: crypto.randomUUID(), role: "assistant", text: e instanceof Error ? e.message : "Failed to run matching" });
  } finally {
    setLoading(false);
  }
};

  // Initialize chat state; re-run if eventCode changes (URL scope) or matching function identity updates
  useEffect(() => {
    // If we have a saved attendee, load and jump ahead; else intro message
    const init = async () => {
      try {
        if (typeof window === 'undefined') return;
        // Preload myId from localStorage if present
        const pre = window.localStorage.getItem('attendee_id');
        if (pre) setMyId(pre);
        // Read event code from URL and prefill
        try {
          const url = new URL(window.location.href);
          const ev = url.searchParams.get('event');
          if (ev) {
            const slug = ev.trim().toLowerCase();
            setEventCode(slug);
            setAttendee((prev) => ({ ...prev, event_code: slug }));
          }
        } catch {}
        const savedId = window.localStorage.getItem('attendee_id');
        if (!savedId) {
          const intro: Msg[] = [
            { id: crypto.randomUUID(), role: "assistant", text: "Hi! I can introduce you to great people at this event. Let's get you onboarded in a few quick steps." },
            { id: crypto.randomUUID(), role: 'assistant', text: "Tip: type 'event:<slug>' any time to switch events (e.g., event:devcon)." },
          ];
          if (eventCode) intro.push({ id: crypto.randomUUID(), role: 'assistant', text: `I'll scope your matches to the '${eventCode}' event.` });
          intro.push({ id: crypto.randomUUID(), role: 'assistant', text: "What's your name?" });
          setMessages(intro);
          return;
        }
        const res = await fetch(`/api/attendees?id=${encodeURIComponent(savedId)}`);
        const json = await res.json();
        if (!res.ok || !json.ok || !json.attendee) {
          setMessages([
            { id: crypto.randomUUID(), role: "assistant", text: "Hi! I can introduce you to great people at this event. Let's get you onboarded in a few quick steps." },
            { id: crypto.randomUUID(), role: "assistant", text: "What's your name?" },
          ]);
          return;
        }
        const a = json.attendee as Attendee;
        const desiredEvent = a.event_code || eventCode || undefined;
        setAttendee({ ...a, consent_intro: a.consent_intro ?? true, event_code: desiredEvent });
        if (a.id) setMyId(a.id);
        // If URL provided a different event than stored, auto-switch and save
        if (eventCode && a.event_code !== eventCode) {
          setMessages([
            { id: crypto.randomUUID(), role: 'assistant', text: `Welcome back${a.name ? ", " + a.name : ""}! I see this chat is scoped to '${eventCode}'. Updating your event and re-running matches…` },
          ]);
          try {
            const body = { ...a, event_code: eventCode } as Attendee;
            const sres = await fetch('/api/attendees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const sjson = await sres.json();
            if (sres.ok && sjson.ok && sjson.attendee?.id) {
              setAttendee(sjson.attendee);
              await runMatching(sjson.attendee.id);
              return;
            }
          } catch {}
        }
        setMessages([
          { id: crypto.randomUUID(), role: "assistant", text: `Welcome back${a.name ? ", " + a.name : ""}! I loaded your profile. Finding matches…` },
          { id: crypto.randomUUID(), role: 'assistant', text: "Tip: type 'event:<slug>' to switch events, or 'set interests: ai, fintech' to update your profile." },
        ]);
        await runMatching(a.id!);
      } catch {
        setMessages([
          { id: crypto.randomUUID(), role: "assistant", text: "Hi! I can introduce you to great people at this event. Let's get you onboarded in a few quick steps." },
          { id: crypto.randomUUID(), role: "assistant", text: "What's your name?" },
        ]);
      }
    };
    void init();
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

    // 1) Commands should take precedence over onboarding steps
    // Switch event: 'event:slug' or 'event slug'
    const evCmd = trimmed.match(/^event\s*[: ]\s*([a-z0-9_-]+)$/i);
    if (evCmd) {
      const slug = evCmd[1].toLowerCase();
      setEventCode(slug);
      setAttendee((prev) => ({ ...prev, event_code: slug }));
      push({ id: crypto.randomUUID(), role: 'assistant', text: `Event updated to '${slug}'. Finding matches…` });
      // If we already have an attendee id, run matching now; else wait for onboarding save
      const id = attendee.id || (typeof window !== 'undefined' ? window.localStorage.getItem('attendee_id') : null);
      if (id) {
        await runMatching(id);
      } else {
        push({ id: crypto.randomUUID(), role: 'assistant', text: "I'll use this event once we complete your onboarding." });
      }
      return;
    }

    // Edit commands: set field: value (quick updates)
    const setCmd = trimmed.match(/^set\s+(name|role|company|availability)\s*:\s*(.+)$/i);
    if (setCmd) {
      const field = setCmd[1].toLowerCase() as 'name'|'role'|'company'|'availability';
      const value = setCmd[2].trim();
      const next = { ...attendee, [field]: value } as Attendee;
      setAttendee(next);
      push({ id: crypto.randomUUID(), role: 'assistant', text: `Updating your ${field}…` });
      try {
        const body = { ...next } as Attendee;
        if (eventCode && !body.event_code) body.event_code = eventCode;
        const res = await fetch('/api/attendees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const js = await res.json();
        if (!res.ok || !js.ok) throw new Error(js.error || 'Failed to save');
        setAttendee(js.attendee as Attendee);
        push({ id: crypto.randomUUID(), role: 'assistant', text: 'Saved. Finding matches…' });
        if (js.attendee?.id) await runMatching(js.attendee.id);
      } catch (e) {
        push({ id: crypto.randomUUID(), role: 'assistant', text: e instanceof Error ? e.message : 'Failed to save' });
      }
      return;
    }

    // 2) If no commands matched, continue the simple step flow based on what is still missing
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
      const t = trimmed.trim();
      if (!t || /^skip$/i.test(t)) {
        push({ id: crypto.randomUUID(), role: "assistant", text: "Please add a short bio (1–2 lines)." });
        return;
      }
      a.bio = t;
      setAttendee(a);
      // Proceed to event scoping
      if (eventCode) {
        a.event_code = eventCode;
        setAttendee(a);
        push({ id: crypto.randomUUID(), role: "assistant", text: "Your Telegram username (optional, say 'skip'), e.g., @alice" });
        return;
      }
      push({ id: crypto.randomUUID(), role: "assistant", text: "Event code (optional, e.g., devcon). You can also say 'skip'." });
      return;
    }
    if (a.event_code === undefined) {
      // If the page is scoped by ?event=..., silently set it and continue
      if (eventCode) {
        a.event_code = eventCode;
        setAttendee(a);
        push({ id: crypto.randomUUID(), role: "assistant", text: "Your Telegram username (optional, say 'skip'), e.g., @alice" });
        return;
      }
      const t = trimmed.trim();
      if (t.toLowerCase() !== 'skip') { a.event_code = t; }
      setAttendee(a);
      push({ id: crypto.randomUUID(), role: "assistant", text: "Your Telegram username (optional, say 'skip'), e.g., @alice" });
      return;
    }
    if (a.telegram === undefined) {
      const t = trimmed.trim();
      if (t.toLowerCase() !== 'skip') a.telegram = t.replace(/^@/, '').trim();
      setAttendee(a);
      push({ id: crypto.randomUUID(), role: "assistant", text: "Your X/Twitter handle (optional, say 'skip'), e.g., @alice" });
      return;
    }
    if (a.x_handle === undefined) {
      const t = trimmed.trim();
      if (t.toLowerCase() !== 'skip') a.x_handle = t.replace(/^@/, '').trim();
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

    if (/^edit$/i.test(trimmed)) {
      push({ id: crypto.randomUUID(), role: 'assistant', text: "Edit tips:\n- set role: Founder\n- set company: Axil\n- set interests: ai, fintech\n- set goals: hire, find cofounder\n- event:devcon (switch event)" });
      return;
    }
    push({ id: crypto.randomUUID(), role: "assistant", text: "You can type 'match' to get suggestions again, or select a suggestion to request an intro." });
  };

  const saveAndMatch = async (a: Attendee) => {
    try {
      setLoading(true);
      push({ id: crypto.randomUUID(), role: "assistant", text: "Saving your profile…" });
      // save attendee
      const body = { ...a } as Attendee;
      if (eventCode && !body.event_code) body.event_code = eventCode;
      const res = await fetch("/api/attendees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to save profile");
      const saved: Attendee = json.attendee;
      setAttendee(saved);
      try {
        if (typeof window !== 'undefined' && saved.id) {
          window.localStorage.setItem('attendee_id', saved.id);
          setMyId(saved.id);
        }
      } catch {}
      push({ id: crypto.randomUUID(), role: "assistant", text: "Great! Finding matches…" });
      await runMatching(saved.id!);
    } catch (e) {
      push({ id: crypto.randomUUID(), role: "assistant", text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  const actOnIntro = async (introId: string, action: 'accept'|'decline') => {
    try {
      let me = myId;
      if (!me && typeof window !== 'undefined') {
        me = window.localStorage.getItem('attendee_id');
        if (me) setMyId(me);
      }
      if (!me) {
        // try minimal save
        const minimal = {
          name: attendee.name || 'Guest',
          role: attendee.role,
          company: attendee.company,
          bio: attendee.bio,
          interests: attendee.interests || [],
          goals: attendee.goals || [],
          availability: attendee.availability,
          consent_intro: attendee.consent_intro ?? true,
          event_code: attendee.event_code || eventCode || undefined,
        } as Attendee;
        try {
          const save = await fetch('/api/attendees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(minimal) });
          const sj = await save.json();
          if (save.ok && sj.ok && sj.attendee?.id) {
            me = sj.attendee.id as string;
            setMyId(me);
            if (typeof window !== 'undefined') window.localStorage.setItem('attendee_id', me);
          }
        } catch {}
      }
      if (!me) throw new Error('No attendee');
      const res = await fetch('/api/intros/act', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendeeId: me, introId, action }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to update intro');
      push({ id: crypto.randomUUID(), role: 'assistant', text: action === 'accept' ? 'Intro accepted. Contact options unlocked.' : 'Intro declined.' });
      await renderMyIntros(me);
    } catch (e) {
      push({ id: crypto.randomUUID(), role: 'assistant', text: e instanceof Error ? e.message : 'Failed to update intro' });
    }
  }

  const requestIntro = async (partnerId: string) => {
    try {
      setLoading(true);
      // Ensure we have an attendee id
      let meId = attendee.id;
      if (!meId) {
        // Try to recover from localStorage
        try {
          if (typeof window !== 'undefined') {
            const savedId = window.localStorage.getItem('attendee_id');
            if (savedId) {
              const res = await fetch(`/api/attendees?id=${encodeURIComponent(savedId)}`);
              const json = await res.json();
              if (res.ok && json.ok && json.attendee) {
                setAttendee((prev) => ({ ...prev, ...json.attendee }));
                meId = json.attendee.id as string;
              }
            }
          }
        } catch {}
      }
      // If still no id, try creating a minimal attendee
      if (!meId) {
        const minimal = {
          name: attendee.name || 'Guest',
          role: attendee.role,
          company: attendee.company,
          bio: attendee.bio,
          interests: attendee.interests || [],
          goals: attendee.goals || [],
          availability: attendee.availability,
          consent_intro: attendee.consent_intro ?? true,
          email: attendee.email,
          event_code: attendee.event_code || eventCode || undefined,
        };
        try {
          const save = await fetch('/api/attendees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(minimal) });
          const sj = await save.json();
          if (save.ok && sj.ok && sj.attendee?.id) {
            meId = sj.attendee.id as string;
            setAttendee((prev) => ({ ...prev, id: meId }));
            if (typeof window !== 'undefined') window.localStorage.setItem('attendee_id', meId);
          }
        } catch {}
      }
      if (!meId) throw new Error('Please complete onboarding first');
      const res = await fetch('/api/intros/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: meId, partnerId })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to request intro');
      if (json.note === 'existing_intro') {
        push({ id: crypto.randomUUID(), role: 'assistant', text: 'Intro already requested. Waiting for response.' });
      } else {
        push({ id: crypto.randomUUID(), role: 'assistant', text: 'Intro requested. Your match can accept in-app.' });
      }
    } catch (e) {
      push({ id: crypto.randomUUID(), role: "assistant", text: e instanceof Error ? e.message : "Failed to create intro" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const v = input;
    setInput("");
    setBusy(true);
    inputRef.current?.focus();
    const run = async () => {
      try { await handleUser(v); } finally { setBusy(false); inputRef.current?.focus(); }
    };
    void run();
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
          ref={inputRef}
        />
        <button type="submit" className="rounded-md text-white px-4 py-2 text-sm disabled:opacity-60" style={{ background: 'var(--accent)' }} disabled={busy || loading}>
          {busy || loading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
