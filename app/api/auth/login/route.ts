import { NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await authenticateUser({
      email: String(body.email ?? ''),
      password: String(body.password ?? ''),
    })

    if (!result.user) {
      return NextResponse.json({ error: result.error ?? 'Invalid email or password.' }, { status: 401 })
    }

    return NextResponse.json({ user: result.user })
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json({ error: 'Unable to log in.' }, { status: 500 })
  }
}
