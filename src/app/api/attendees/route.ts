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

// Fetch attendee(s)
// GET /api/attendees?id=<id>
// GET /api/attendees?ids=<id1,id2,id3>
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const idsParam = url.searchParams.get('ids')

    if (id) {
      const { data, error } = await supabase.from('attendees').select('*').eq('id', id).single()
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true, attendee: data })
    }

    if (idsParam) {
      const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
      if (ids.length === 0) return NextResponse.json({ ok: true, attendees: [] })
      const { data, error } = await supabase.from('attendees').select('*').in('id', ids)
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true, attendees: data })
    }

    // Default: return last 50 for convenience
    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, attendees: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch attendees'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
