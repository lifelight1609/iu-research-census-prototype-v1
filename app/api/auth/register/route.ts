import { NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await createUser({
      name: String(body.name ?? ''),
      email: String(body.email ?? ''),
      password: String(body.password ?? ''),
    })

    if (!result.created) {
      return NextResponse.json({ error: result.error ?? 'Unable to create account.' }, { status: 400 })
    }

    return NextResponse.json({ user: result.user }, { status: 201 })
  } catch (error) {
    console.error('Registration failed:', error)
    return NextResponse.json({ error: 'Unable to create account.' }, { status: 500 })
  }
}
