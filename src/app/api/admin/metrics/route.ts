import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

// Metrics endpoint for admin dashboard
export async function GET() {
  try {
    const signups = await supabase.from('attendees').select('id', { count: 'exact', head: true })
    const matches = await supabase.from('matches').select('id', { count: 'exact', head: true })
    const introsAll = await supabase.from('intros').select('status', { count: 'exact', head: true })
    const introsAccepted = await supabase
      .from('intros')
      .select('status', { count: 'exact', head: true })
      .eq('status', 'accepted')
    const meetings = await supabase
      .from('intros')
      .select('status', { count: 'exact', head: true })
      .eq('status', 'met')

    const totalIntros = introsAll.count || 0
    const accepted = introsAccepted.count || 0
    const data = {
      signups: signups.count || 0,
      matchesProposed: matches.count || 0,
      introAcceptanceRate: totalIntros > 0 ? accepted / totalIntros : 0,
      meetingsConfirmed: meetings.count || 0,
    }
    return NextResponse.json({ ok: true, data })
  } catch {
    // Fail-soft for dashboard
    return NextResponse.json(
      { ok: true, data: { signups: 0, matchesProposed: 0, introAcceptanceRate: 0, meetingsConfirmed: 0 } },
      { status: 200 }
    )
  }
}
