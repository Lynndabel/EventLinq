import type { PostgrestSingleResponse } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export type Attendee = {
  id: string
  name: string | null
  role: string | null
  company: string | null
  bio: string | null
  interests: string[] | null
  goals: string[] | null
  event_id?: string | null
  availability?: string | null
}

export type Suggestion = { partnerId: string; score: number; rationale: string }

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a)
  const B = new Set(b)
  const inter = [...A].filter(x => B.has(x)).length
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : inter / union
}

function rationale(from: Attendee, to: Attendee): string {
  const shared = jaccard(from.interests || [], to.interests || [])
  const goals = jaccard(from.goals || [], to.goals || [])
  const avail = availabilityOverlap(from.availability, to.availability) > 0 ? 'Overlapping availability' : ''
  const comp = complementaryRoles(from.role, to.role)
  const strongOverlap = interestsOverlapCount(from.interests || [], to.interests || []) >= 2
  const parts: string[] = []
  if (shared > 0) parts.push(`Shared interests (${Math.round(shared * 100)}%)`)
  if (strongOverlap) parts.push('Strong interest overlap')
  if (goals > 0) parts.push(`Similar goals (${Math.round(goals * 100)}%)`)
  if (avail) parts.push(avail)
  if (comp) parts.push('Complementary roles')
  if (parts.length === 0) parts.push('Potentially relevant attendee')
  return parts.join(' + ')
}

function complementaryRoles(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  const s = (x: string) => x.toLowerCase()
  const A = s(a), B = s(b)
  const founder = /founder|ceo|cto|co-?founder/.test(A)
  const builder = /engineer|developer|data|scientist|ml|ai/.test(B)
  const investor = /invest(or|ment)/.test(B)
  return (founder && (builder || investor)) || (builder && /product|founder|cto/.test(B))
}

function availabilityOverlap(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0
  const norm = (x: string) => x.toLowerCase().split(/[,&]|\band\b/).map(s => s.trim()).filter(Boolean)
  const A = new Set(norm(a))
  const B = new Set(norm(b))
  for (const x of A) if (B.has(x)) return 1
  return 0
}

function interestsOverlapCount(a: string[], b: string[]): number {
  const A = new Set((a || []).map(s => s.toLowerCase().trim()).filter(Boolean))
  const B = new Set((b || []).map(s => s.toLowerCase().trim()).filter(Boolean))
  let c = 0
  for (const x of A) if (B.has(x)) c++
  return c
}

export async function getSuggestions(attendeeId: string, limit = 3): Promise<Suggestion[]> {
  const meRes: PostgrestSingleResponse<Attendee> = await supabase
    .from('attendees')
    .select('id, name, role, company, bio, interests, goals, event_id, availability')
    .eq('id', attendeeId)
    .single()
  if (meRes.error || !meRes.data) return []
  const me = meRes.data

  let query = supabase
    .from('attendees')
    .select('id, name, role, company, bio, interests, goals, event_id, availability')
    .neq('id', attendeeId)
    .limit(200)

  if (me.event_id) {
    query = query.eq('event_id', me.event_id)
  }

  const othersRes = await query

  if (othersRes.error || !othersRes.data) return []
  const scored = othersRes.data.map(o => {
    const tagSim = jaccard(me.interests || [], o.interests || [])
    const goalSim = jaccard(me.goals || [], o.goals || [])
    const availSim = availabilityOverlap(me.availability, o.availability)
    const compBonus = complementaryRoles(me.role, o.role) ? 0.05 : 0
    const overlapBonus = interestsOverlapCount(me.interests || [], o.interests || []) >= 2 ? 0.05 : 0
    const sameCompanyPenalty = me.company && o.company && me.company.toLowerCase().trim() === o.company.toLowerCase().trim() ? -0.05 : 0
    // Weights: interests 0.6, goals 0.3, availability 0.1; plus small comp bonus
    let score = tagSim * 0.6 + goalSim * 0.3 + availSim * 0.1 + compBonus + overlapBonus + sameCompanyPenalty
    if (score > 1) score = 1
    if (score < 0) score = 0
    return { partnerId: o.id, score, rationale: rationale(me, o) }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}
