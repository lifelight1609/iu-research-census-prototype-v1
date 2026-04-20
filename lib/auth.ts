import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'

import { getDb } from '@/lib/mongodb'

export type PublicUser = {
  name: string
  email: string
  role?: string
  researcher_id?: string | number | null
}

type StoredUser = PublicUser & {
  passwordHash: string
  salt: string
  createdAt: string
  updatedAt?: string
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function normalizeName(name: string) {
  return name.trim()
}

function sanitizeResearcherId(value: unknown): string | number | null | undefined {
  if (value === null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim()
    const numeric = Number(trimmed)
    return Number.isFinite(numeric) && String(numeric) === trimmed ? numeric : trimmed
  }
  return undefined
}

function sanitizeUser(user: StoredUser): PublicUser {
  const sanitized: PublicUser = {
    name: user.name,
    email: user.email,
  }

  if (user.role) sanitized.role = user.role
  const researcherId = sanitizeResearcherId(user.researcher_id)
  if (researcherId !== undefined) sanitized.researcher_id = researcherId

  return sanitized
}

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const derived = scryptSync(password, salt, 64) as Buffer
  return {
    salt,
    passwordHash: derived.toString('hex'),
  }
}

export function verifyPassword(password: string, salt: string, passwordHash: string) {
  const derived = scryptSync(password, salt, 64) as Buffer
  const stored = Buffer.from(passwordHash, 'hex')

  if (stored.length !== derived.length) {
    return false
  }

  return timingSafeEqual(stored, derived)
}

async function getUsersCollection() {
  const db = await getDb()
  return db.collection<StoredUser>('users')
}

export async function readUsers(): Promise<StoredUser[]> {
  const users = await getUsersCollection()
  return users.find({}).toArray()
}

export async function createUser(input: {
  name: string
  email: string
  password: string
}): Promise<{ user: PublicUser; created: boolean; error?: string }> {
  const name = normalizeName(input.name)
  const email = normalizeEmail(input.email)
  const password = input.password

  if (!name || !email || !password) {
    return { user: { name: '', email: '' }, created: false, error: 'Missing required fields.' }
  }

  const users = await getUsersCollection()
  const exists = await users.findOne({ email })
  if (exists) {
    return { user: { name: '', email: '' }, created: false, error: 'An account with that email already exists.' }
  }

  const { salt, passwordHash } = hashPassword(password)
  const storedUser: StoredUser = {
    name,
    email,
    role: 'user',
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  }

  await users.insertOne(storedUser)

  return { user: sanitizeUser(storedUser), created: true }
}

export async function authenticateUser(input: {
  email: string
  password: string
}): Promise<{ user: PublicUser | null; error?: string }> {
  const email = normalizeEmail(input.email)
  const password = input.password

  if (!email || !password) {
    return { user: null, error: 'Email and password are required.' }
  }

  const users = await getUsersCollection()
  const user = await users.findOne({ email })

  if (!user) {
    return { user: null, error: 'Invalid email or password.' }
  }

  const isValid = verifyPassword(password, user.salt, user.passwordHash)
  if (!isValid) {
    return { user: null, error: 'Invalid email or password.' }
  }

  return { user: sanitizeUser(user) }
}

export async function updateUserPassword(input: {
  email: string
  newPassword: string
}): Promise<{ updated: boolean; error?: string }> {
  const email = normalizeEmail(input.email)
  const newPassword = input.newPassword

  if (!email || !newPassword) {
    return { updated: false, error: 'Email and new password are required.' }
  }

  const users = await getUsersCollection()
  const user = await users.findOne({ email })

  if (!user) {
    return { updated: false, error: 'No account found for that email.' }
  }

  const { salt, passwordHash } = hashPassword(newPassword)
  await users.updateOne(
    { email },
    {
      $set: {
        salt,
        passwordHash,
        updatedAt: new Date().toISOString(),
      },
    }
  )

  return { updated: true }
}

export async function updateUserResearcherId(input: {
  email: string
  researcherId: string | number | null
}): Promise<{ updated: boolean; error?: string; user?: PublicUser }> {
  const email = normalizeEmail(input.email)
  if (!email) {
    return { updated: false, error: 'Email is required.' }
  }

  const users = await getUsersCollection()
  const user = await users.findOne({ email })

  if (!user) {
    return { updated: false, error: 'No account found for that email.' }
  }

  await users.updateOne(
    { email },
    {
      $set: {
        researcher_id: input.researcherId,
        updatedAt: new Date().toISOString(),
      },
    }
  )

  const updated = await users.findOne({ email })
  return { updated: true, user: updated ? sanitizeUser(updated) : sanitizeUser(user) }
}

export function gravatarFallback(email: string) {
  return createHash('md5').update(normalizeEmail(email)).digest('hex')
}
