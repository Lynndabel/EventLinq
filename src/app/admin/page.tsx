"use client";
import { useEffect, useState } from "react";

type Metrics = {
  signups: number;
  matchesProposed: number;
  introAcceptanceRate: number; // 0..1
  meetingsConfirmed: number;
};

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/admin/metrics");
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load metrics");
        setMetrics(data.data as Metrics);
      } catch (e: any) {
        setError(e?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      {loading && <p>Loading metrics…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card title="Signups" value={metrics.signups} />
          <Card title="Matches Proposed" value={metrics.matchesProposed} />
          <Card
            title="Intro Acceptance"
            value={`${Math.round((metrics.introAcceptanceRate || 0) * 100)}%`}
          />
          <Card title="Meetings Confirmed" value={metrics.meetingsConfirmed} />
        </div>
      )}
      <p className="text-xs text-gray-600">
        Note: Metrics are placeholders until DB is connected.
      </p>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-xs text-gray-600">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
