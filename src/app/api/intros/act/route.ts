import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { attendeeId?: string; introId?: string; action?: 'accept'|'decline' }
    const { attendeeId, introId, action } = body || {}
    if (!attendeeId || !introId || !action || !['accept','decline'].includes(action)) {
      return NextResponse.json({ ok: false, error: 'attendeeId, introId and valid action are required' }, { status: 400 })
    }

    // Load intro
    const { data: intro, error } = await supabase.from('intros').select('*').eq('id', introId).single()
    if (error || !intro) return NextResponse.json({ ok: false, error: error?.message || 'Intro not found' }, { status: 404 })

    // Only a participant can act
    if (intro.a_id !== attendeeId && intro.b_id !== attendeeId) {
      return NextResponse.json({ ok: false, error: 'Not authorized to act on this intro' }, { status: 403 })
    }

    const status = action === 'accept' ? 'accepted' : 'declined'
    const { error: upErr } = await supabase.from('intros').update({ status }).eq('id', introId)
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 })

    return NextResponse.json({ ok: true, status })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to update intro'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
