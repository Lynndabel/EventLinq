import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const attendeeId = url.searchParams.get('attendeeId')
    if (!attendeeId) return NextResponse.json({ ok: false, error: 'attendeeId is required' }, { status: 400 })

    // Fetch intros where the user is either side
    const { data, error } = await supabase
      .from('intros')
      .select('id, status, a_id, b_id')
      .or(`a_id.eq.${attendeeId},b_id.eq.${attendeeId}`)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    // Collect partner IDs
    const partnerIds = new Set<string>()
    for (const it of data || []) {
      const partnerId = it.a_id === attendeeId ? it.b_id : it.a_id
      if (partnerId) partnerIds.add(partnerId)
    }

    let partners: Record<string, any> = {}
    if (partnerIds.size) {
      const { data: people, error: perr } = await supabase
        .from('attendees')
        .select('id, name, role, company, telegram, x_handle')
        .in('id', Array.from(partnerIds))
      if (!perr && people) {
        people.forEach(p => { partners[p.id] = p })
      }
    }

    const intros = (data || []).map(it => ({
      id: it.id,
      status: it.status,
      partner: partners[it.a_id === attendeeId ? it.b_id : it.a_id] || { id: it.a_id === attendeeId ? it.b_id : it.a_id },
    }))

    return NextResponse.json({ ok: true, intros })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to load intros'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
