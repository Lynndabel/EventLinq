"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import WidgetConfigurator from "./components/WidgetConfigurator";

export default function ClientHome() {
  // theme: 'system' | 'light' | 'dark'
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'system';
    const saved = window.localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldDark = theme === 'dark' || (theme === 'system' && prefersDark);
    root.classList.toggle('dark', shouldDark);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    setTheme(prev => prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system');
  };

  return (
    <div className="font-sans min-h-screen grid grid-rows-[auto_1fr_auto] bg-white dark:bg-black">
      {/* Ensure the Sensay widget initializes and gets configured */}
      <WidgetConfigurator />
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/next.svg" alt="Logo" width={40} height={12} className="dark:invert" />
            <span className="font-semibold">EventLinq · Sensay Matchmaker</span>
          </div>
          <nav className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-4">
            <a className="hover:underline" href="#how-it-works">How it works</a>
            <a className="hover:underline" href="#try-it">Try it</a>
            <a className="hover:underline" href="/chat">Chat</a>
            <button
              onClick={cycleTheme}
              aria-label="Toggle theme"
              title={mounted ? `Theme: ${theme}` : 'Theme'}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <span className="inline-block h-3 w-3 rounded-full"
                style={mounted ? { background: theme === 'dark' ? '#111827' : theme === 'light' ? '#f9fafb' : 'linear-gradient(90deg,#111827 0%,#f9fafb 100%)', border: '1px solid #9ca3af' } : { background: '#e5e7eb', border: '1px solid #9ca3af' }}
              />
              {mounted ? (theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark') : 'Theme'}
            </button>
          </nav>
        </div>
      </header>
      <main className="px-6 pt-16 pb-24">
        <div className="max-w-7xl mx-auto grid gap-12 lg:grid-cols-12 items-start">
          <section className="space-y-6 lg:col-span-7">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">Match with the right people, faster</h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
              EventLinq uses Sensay AI to understand your goals and connect you with highly relevant people.
              Approvals are consent-based and intros are coordinated for you.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href="#try-it" className="btn-primary rounded-md px-4 py-2 text-sm shadow">
                Get Started
              </a>
              <a href="/chat" className="rounded-md border border-gray-200 dark:border-gray-800 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900">
                Open Chat
              </a>
            </div>
            <ul className="grid gap-2 text-sm text-gray-700 dark:text-gray-300 max-w-xl pt-2">
              <li>• Onboard in under a minute</li>
              <li>• AI‑curated matches with clear rationale</li>
              <li>• One‑click intros and simple coordination</li>
            </ul>
          </section>
          <section id="try-it" className="lg:col-span-5 w-full">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white/70 dark:bg-black/70 backdrop-blur">
              <h2 className="font-semibold mb-1">Try it in Chat</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Onboard in chat and get your matches instantly.</p>
              <a href="/chat" className="btn-primary rounded-md px-4 py-2 text-sm shadow inline-block">Open Chat</a>
            </div>
          </section>
        </div>
        <section id="how-it-works" className="max-w-7xl mx-auto mt-24">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <ol className="list-decimal ml-6 space-y-2 text-base text-gray-700 dark:text-gray-300 max-w-3xl">
            <li>Tell us who you are and what you’re looking for.</li>
            <li>Get 2–3 curated matches with a short rationale.</li>
            <li>Confirm to send an intro. We ask the other person too.</li>
          </ol>
        </section>
      </main>
      <footer className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 text-xs text-center text-gray-600 dark:text-gray-300">
        © {new Date().getFullYear()} EventLinq. Built for Sensay Connect Hackathon.
      </footer>
    </div>
  );
}
