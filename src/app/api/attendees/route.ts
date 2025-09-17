import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

// Create or update an attendee profile
// POST body: { id?, name, role, company, bio, interests: string[], goals: string[], availability, consent_intro }
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as Partial<{
      id: string
      name: string
      role: string
      company: string
      bio: string
      interests: string[]
      goals: string[]
      availability: string
      consent_intro: boolean
    }>
    const { id, ...fields } = payload || {}
    if (!fields || Object.keys(fields).length === 0) {
      return NextResponse.json({ ok: false, error: 'Missing payload' }, { status: 400 })
    }

    const { data, error } = id
      ? await supabase.from('attendees').update(fields).eq('id', id).select('*').single()
      : await supabase.from('attendees').insert(fields).select('*').single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, attendee: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to upsert attendee'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
