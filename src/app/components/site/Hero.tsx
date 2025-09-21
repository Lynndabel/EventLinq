"use client";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative px-6 pt-20 pb-16 bg-transparent overflow-hidden">
      {/* Decorative background orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-sky-400/10 blur-3xl" />
      <div className="max-w-7xl mx-auto grid gap-10 lg:grid-cols-12 items-center">
        <div className="space-y-6 lg:col-span-7">
          <h1 className="text-4xl lg:text-6xl font-bold leading-tight tracking-tight">
            Connect with the right people — faster
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
            EventLinq uses Sensay AI to understand your goals and match you with highly relevant attendees.
            Consent-first intros. Simple coordination.
          </p>
          {/* Icon badges */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 bg-white/60 dark:bg-black/60 backdrop-blur">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20l9-5-9-5-9 5 9 5z"/><path d="M12 12l9-5-9-5-9 5 9 5z"/></svg>
              AI‑powered matches
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 bg-white/60 dark:bg-black/60 backdrop-blur">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
              Consent‑first intros
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 bg-white/60 dark:bg-black/60 backdrop-blur">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Works on web & chat
            </span>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <a href="#register" className="btn-primary rounded-md px-5 py-2.5 text-sm shadow">
              Get Started
            </a>
            <Link href="/chat" className="rounded-md border border-gray-200 dark:border-gray-800 px-5 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-900">
              Open Chat
            </Link>
          </div>
          <ul className="grid gap-2 text-sm text-gray-700 dark:text-gray-300 max-w-xl pt-2">
            <li>• Onboard in under a minute</li>
            <li>• AI‑curated matches with clear rationale</li>
            <li>• One‑click intros and coordination</li>
          </ul>
        </div>
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white/60 dark:bg-black/60 backdrop-blur">
            <div className="relative h-56 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
              <svg viewBox="0 0 400 200" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="heroG" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7c3aed"/>
                    <stop offset="100%" stopColor="#22d3ee"/>
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="400" height="200" fill="url(#heroG)" opacity="0.1" />
                <g fill="none" stroke="url(#heroG)" opacity="0.6">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <circle key={i} cx={200} cy={100} r={15 + i * 15} />
                  ))}
                </g>
                <g>
                  <circle cx="110" cy="70" r="18" fill="#fff" />
                  <text x="110" y="75" textAnchor="middle" fontSize="10" fill="#111">AI</text>
                  <circle cx="280" cy="120" r="18" fill="#fff" />
                  <text x="280" y="125" textAnchor="middle" fontSize="10" fill="#111">UX</text>
                  <circle cx="210" cy="40" r="18" fill="#fff" />
                  <text x="210" y="45" textAnchor="middle" fontSize="10" fill="#111">PM</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
