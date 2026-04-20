import { NextResponse } from 'next/server'

import { getResearchers } from '@/lib/researchers'

export const runtime = 'nodejs'

const synonyms: Record<string, string[]> = {
  ai: ['artificial intelligence', 'machine learning', 'deep learning'],
  cancer: ['oncology', 'tumor', 'medical imaging'],
  social: ['media', 'communication', 'networks'],
  data: ['analytics', 'big data', 'statistics'],
  health: ['medical', 'clinical', 'biomedical'],
}

function expandQuery(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/)
  const expanded = [...words]

  words.forEach((word) => {
    if (synonyms[word]) {
      expanded.push(...synonyms[word])
    }
  })

  return expanded
}

function scoreResearcher(r: any, terms: string[]) {
  let score = 0

  const text = `${r.name} ${r.department} ${r.researchArea} ${r.shortBio} ${r.detailedBio} ${(r.affiliations ?? []).map((a: any) => a.display_name).join(' ')} ${r.oa_orcid ?? ''} ${r.oa_author_id ?? ''}`.toLowerCase()

  terms.forEach((term) => {
    if (text.includes(term)) {
      score += 5
    }

    if (r.researchArea?.toLowerCase().includes(term)) {
      score += 10
    }

    if (r.name?.toLowerCase().includes(term)) {
      score += 8
    }
  })

  return score
}

export async function POST(req: Request) {
  const { query } = await req.json()

  if (!query) {
    return NextResponse.json([])
  }

  const researchers = await getResearchers()
  const expandedTerms = expandQuery(query)

  const scored = researchers.map((r: any) => ({
    ...r,
    score: scoreResearcher(r, expandedTerms),
  }))

  const results = scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)

  return NextResponse.json(results)
}
