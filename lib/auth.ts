import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

import { parseAppRole, type AppRole } from '@/auth.config'
import { getJwtSecretKey } from '@/lib/jwt'

export type SessionUser = {
  id: string
  email: string
  name: string
  nombre: string
  role: AppRole
  ruteroId: number | null
}

export const SESSION_COOKIE_NAME = 'session'
const ONE_DAY_SECONDS = 60 * 60 * 24

export async function createSession(user: SessionUser, maxAgeSec = ONE_DAY_SECONDS) {
  const payload = {
    email: user.email,
    name: user.name,
    role: user.role,
    ruteroId: user.ruteroId ?? null,
  }

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(getJwtSecretKey())

  const jar = await cookies()
  jar.set(SESSION_COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSec,
  })

  return jwt
}

export async function clearSession() {
  const jar = await cookies()
  jar.set(SESSION_COOKIE_NAME, '', { path: '/', httpOnly: true, maxAge: 0 })
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())

    if (typeof payload.email !== 'string' || typeof payload.sub !== 'string') {
      return null
    }

    const role = parseAppRole(payload.role)
    if (!role) return null

    const name = typeof payload.name === 'string' ? payload.name : ''

    let ruteroId: number | null = null
    if (payload.ruteroId !== undefined && payload.ruteroId !== null && payload.ruteroId !== '') {
      const numeric = Number(payload.ruteroId)
      ruteroId = Number.isFinite(numeric) ? numeric : null
    }

    return {
      id: String(payload.sub),
      email: payload.email,
      name,
      nombre: name,
      role,
      ruteroId,
    }
  } catch {
    return null
  }
}

export async function requireSession(roles?: AppRole[]): Promise<SessionUser> {
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  if (roles && !roles.includes(session.role)) throw new Error('FORBIDDEN')
  return session
}
