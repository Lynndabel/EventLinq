import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { sendEmail } from '../../../../lib/email'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const action = url.searchParams.get('action')
    if (!id || !action || !['accept','decline'].includes(action)) {
      return NextResponse.json({ ok: false, error: 'Invalid parameters' }, { status: 400 })
    }

    const { data: intro, error } = await supabase.from('intros').select('*').eq('id', id).single()
    if (error || !intro) return NextResponse.json({ ok: false, error: error?.message || 'Intro not found' }, { status: 404 })

    const status = action === 'accept' ? 'accepted' : 'declined'
    const { error: upErr } = await supabase.from('intros').update({ status }).eq('id', id)
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 })

    // Load attendee emails
    const [aRes, bRes] = await Promise.all([
      supabase.from('attendees').select('id, name, email').eq('id', intro.a_id).single(),
      supabase.from('attendees').select('id, name, email').eq('id', intro.b_id).single(),
    ])
    const a = aRes.data as { id: string; name?: string | null; email?: string | null } | null
    const b = bRes.data as { id: string; name?: string | null; email?: string | null } | null

    if (status === 'accepted' && a?.email && b?.email) {
      const subject = 'Intro confirmed — you are connected'
      const bodyA = `<p>Intro confirmed with ${b?.name || 'your match'}.</p><p>You can reach them at <a href="mailto:${b.email}">${b.email}</a>.</p>`
      const bodyB = `<p>Intro confirmed with ${a?.name || 'your match'}.</p><p>You can reach them at <a href="mailto:${a.email}">${a.email}</a>.</p>`
      await Promise.all([
        sendEmail({ to: a.email, subject, html: bodyA }),
        sendEmail({ to: b.email, subject, html: bodyB }),
      ])
    } else if (status === 'declined' && a?.email) {
      await sendEmail({ to: a.email, subject: 'Intro declined', html: `<p>Your intro request was declined.</p>` })
    }

    return NextResponse.redirect(new URL('/matches', req.url))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to respond to intro'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
