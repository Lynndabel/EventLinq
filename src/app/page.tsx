import Image from "next/image";

export default function Home() {
  return (
    <div className="font-sans min-h-screen grid grid-rows-[auto_1fr_auto]">
      <header className="px-6 py-4 border-b">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/next.svg" alt="Logo" width={40} height={12} className="dark:invert" />
            <span className="font-semibold">Sensay Event Matchmaker</span>
          </div>
          <nav className="text-sm text-muted-foreground">
            <a className="hover:underline" href="#how-it-works">How it works</a>
          </nav>
        </div>
      </header>
      <main className="px-6 py-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-start">
          <section>
            <h1 className="text-2xl font-bold mb-3">Meet the right people at your event</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              An AI agent that learns your goals and interests, suggests high-quality matches, and sends warm
              intros with consent — available on web and chat.
            </p>
            <ul className="list-disc ml-6 space-y-2 text-sm">
              <li>Onboard in under a minute</li>
              <li>AI-curated matches with clear rationale</li>
              <li>One-click intros and calendar coordination</li>
            </ul>
          </section>
          <section>
            <div className="rounded-xl border p-4">
              <h2 className="font-medium mb-2">Try it now</h2>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                Use the chat widget to get matched. We only introduce you when you confirm.
              </p>
              {/* Optional explicit mount target. The widget script will default to body if this is absent. */}
              <div id="sensay-widget-target" className="min-h-48" />
            </div>
          </section>
        </div>
        <section id="how-it-works" className="max-w-5xl mx-auto mt-16">
          <h2 className="text-xl font-semibold mb-3">How it works</h2>
          <ol className="list-decimal ml-6 space-y-2 text-sm">
            <li>Tell the bot who you are and what you’re looking for.</li>
            <li>Get 2–3 curated matches with why they fit.</li>
            <li>Confirm to send an intro. We ask the other person too.</li>
          </ol>
        </section>
      </main>
      <footer className="px-6 py-4 border-t text-xs text-center text-gray-600 dark:text-gray-300">
        Built for Sensay Connect Hackathon. Not affiliated with Sensay.
      </footer>
    </div>
  );
}
