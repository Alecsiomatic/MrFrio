import { auth } from "@/auth"
import type { AppRole } from "@/auth.config"
import type { SessionUser } from "@/lib/auth"

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  return session?.user ?? null
}

export async function requireUser(roles?: AppRole[]): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 })
  }
  if (roles && !roles.includes(user.role)) {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 })
  }
  return user
}
