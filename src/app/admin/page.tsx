"use client";
import { useEffect, useState } from "react";

type Metrics = {
  signups: number;
  matchesProposed: number;
  introAcceptanceRate: number; // 0..1
  meetingsConfirmed: number;
};

type MetricsApiResponse = {
  ok: boolean;
  data?: Metrics;
  error?: string;
};

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/admin/metrics");
        const json = (await res.json()) as unknown;
        const data = json as MetricsApiResponse;
        if (!res.ok || !data?.ok) {
          const msg = (data && "error" in data && data.error) ? data.error : "Failed to load metrics";
          throw new Error(msg);
        }
        setMetrics(data.data ?? null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
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
