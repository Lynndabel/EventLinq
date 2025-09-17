import { NextRequest, NextResponse } from 'next/server'
import { getSuggestions } from '../../../../lib/match'

// Matching endpoint: returns top suggestions for a given attendeeId
export async function POST(req: NextRequest) {
  try {
    const { attendeeId, limit } = await req.json()
    if (!attendeeId) {
      return NextResponse.json({ ok: false, error: 'attendeeId is required' }, { status: 400 })
    }

    const suggestions = await getSuggestions(attendeeId as string, typeof limit === 'number' ? limit : 3)
    return NextResponse.json({ ok: true, attendeeId, suggestions })
  } catch (e) {
    console.error('Match run error', e)
    return NextResponse.json({ ok: false, error: 'Match run failed' }, { status: 500 })
  }
}
