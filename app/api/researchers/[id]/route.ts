import { NextResponse } from 'next/server'

import { getResearcherById, updateResearcherById } from '@/lib/researchers'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }> | { id: string }
}

function normalizeEmail(email: unknown) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

function normalizeRole(role: unknown) {
  return typeof role === 'string' ? role.trim().toLowerCase() : ''
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const researcher = await getResearcherById(id)
    if (!researcher) {
      return NextResponse.json({ error: 'Researcher not found.' }, { status: 404 })
    }

    const actorEmail = normalizeEmail(body.actorEmail)
    const actorRole = normalizeRole(body.actorRole)
    const canEdit = actorRole === 'admin' || (actorEmail && researcher.email && actorEmail === researcher.email.toLowerCase())

    if (!canEdit) {
      return NextResponse.json({ error: 'You do not have permission to edit this profile.' }, { status: 403 })
    }

    const updated = await updateResearcherById(id, {
      name: body.name,
      title: body.title,
      department: body.department,
      email: body.email,
      status: body.status,
      researchArea: body.researchArea,
      shortBio: body.shortBio,
      detailedBio: body.detailedBio,
      url: body.url,
      oa_author_id: body.oa_author_id,
      oa_orcid: body.oa_orcid,
      h_index: body.h_index,
      i10_index: body.i10_index,
      publications_count: body.publications_count,
      citation_count: body.citation_count,
      affiliations: body.affiliations,
      all_collaborators: body.all_collaborators,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Researcher not found.' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update researcher:', error)
    return NextResponse.json({ error: 'Unable to update researcher.' }, { status: 500 })
  }
}

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const researcher = await getResearcherById(id)

    if (!researcher) {
      return NextResponse.json({ error: 'Researcher not found.' }, { status: 404 })
    }

    return NextResponse.json(researcher)
  } catch (error) {
    console.error('Failed to fetch researcher:', error)
    return NextResponse.json({ error: 'Unable to fetch researcher.' }, { status: 500 })
  }
}
