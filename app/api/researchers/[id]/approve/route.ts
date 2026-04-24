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

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const researcher = await getResearcherById(id)
    if (!researcher) {
      return NextResponse.json({ error: 'Researcher not found.' }, { status: 404 })
    }

    const actorEmail = normalizeEmail(body.actorEmail)
    const actorRole = normalizeRole(body.actorRole)
    const canApprove = actorRole === 'admin' || (actorEmail && researcher.email && actorEmail === researcher.email.toLowerCase())

    if (!canApprove) {
      return NextResponse.json({ error: 'You do not have permission to approve this profile.' }, { status: 403 })
    }

    const updated = await updateResearcherById(id, { status: 'Approved' })
    if (!updated) {
      return NextResponse.json({ error: 'Researcher not found.' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Approve profile failed:', error)
    return NextResponse.json({ error: 'Unable to approve profile.' }, { status: 500 })
  }
}
