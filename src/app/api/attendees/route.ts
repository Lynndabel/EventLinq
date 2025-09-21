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
      email: string
      event_code: string
      telegram: string
      x_handle: string
    }>
    const { id, event_code, ...fields } = payload || {}
    if (!fields || Object.keys(fields).length === 0) {
      return NextResponse.json({ ok: false, error: 'Missing payload' }, { status: 400 })
    }

    // Resolve event_code -> events.slug; create if missing
    let event_id: string | undefined
    if (typeof event_code === 'string' && event_code.trim()) {
      const slug = event_code.trim().toLowerCase()
      const found = await supabase.from('events').select('id, slug').eq('slug', slug).maybeSingle()
      if ((found as any).error) {
        // ignore lookup errors; proceed without event
      } else if (found.data?.id) {
        event_id = found.data.id as string
      } else {
        const created = await supabase.from('events').insert({ slug, name: slug }).select('id').single()
        if (!created.error && created.data?.id) {
          event_id = created.data.id as string
        }
      }
    }

    const upsertFields = { ...fields, ...(event_id ? { event_id } : {}) }

    const { data, error } = id
      ? await supabase.from('attendees').update(upsertFields).eq('id', id).select('*').single()
      : await supabase.from('attendees').insert(upsertFields).select('*').single()

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
    const event_id = url.searchParams.get('event_id')
    const event_code = url.searchParams.get('event_code')

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

    // Optional filter by event
    let query = supabase.from('attendees').select('*')
    if (event_id) {
      query = query.eq('event_id', event_id)
    } else if (event_code) {
      const slug = event_code.trim().toLowerCase()
      const found = await supabase.from('events').select('id').eq('slug', slug).maybeSingle()
      const evId = (found as any)?.data?.id as string | undefined
      if (evId) query = query.eq('event_id', evId)
      else return NextResponse.json({ ok: true, attendees: [] })
    }

    // Default: return last 50 for convenience
    const { data, error } = await query.order('created_at', { ascending: false }).limit(50)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, attendees: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch attendees'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
