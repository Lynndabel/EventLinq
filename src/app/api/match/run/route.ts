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
    console.log('Sensay API response:', sensay)
    if (sensay.ok && Array.isArray(sensay.suggestions)) {
      console.log('Using Sensay AI suggestions:', sensay.suggestions.length)
      return NextResponse.json({ ok: true, attendeeId, suggestions: sensay.suggestions })
    }
    console.log('Falling back to local matching. Sensay error:', sensay.error)

    // Fallback to local heuristic matching
    const suggestions = await getSuggestions(attendeeId as string, take)
    return NextResponse.json({ ok: true, attendeeId, suggestions })
  } catch (e) {
    console.error('Match run error', e)
    return NextResponse.json({ ok: false, error: 'Match run failed' }, { status: 500 })
  }
}
