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

function normalizeTags(arr: string[] | null | undefined): string[] {
  return (arr || []).map(s => (s || '').toLowerCase().trim()).filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a)
  const B = new Set(b)
  const inter = [...A].filter(x => B.has(x)).length
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : inter / union
}

function rationale(from: Attendee, to: Attendee): string {
  const fromInterests = normalizeTags(from.interests)
  const toInterests = normalizeTags(to.interests)
  const fromGoals = normalizeTags(from.goals)
  const toGoals = normalizeTags(to.goals)
  const shared = jaccard(fromInterests, toInterests)
  const goals = jaccard(fromGoals, toGoals)
  const avail = availabilityOverlap(from.availability, to.availability) > 0 ? 'Overlapping availability' : ''
  const comp = complementaryRoles(from.role, to.role)
  const strongOverlap = interestsOverlapCount(fromInterests, toInterests) >= 2
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
  const MIN_SCORE = Number.parseFloat(process.env.NEXT_PUBLIC_MIN_MATCH_SCORE || '0.15')
  const scored = othersRes.data.map(o => {
    const meInterests = normalizeTags(me.interests)
    const oInterests = normalizeTags(o.interests)
    const meGoals = normalizeTags(me.goals)
    const oGoals = normalizeTags(o.goals)
    const tagSim = jaccard(meInterests, oInterests)
    const goalSim = jaccard(meGoals, oGoals)
    const availSim = availabilityOverlap(me.availability, o.availability)
    const hasSignal = tagSim > 0 || goalSim > 0
    const compBonus = hasSignal && complementaryRoles(me.role, o.role) ? 0.05 : 0
    const overlapBonus = hasSignal && interestsOverlapCount(meInterests, oInterests) >= 2 ? 0.05 : 0
    const sameCompanyPenalty = me.company && o.company && me.company.toLowerCase().trim() === o.company.toLowerCase().trim() ? -0.05 : 0
    // Weights: interests 0.6, goals 0.3, availability 0.1; plus small comp bonus
    let score = tagSim * 0.6 + goalSim * 0.3 + availSim * 0.1 + compBonus + overlapBonus + sameCompanyPenalty
    if (score > 1) score = 1
    if (score < 0) score = 0
    return { partnerId: o.id, score, rationale: rationale(me, o) }
  })
  // Filter out clearly unrelated pairs
  const filtered = scored.filter((s, i) => {
    const partner = othersRes.data[i]
    const tagSim = jaccard(normalizeTags(me.interests), normalizeTags(partner.interests))
    const goalSim = jaccard(normalizeTags(me.goals), normalizeTags(partner.goals))
    // Require some signal in interests or goals AND pass min score
    return (tagSim > 0 || goalSim > 0) && s.score >= MIN_SCORE
  })
  filtered.sort((a, b) => b.score - a.score)
  return filtered.slice(0, limit)
}
