"use client";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur z-20">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="EventLinq" width={24} height={24} priority />
          <span className="font-semibold">EventLinq</span>
        </Link>
        <nav className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-4">
          <a className="hover:underline" href="#how-it-works">How it works</a>
          <a className="hover:underline" href="#features">Features</a>
          <Link className="hover:underline" href="/matches">Matches</Link>
          <Link className="hover:underline" href="/chat">Chat</Link>
          <a href="#register" className="btn-primary rounded-md px-3 py-1.5 text-xs shadow">Get Started</a>
        </nav>
      </div>
    </header>
  );
}
