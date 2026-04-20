import { NextResponse } from 'next/server'
import { updateUserPassword } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email ?? '').trim()
    const newPassword = String(body.newPassword ?? '')

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    if (!newPassword) {
      return NextResponse.json({ error: 'New password is required.' }, { status: 400 })
    }

    const result = await updateUserPassword({
      email,
      newPassword,
    })

    if (!result.updated) {
      return NextResponse.json({ error: result.error ?? 'Unable to update password.' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Password updated successfully. You can now log in with your new password.' })
  } catch (error) {
    console.error('Forgot-password request failed:', error)
    return NextResponse.json({ error: 'Unable to process password reset.' }, { status: 500 })
  }
}
