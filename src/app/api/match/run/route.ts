import { NextRequest, NextResponse } from 'next/server'
import { getSuggestions } from '../../../../lib/match'
import { callSensayMatch } from '../../../../lib/sensay'

// Matching endpoint: returns top suggestions for a given attendeeId
export async function POST(req: NextRequest) {
  try {
    const { attendeeId, limit } = await req.json()
    if (!attendeeId) {
      return NextResponse.json({ ok: false, error: 'attendeeId is required' }, { status: 400 })
    }

    const take = typeof limit === 'number' ? limit : 3
    // Try Sensay AI first (if configured)
    const sensay = await callSensayMatch({ attendeeId, limit: take })
    if (sensay.ok && Array.isArray(sensay.suggestions)) {
      return NextResponse.json({ ok: true, attendeeId, suggestions: sensay.suggestions })
    }

    // Fallback to local heuristic matching
    const suggestions = await getSuggestions(attendeeId as string, take)
    return NextResponse.json({ ok: true, attendeeId, suggestions })
  } catch (e) {
    console.error('Match run error', e)
    return NextResponse.json({ ok: false, error: 'Match run failed' }, { status: 500 })
  }
}
