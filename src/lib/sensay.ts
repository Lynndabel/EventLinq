export type SensayMatchRequest = {
  attendeeId: string;
  limit?: number;
};

export type SensayMatchResponse = {
  ok: boolean;
  suggestions?: { partnerId: string; score: number; rationale: string }[];
  error?: string;
};

export async function callSensayMatch(req: SensayMatchRequest): Promise<SensayMatchResponse> {
  const url = process.env.SENSAY_MATCH_URL;
  const apiKey = process.env.SENSAY_API_KEY;
  const orgId = process.env.SENSAY_ORG_ID;
  if (!url || !apiKey) {
    return { ok: false, error: 'SENSAY_MATCH_URL or SENSAY_API_KEY not configured' };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(orgId ? { 'X-Org-Id': orgId } : {}),
      },
      body: JSON.stringify(req),
      // Keep a reasonable timeout by racing against AbortController if needed (omitted for brevity)
    });
    const json = (await res.json().catch(() => ({}))) as Partial<SensayMatchResponse>;
    if (!res.ok || json.ok === false) {
      return { ok: false, error: json.error || `Sensay match failed (${res.status})` };
    }
    return { ok: true, suggestions: json.suggestions || [] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sensay match request failed';
    return { ok: false, error: msg };
  }
}
