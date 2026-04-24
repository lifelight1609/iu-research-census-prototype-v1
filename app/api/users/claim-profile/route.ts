import { NextResponse } from 'next/server'

import { getResearcherById } from '@/lib/researchers'
import { updateUserResearcherId } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email ?? '').trim().toLowerCase()
    const researcherIdRaw = body.researcherId
    const researcherId =
      typeof researcherIdRaw === 'number' || typeof researcherIdRaw === 'string'
        ? researcherIdRaw
        : null

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    if (researcherId === null) {
      return NextResponse.json({ error: 'Researcher id is required.' }, { status: 400 })
    }

    const researcher = await getResearcherById(String(researcherId))
    if (!researcher) {
      return NextResponse.json({ error: 'Researcher not found.' }, { status: 404 })
    }

    if (!researcher.email || researcher.email.trim().toLowerCase() !== email) {
      return NextResponse.json({ error: 'You can only claim your own profile.' }, { status: 403 })
    }

    const result = await updateUserResearcherId({ email, researcherId })

    if (!result.updated) {
      return NextResponse.json({ error: result.error ?? 'Unable to claim profile.' }, { status: 400 })
    }

    return NextResponse.json({ user: result.user })
  } catch (error) {
    console.error('Claim profile failed:', error)
    return NextResponse.json({ error: 'Unable to claim profile.' }, { status: 500 })
  }
}
