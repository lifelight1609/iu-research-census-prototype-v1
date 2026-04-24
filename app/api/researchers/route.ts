import { NextResponse } from 'next/server'

import { getResearchers, normalizeResearcher } from '@/lib/researchers'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim().toLowerCase() || ''
  const department = searchParams.get('department')?.trim().toLowerCase() || ''
  const area = searchParams.get('area')?.trim().toLowerCase() || ''

  const normalized = (await getResearchers()).map(normalizeResearcher)
  let results = normalized

  if (query) {
    results = results.filter((r: any) => {
      const text = `${r.name ?? ''} ${r.department ?? ''} ${r.researchArea ?? ''} ${r.shortBio ?? ''} ${r.detailedBio ?? ''} ${(r.affiliations ?? []).map((a: any) => a.display_name).join(' ')} ${r.oa_orcid ?? ''}`.toLowerCase()
      return text.includes(query)
    })
  }

  if (department) {
    results = results.filter((r: any) => r.department?.trim().toLowerCase() === department)
  }

  if (area) {
    results = results.filter((r: any) =>
      r.researchArea
        ?.split(';')
        .map((item: string) => item.trim().toLowerCase())
        .includes(area)
    )
  }

  return NextResponse.json(results)
}
