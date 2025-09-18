import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { getSuggestions } from '../../../../lib/match'

// Sensay webhook endpoint
// Point Sensay Studio webhook to: POST /api/sensay/webhook
// This handler supports simple events: intake.submit, match.request, intro.confirm
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as unknown
    const root = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
    const event = (typeof root.event === 'string' ? root.event : undefined)
    const payload = (root.payload && typeof root.payload === 'object' ? (root.payload as Record<string, unknown>) : root)

    switch (event) {
      case 'intake.submit':
        // Expect fields in payload: { id?, name, role, company, bio, interests, goals, availability, consent_intro }
        // Create or update attendee
        try {
          const id = (payload?.id as string | undefined)
          const fields = {
            name: typeof payload?.name === 'string' ? (payload.name as string) : undefined,
            role: typeof payload?.role === 'string' ? (payload.role as string) : undefined,
            company: typeof payload?.company === 'string' ? (payload.company as string) : undefined,
            bio: typeof payload?.bio === 'string' ? (payload.bio as string) : undefined,
            interests: Array.isArray(payload?.interests) ? (payload.interests as string[]) : undefined,
            goals: Array.isArray(payload?.goals) ? (payload.goals as string[]) : undefined,
            availability: typeof payload?.availability === 'string' ? (payload.availability as string) : undefined,
            consent_intro: typeof payload?.consent_intro === 'boolean' ? (payload.consent_intro as boolean) : undefined,
          }
          const { data, error } = id
            ? await supabase.from('attendees').update(fields).eq('id', id).select('*').single()
            : await supabase.from('attendees').insert(fields).select('*').single()
          if (error) throw error
          return NextResponse.json({ ok: true, attendee: data })
        } catch (e: unknown) {
          const anyErr = e as { message?: string; code?: string } | undefined
          const msg = anyErr?.message || (e instanceof Error ? e.message : 'Failed to upsert attendee')
          return NextResponse.json({ ok: false, error: msg, code: anyErr?.code }, { status: 400 })
        }

      case 'match.request':
        // Expect: { attendeeId, limit? }
        try {
          const attendeeId = payload?.attendeeId as string | undefined
          const limit = typeof payload?.limit === 'number' ? (payload.limit as number) : 3
          if (!attendeeId) return NextResponse.json({ ok: false, error: 'attendeeId required' }, { status: 400 })
          const suggestions = await getSuggestions(attendeeId, limit)
          // Optionally persist suggestions in matches table
          if (suggestions.length) {
            const rows = suggestions.map(s => ({ attendee_id: attendeeId, partner_id: s.partnerId, score: s.score, rationale: s.rationale }))
            await supabase.from('matches').insert(rows).select('id')
          }
          return NextResponse.json({ ok: true, attendeeId, suggestions })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Failed to compute matches'
          return NextResponse.json({ ok: false, error: msg }, { status: 500 })
        }

      case 'intro.confirm':
        // Expect: { a_id, b_id, status? } — create intro as proposed/accepted
        try {
          const a_id = payload?.a_id as string | undefined
          const b_id = payload?.b_id as string | undefined
          const status = payload?.status as string | undefined
          if (!a_id || !b_id) return NextResponse.json({ ok: false, error: 'a_id and b_id required' }, { status: 400 })
          const st = (typeof status === 'string' && ['proposed', 'accepted', 'declined', 'met'].includes(status)) ? status : 'proposed'
          const { data, error } = await supabase
            .from('intros')
            .insert({ a_id, b_id, status: st })
            .select('*')
            .single()
          if (error) throw error
          return NextResponse.json({ ok: true, intro: data })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Failed to create intro'
          return NextResponse.json({ ok: false, error: msg }, { status: 500 })
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
