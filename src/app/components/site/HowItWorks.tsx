export default function HowItWorks() {
  const steps = [
    { n: 1, t: "Tell us about you", d: "Share your goals, interests and availability." },
    { n: 2, t: "Get curated matches", d: "We rank the best people to meet with clear rationale." },
    { n: 3, t: "Confirm intros", d: "Approve intros and we coordinate the connection." },
  ];
  return (
    <section id="how-it-works" className="px-6 py-16">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold mb-8">How it works</h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white/60 dark:bg-black/60 backdrop-blur">
              <div className="text-xs text-gray-500 mb-2">Step {s.n}</div>
              <h3 className="font-medium mb-1">{s.t}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
