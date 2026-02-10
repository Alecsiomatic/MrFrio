import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

import { getDefaultRoute, parseAppRole, type AppRole } from "@/auth.config"
import { getJwtSecretKey } from "@/lib/jwt"

const PUBLIC_FILE = /\.(?:png|jpg|jpeg|svg|gif|ico|webp|css|js|txt|map)$/
const SESSION_COOKIE = "session"
const secretKey = getJwtSecretKey()

type MiddlewareSession = {
  id: string
  email: string
  role: AppRole
  ruteroId: number | null
}

async function readSession(req: NextRequest): Promise<MiddlewareSession | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey)
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null
    }

    const role = parseAppRole(payload.role)
    if (!role) return null

    let ruteroId: number | null = null
    if (payload.ruteroId !== undefined && payload.ruteroId !== null && payload.ruteroId !== "") {
      const numeric = Number(payload.ruteroId)
      ruteroId = Number.isFinite(numeric) ? numeric : null
    }

    return {
      id: payload.sub,
      email: payload.email,
      role,
      ruteroId,
    }
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const isApi = pathname.startsWith("/api")
  const isPublicAsset = pathname.startsWith("/_next") || pathname === "/favicon.ico" || PUBLIC_FILE.test(pathname)

  if (isApi || isPublicAsset) return NextResponse.next()

  const isLogin = pathname.startsWith("/login")
  const session = await readSession(req)
  const isAuthed = !!session
  const role = session?.role ?? null

  if (isLogin && isAuthed) {
    return NextResponse.redirect(new URL(getDefaultRoute(role), req.url))
  }

  if (!isAuthed && !isLogin) {
    const next = encodeURIComponent(pathname + (search || ""))
    return NextResponse.redirect(new URL(`/login?next=${next}`, req.url))
  }

  if (!role) {
    return NextResponse.next()
  }

  if (role === "REPARTIDOR") {
    const allowedSeguimiento = pathname === "/seguimiento" || pathname.startsWith("/seguimiento/")
    if (!allowedSeguimiento) {
      return NextResponse.redirect(new URL("/seguimiento", req.url))
    }
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(getDefaultRoute(role), req.url))
  }

  if (pathname === "/seguimiento" && role !== "ADMIN" && role !== "REPARTIDOR") {
    return NextResponse.redirect(new URL(getDefaultRoute(role), req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|css|js|txt|map)).*)',
  ],
}

export default middleware
