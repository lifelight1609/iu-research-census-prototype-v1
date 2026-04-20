import { getDb } from '@/lib/mongodb'
import { normalizeAffiliations, type AffiliationRecord } from '@/lib/researcher-schema'

export interface ResearcherRecord {
  id: number | string
  name: string
  title?: string
  department?: string
  email?: string
  status?: string
  researchArea?: string
  shortBio?: string
  detailedBio?: string
  url?: string
  h_index?: number
  i10_index?: number
  publications_count?: number
  citation_count?: number
  oa_author_id?: string
  oa_orcid?: string
  affiliations?: AffiliationRecord[]
  all_collaborators?: string
}


function normalizeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

function normalizeExternalId(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(Math.trunc(value))
  }
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function normalizeId(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeResearcher(raw: any): ResearcherRecord {
  const {
    id,
    name,
    title,
    department,
    email,
    status,
    researchArea,
    shortBio,
    detailedBio,
    url,
    h_index,
    i10_index,
    publications_count,
    citation_count,
    oa_author_id,
    oa_orcid,
    affiliations,
    all_collaborators,
  } = raw ?? {}

  return {
    id: normalizeId(id) ?? '',
    name: cleanString(name),
    title: cleanString(title),
    department: cleanString(department),
    email:
      cleanString(email) ||
      cleanString(raw['researcher email']) ||
      cleanString(raw['researcher_email']) ||
      cleanString(raw['Researcher Email']) ||
      undefined,
    status:
      cleanString(status) ||
      cleanString(raw['Status']) ||
      cleanString(raw.researcher_status) ||
      cleanString(raw['researcher status']) ||
      undefined,
    researchArea:
      cleanString(researchArea) ||
      cleanString(raw['research area']) ||
      cleanString(raw['Research Area']) ||
      cleanString(raw['research_area']) ||
      cleanString(raw['research-area']),
    shortBio:
      cleanString(shortBio) ||
      cleanString(raw['short bio']) ||
      cleanString(raw['Short Bio']) ||
      cleanString(raw['short_bio']) ||
      cleanString(raw['short-bio']),
    detailedBio:
      cleanString(detailedBio) ||
      cleanString(raw['long bio']) ||
      cleanString(raw['Long Bio']) ||
      cleanString(raw['long_bio']) ||
      cleanString(raw['long-bio']),
    url:
      cleanString(url) ||
      cleanString(raw['profile url']) ||
      cleanString(raw['Profile URL']) ||
      cleanString(raw['profile_url']) ||
      cleanString(raw['profile-url']),
    h_index:
      normalizeNumber(h_index) ??
      normalizeNumber(raw.hIndex) ??
      normalizeNumber(raw['h index']) ??
      normalizeNumber(raw['H Index']) ??
      undefined,
    i10_index:
      normalizeNumber(i10_index) ??
      normalizeNumber(raw.i10Index) ??
      normalizeNumber(raw['i10 index']) ??
      normalizeNumber(raw['I10 Index']) ??
      undefined,
    publications_count:
      normalizeNumber(publications_count) ??
      normalizeNumber(raw.publications) ??
      normalizeNumber(raw.oa_publications) ??
      normalizeNumber(raw.s2_publications) ??
      normalizeNumber(raw['publications count']) ??
      undefined,
    citation_count:
      normalizeNumber(citation_count) ??
      normalizeNumber(raw.citations) ??
      normalizeNumber(raw.oa_citations) ??
      normalizeNumber(raw.s2_citations) ??
      normalizeNumber(raw['citation count']) ??
      undefined,
    oa_author_id: normalizeExternalId(oa_author_id) || normalizeExternalId(raw.openalex_id) || undefined,
    oa_orcid:
      normalizeExternalId(oa_orcid) ||
      normalizeExternalId(raw.orcid) ||
      normalizeExternalId(raw.orcid_url) ||
      normalizeExternalId(raw['orcid url']) ||
      undefined,
    affiliations: normalizeAffiliations(affiliations || raw.affiliations_json || raw['affiliations json']),
    all_collaborators: cleanString(all_collaborators) || undefined,
  }
}

function buildResearcherUpdatePayload(input: Partial<ResearcherRecord>) {
  const payload: Record<string, unknown> = {}

  if (input.name !== undefined) payload.name = cleanString(input.name)
  if (input.title !== undefined) payload.title = cleanString(input.title)
  if (input.department !== undefined) payload.department = cleanString(input.department)
  if (input.email !== undefined) {
    const email = cleanString(input.email)
    payload.email = email
    payload['researcher_email'] = email
  }
  if (input.status !== undefined) {
    const status = cleanString(input.status)
    payload.status = status
    payload.researcher_status = status
  }
  if (input.researchArea !== undefined) {
    const researchArea = cleanString(input.researchArea)
    payload.researchArea = researchArea
    payload['research area'] = researchArea
    payload.research_area = researchArea
  }
  if (input.shortBio !== undefined) {
    const shortBio = cleanString(input.shortBio)
    payload.shortBio = shortBio
    payload['short bio'] = shortBio
    payload.short_bio = shortBio
  }
  if (input.detailedBio !== undefined) {
    const detailedBio = cleanString(input.detailedBio)
    payload.detailedBio = detailedBio
    payload['long bio'] = detailedBio
    payload.long_bio = detailedBio
  }
  if (input.url !== undefined) {
    const url = cleanString(input.url)
    payload.url = url
    payload['profile url'] = url
    payload.profile_url = url
  }
  if (input.h_index !== undefined) payload.h_index = normalizeNumber(input.h_index)
  if (input.i10_index !== undefined) payload.i10_index = normalizeNumber(input.i10_index)
  if (input.publications_count !== undefined) payload.publications = normalizeNumber(input.publications_count)
  if (input.citation_count !== undefined) payload.citations = normalizeNumber(input.citation_count)
  if (input.oa_author_id !== undefined) {
    const oaAuthorId = normalizeExternalId(input.oa_author_id)
    payload.oa_author_id = oaAuthorId
    payload.openalex_id = oaAuthorId
  }
  if (input.oa_orcid !== undefined) {
    const oaOrcid = normalizeExternalId(input.oa_orcid)
    payload.oa_orcid = oaOrcid
    payload.orcid = oaOrcid
  }
  if (input.affiliations !== undefined) {
    const normalized = normalizeAffiliations(input.affiliations)
    payload.affiliations = JSON.stringify(normalized)
  }
  if (input.all_collaborators !== undefined) payload.all_collaborators = cleanString(input.all_collaborators)

  return payload
}

export async function getResearchers(): Promise<ResearcherRecord[]> {
  const db = await getDb()
  const docs = await db.collection('researchers').find({}).toArray()
  return docs.map(normalizeResearcher)
}

export async function getResearcherById(id: string): Promise<ResearcherRecord | null> {
  const db = await getDb()
  const numericId = Number(id)
  const query = Number.isFinite(numericId)
    ? { $or: [{ id: numericId }, { id: id }] }
    : { id }
  const researcher = await db.collection('researchers').findOne(query)
  return researcher ? normalizeResearcher(researcher) : null
}

export async function updateResearcherById(
  id: string,
  input: Partial<ResearcherRecord>
): Promise<ResearcherRecord | null> {
  const db = await getDb()
  const numericId = Number(id)
  const query = Number.isFinite(numericId)
    ? { $or: [{ id: numericId }, { id: id }] }
    : { id }

  const updatePayload = buildResearcherUpdatePayload(input)
  if (Object.keys(updatePayload).length === 0) {
    const existing = await db.collection('researchers').findOne(query)
    return existing ? normalizeResearcher(existing) : null
  }

  await db.collection('researchers').updateOne(query, {
    $set: {
      ...updatePayload,
      updatedAt: new Date().toISOString(),
    },
  })

  const updated = await db.collection('researchers').findOne(query)
  return updated ? normalizeResearcher(updated) : null
}
