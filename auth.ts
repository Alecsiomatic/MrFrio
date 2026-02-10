import { clearSession, createSession, getSession, type SessionUser } from '@/lib/auth'

export type AuthSession = {
  user: SessionUser
}

export async function auth(): Promise<AuthSession | null> {
  const user = await getSession()
  if (!user) return null
  return { user }
}

export async function signIn(user: SessionUser, maxAgeSec?: number) {
  return createSession(user, maxAgeSec)
}

export async function signOut() {
  await clearSession()
}
