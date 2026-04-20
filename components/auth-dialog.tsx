'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, LogOut, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type AuthUser = {
  name: string
  email: string
  role?: string
  researcher_id?: string | number | null
}

type Mode = 'login' | 'register' | 'forgot'

type Props = {
  currentUser: AuthUser | null
  onAuthenticated: (user: AuthUser) => void
  onLogout: () => void
}

const emptyForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export function AuthDialog({ currentUser, onAuthenticated, onLogout }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!open) {
      setError('')
      setLoading(false)
      setMode('login')
      setForm(emptyForm)
      setShowPassword(false)
    }
  }, [open])

  const updateField = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint =
        mode === 'register'
          ? '/api/auth/register'
          : mode === 'forgot'
            ? '/api/auth/forgot-password'
            : '/api/auth/login'

      if (mode === 'register' && form.password !== form.confirmPassword) {
        throw new Error('Passwords do not match.')
      }

      if (mode === 'forgot' && form.password !== form.confirmPassword) {
        throw new Error('New passwords do not match.')
      }

      const payload =
        mode === 'register'
          ? {
              name: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
            }
          : mode === 'forgot'
            ? {
                email: form.email.trim(),
                newPassword: form.password,
              }
            : {
                email: form.email.trim(),
                password: form.password,
              }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.')
      }

      if (mode === 'forgot') {
        toast.success('Password updated', {
          description: data.message ?? 'Your password has been updated.',
        })
        setMode('login')
        setForm(emptyForm)
        setShowPassword(false)
        return
      }

      onAuthenticated(data.user)
      toast.success(mode === 'register' ? 'Account created' : 'Logged in', {
        description:
          mode === 'register'
            ? `Welcome, ${data.user.name}.`
            : `Welcome back, ${data.user.name}.`,
      })
      setOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to continue.'
      setError(message)
      toast.error('Authentication failed', { description: message })
    } finally {
      setLoading(false)
    }
  }

  const dialogTitle =
    mode === 'register'
      ? 'Create your account'
      : mode === 'forgot'
        ? 'Reset your password'
        : 'Sign in to IU Researcher Portal'

  const dialogDescription =
    mode === 'register'
      ? 'Create a profile with your name, email, and a secure password.'
      : mode === 'forgot'
        ? 'Enter your email and new password. No reset email will be sent.'
        : 'Use your email and password to continue.'

  return (
    <div className="flex items-center gap-3">
      {currentUser ? (
        <>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Login
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={submit}>
            {mode === 'register' && (
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@iu.edu"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {mode !== 'forgot' && (
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'forgot' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={form.password}
                      onChange={(event) => updateField('password', event.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={form.confirmPassword}
                    onChange={(event) => updateField('confirmPassword', event.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : mode === 'register' ? (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create account
                </>
              ) : mode === 'forgot' ? (
                'Update password'
              ) : (
                'Login'
              )}
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              {mode !== 'register' ? (
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setMode('register')}
                >
                  Create Account
                </button>
              ) : (
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setMode('login')}
                >
                  Back to login
                </button>
              )}

              {mode !== 'forgot' ? (
                <button
                  type="button"
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => setMode('forgot')}
                >
                  Forgot password?
                </button>
              ) : (
                <button
                  type="button"
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => setMode('login')}
                >
                  Back to login
                </button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
