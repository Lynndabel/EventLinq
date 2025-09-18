"use client";
import OnboardAndMatch from "../OnboardAndMatch";

export default function RegisterSection() {
  return (
    <section id="register" className="px-6 py-16">
      <div className="max-w-7xl mx-auto grid gap-10 lg:grid-cols-12 items-start">
        <div className="lg:col-span-5">
          <div className="gradient-border">
            <div className="gradient-inner rounded-2xl p-6 shadow-sm bg-white/80 dark:bg-black/80 backdrop-blur">
              <h2 className="font-semibold mb-1">Register & Find Matches</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Use the form to get matched. We only introduce you when you confirm.
              </p>
              <div className="mt-6">
                <OnboardAndMatch />
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white/60 dark:bg-black/60 backdrop-blur">
            <h3 className="font-medium mb-2">What to expect</h3>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <li>• 2–3 curated matches with a short rationale</li>
              <li>• Clear profiles with interests and goals</li>
              <li>• One‑click intros and simple coordination</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
