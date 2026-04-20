export interface AffiliationRecord {
  display_name: string
  years: number[]
}

function normalizeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseYearList(value: unknown): number[] {
  const rawYears = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        })()
      : []

  const years = rawYears
    .map((year) => normalizeNumber(year))
    .filter((year): year is number => typeof year === 'number' && Number.isFinite(year))
    .map((year) => Math.trunc(year))

  return [...new Set(years)].sort((a, b) => b - a)
}

export function normalizeAffiliations(raw: unknown): AffiliationRecord[] {
  const source = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        })()
      : []

  return source
    .map((entry: any) => {
      const display_name = cleanString(
        entry?.display_name ?? entry?.displayName ?? entry?.name ?? entry?.institution ?? entry?.affiliation
      )
      const years = parseYearList(entry?.years ?? entry?.year ?? entry?.yearsList)
      return display_name ? { display_name, years } : null
    })
    .filter((entry): entry is AffiliationRecord => Boolean(entry))
    .sort((a, b) => {
      const latestA = a.years[0] ?? -Infinity
      const latestB = b.years[0] ?? -Infinity
      if (latestA !== latestB) return latestB - latestA
      return a.display_name.localeCompare(b.display_name)
    })
}

export function formatAffiliationYears(years: number[]) {
  return [...new Set(years)]
    .sort((a, b) => b - a)
    .join(', ')
}
