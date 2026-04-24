import { getDb } from '@/lib/mongodb'

export interface PublicationRecord {
  faculty_name: string
  faculty_title?: string
  faculty_summary?: string
  paper_title: string
  link?: string | null
  year?: number | null
  citations?: number | null
  source?: string
  collaborators?: string | null
  researcher_id?: number | string | null
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePublication(raw: any): PublicationRecord {
  const faculty_name = cleanString(raw.faculty_name) || cleanString(raw.name)
  const faculty_title = cleanString(raw.faculty_title) || cleanString(raw.title)
  const faculty_summary = cleanString(raw.faculty_summary) || cleanString(raw.summary)
  const paper_title = cleanString(raw.paper_title)

  return {
    faculty_name,
    faculty_title,
    faculty_summary,
    paper_title,
    link: cleanString(raw.link) || null,
    year: typeof raw.year === 'number' ? raw.year : raw.year ? Number(raw.year) : null,
    citations: typeof raw.citations === 'number' ? raw.citations : raw.citations ? Number(raw.citations) : null,
    source: cleanString(raw.source) || undefined,
    collaborators: cleanString(raw.collaborators) || null,
    researcher_id: raw.researcher_id ?? null,
  }
}

function researcherIdQuery(researcherId: string | number) {
  if (typeof researcherId === 'number') {
    return { $or: [{ researcher_id: researcherId }, { researcher_id: String(researcherId) }] }
  }

  const trimmed = String(researcherId).trim()
  const numericId = Number(trimmed)

  if (Number.isFinite(numericId)) {
    return {
      $or: [
        { researcher_id: numericId },
        { researcher_id: trimmed },
      ],
    }
  }

  return { researcher_id: trimmed }
}

async function getAllPublicationDocs() {
  const db = await getDb()
  return db
    .collection('publications')
    .find({
      $or: [
        { paper_title: { $exists: true, $ne: null } },
        { name: { $exists: true, $ne: null } },
        { faculty_name: { $exists: true, $ne: null } },
      ],
    })
    .toArray()
}

export async function getPublications(): Promise<PublicationRecord[]> {
  const docs = await getAllPublicationDocs()
  return docs.map(normalizePublication)
}

export async function findPublicationsByResearcherId(researcherId: string | number): Promise<PublicationRecord[]> {
  const db = await getDb()
  const docs = await db.collection('publications').find(researcherIdQuery(researcherId)).toArray()
  return docs
    .map(normalizePublication)
    .sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0) || (b.year ?? 0) - (a.year ?? 0))
}

export async function findPublicationsByName(name: string): Promise<PublicationRecord[]> {
  if (!name) {
    return []
  }

  const normalizedTarget = normalizeName(name)
  if (!normalizedTarget) {
    return []
  }

  const docs = await getAllPublicationDocs()

  return docs
    .map(normalizePublication)
    .filter((publication) => {
      const normalizedFaculty = normalizeName(publication.faculty_name || '')
      return (
        normalizedFaculty === normalizedTarget ||
        normalizedFaculty.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedFaculty)
      )
    })
    .sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0) || (b.year ?? 0) - (a.year ?? 0))
}
