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
  const compRole = complementaryRoles(from.role, to.role) ? 0.2 : 0
  const parts: string[] = []
  if (shared > 0) parts.push(`Shared interests (${Math.round(shared * 100)}%)`)
  if (compRole > 0) parts.push('Complementary roles')
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

export async function getSuggestions(attendeeId: string, limit = 3): Promise<Suggestion[]> {
  const meRes: PostgrestSingleResponse<Attendee> = await supabase
    .from('attendees')
    .select('id, name, role, company, bio, interests, goals')
    .eq('id', attendeeId)
    .single()
  if (meRes.error || !meRes.data) return []
  const me = meRes.data

  const othersRes = await supabase
    .from('attendees')
    .select('id, name, role, company, bio, interests, goals')
    .neq('id', attendeeId)
    .limit(200)

  if (othersRes.error || !othersRes.data) return []
  const scored = othersRes.data.map(o => {
    const tagSim = jaccard(me.interests || [], o.interests || [])
    const goalSim = jaccard(me.goals || [], o.goals || [])
    const comp = complementaryRoles(me.role, o.role) ? 0.2 : 0
    const score = tagSim * 0.6 + goalSim * 0.2 + comp
    return { partnerId: o.id, score, rationale: rationale(me, o) }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}
