import { NextResponse } from 'next/server'

import { getResearchers, normalizeResearcher } from '@/lib/researchers'

export const runtime = 'nodejs'

export async function GET() {
  const normalized = (await getResearchers()).map(normalizeResearcher)

  const departments = [...new Set(normalized.map((r: any) => r.department?.trim()).filter(Boolean))].sort()

  const areasSet = new Set<string>()
  normalized.forEach((r: any) => {
    if (r.researchArea) {
      r.researchArea.split(';').forEach((area: string) => {
        const trimmed = area.trim()
        if (trimmed) areasSet.add(trimmed)
      })
    }
  })
  const areas = [...areasSet].sort()

  return NextResponse.json({ departments, areas })
}
