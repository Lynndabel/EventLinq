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
  const baseUrl = process.env.SENSAY_API_URL;
  const apiKey = process.env.SENSAY_API_KEY;
  const orgId = process.env.SENSAY_ORG_ID;
  if (!baseUrl || !apiKey) {
    return { ok: false, error: 'SENSAY_API_URL or SENSAY_API_KEY not configured' };
  }
  const url = `${baseUrl.replace(/\/$/, '')}/match`;
  try {
    console.log('Calling Sensay API:', url);
    console.log('Request payload:', req);
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
      ...(orgId ? { 'X-Org-Id': orgId } : {}),
    });
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(orgId ? { 'X-Org-Id': orgId } : {}),
      },
      body: JSON.stringify(req),
    });
    
    console.log('Sensay response status:', res.status);
    const json = (await res.json().catch(() => ({}))) as Partial<SensayMatchResponse>;
    console.log('Sensay response body:', json);
    
    if (!res.ok || json.ok === false) {
      return { ok: false, error: json.error || `Sensay match failed (${res.status})` };
    }
    return { ok: true, suggestions: json.suggestions || [] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sensay match request failed';
    console.error('Sensay API error:', e);
    return { ok: false, error: msg };
  }
}
