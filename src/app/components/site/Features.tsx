export default function Features() {
  const items = [
    { title: "Smart onboarding", desc: "We ask only what matters and learn your preferences." },
    { title: "High‑quality matches", desc: "Ranked suggestions with rationale and overlapping interests." },
    { title: "Consent‑first intros", desc: "You confirm before we introduce. No spam." },
  ];
  return (
    <section id="features" className="px-6 py-16">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold mb-8">Features</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white/60 dark:bg-black/60 backdrop-blur">
              <div className="h-8 w-8 rounded bg-[var(--accent)] mb-3" />
              <h3 className="font-medium mb-1">{f.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
