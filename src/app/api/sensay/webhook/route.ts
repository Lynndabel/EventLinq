import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { getSuggestions } from '../../../../lib/match'

// Sensay webhook endpoint
// Point Sensay Studio webhook to: POST /api/sensay/webhook
// This handler supports simple events: intake.submit, match.request, intro.confirm
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const event = body?.event as string | undefined
    const payload = body?.payload ?? body

    switch (event) {
      case 'intake.submit':
        // Expect fields in payload: { id?, name, role, company, bio, interests, goals, availability, consent_intro }
        // Create or update attendee
        try {
          const { id, ...fields } = payload || {}
          const { data, error } = id
            ? await supabase.from('attendees').update(fields).eq('id', id).select('*').single()
            : await supabase.from('attendees').insert(fields).select('*').single()
          if (error) throw error
          return NextResponse.json({ ok: true, attendee: data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e?.message || 'Failed to upsert attendee' }, { status: 400 })
        }

      case 'match.request':
        // Expect: { attendeeId, limit? }
        try {
          const attendeeId = payload?.attendeeId as string
          const limit = typeof payload?.limit === 'number' ? payload.limit : 3
          if (!attendeeId) return NextResponse.json({ ok: false, error: 'attendeeId required' }, { status: 400 })
          const suggestions = await getSuggestions(attendeeId, limit)
          // Optionally persist suggestions in matches table
          if (suggestions.length) {
            const rows = suggestions.map(s => ({ attendee_id: attendeeId, partner_id: s.partnerId, score: s.score, rationale: s.rationale }))
            await supabase.from('matches').insert(rows).select('id')
          }
          return NextResponse.json({ ok: true, attendeeId, suggestions })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e?.message || 'Failed to compute matches' }, { status: 500 })
        }

      case 'intro.confirm':
        // Expect: { a_id, b_id, status? } — create intro as proposed/accepted
        try {
          const { a_id, b_id, status } = payload || {}
          if (!a_id || !b_id) return NextResponse.json({ ok: false, error: 'a_id and b_id required' }, { status: 400 })
          const st = ['proposed', 'accepted', 'declined', 'met'].includes(status) ? status : 'proposed'
          const { data, error } = await supabase
            .from('intros')
            .insert({ a_id, b_id, status: st })
            .select('*')
            .single()
          if (error) throw error
          return NextResponse.json({ ok: true, intro: data })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e?.message || 'Failed to create intro' }, { status: 500 })
        }

      default:
        // Unknown or ping event — acknowledge
        return NextResponse.json({ ok: true, received: body })
    }
  } catch (err) {
    console.error('Webhook error', err)
    return NextResponse.json({ ok: false, error: 'Webhook handler failed' }, { status: 500 })
  }
}
