import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { sendEmail, appBaseUrl } from '../../../../lib/email'

export async function POST(req: NextRequest) {
  try {
    const { requesterId, partnerId } = (await req.json()) as { requesterId?: string; partnerId?: string }
    if (!requesterId || !partnerId) {
      return NextResponse.json({ ok: false, error: 'requesterId and partnerId are required' }, { status: 400 })
    }

    // Load both attendees
    const [reqRes, parRes] = await Promise.all([
      supabase.from('attendees').select('id, name, email').eq('id', requesterId).single(),
      supabase.from('attendees').select('id, name, email').eq('id', partnerId).single(),
    ])
    if (reqRes.error || !reqRes.data) return NextResponse.json({ ok: false, error: reqRes.error?.message || 'Requester not found' }, { status: 404 })
    if (parRes.error || !parRes.data) return NextResponse.json({ ok: false, error: parRes.error?.message || 'Partner not found' }, { status: 404 })

    const requester = reqRes.data as { id: string; name?: string | null; email?: string | null }
    const partner = parRes.data as { id: string; name?: string | null; email?: string | null }

    // Create intro as proposed
    const { data: intro, error } = await supabase
      .from('intros')
      .insert({ a_id: requester.id, b_id: partner.id, status: 'proposed' })
      .select('*')
      .single()
    if (error || !intro) return NextResponse.json({ ok: false, error: error?.message || 'Failed to create intro' }, { status: 400 })

    // If partner has email, try to send; otherwise just return ok (in-app flow)
    if (partner.email) {
      const base = appBaseUrl()
      const acceptUrl = `${base}/api/intros/respond?id=${encodeURIComponent(intro.id)}&action=accept`
      const declineUrl = `${base}/api/intros/respond?id=${encodeURIComponent(intro.id)}&action=decline`
      const html = `
        <p>${requester.name || 'Someone'} would like an introduction with you.</p>
        <p>
          <a href="${acceptUrl}">Accept intro</a> ·
          <a href="${declineUrl}">Decline</a>
        </p>
        <p>You can also view matches here: <a href="${base}/matches">${base}/matches}</a></p>
      `
      try {
        await sendEmail({ to: partner.email, subject: 'Intro request on EventLinq', html })
        return NextResponse.json({ ok: true, introId: intro.id })
      } catch (e: unknown) {
        console.error('Email send failed', e)
        return NextResponse.json({ ok: true, introId: intro.id, warning: 'Email send failed; in-app acceptance is available.' })
      }
    }
    return NextResponse.json({ ok: true, introId: intro.id, note: 'Partner has no email; using in-app acceptance.' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to request intro'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
