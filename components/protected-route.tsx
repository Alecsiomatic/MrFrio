"use client"

import { Navigate, Outlet, useLocation } from "react-router-dom"
import type { ReactNode } from "react"

export type UserRole = "admin" | "rutero" | "visor"

export const ROLE_ALLOWED_PATHS: Record<UserRole, string[]> = {
  admin: ["/dashboard", "/usuarios", "/seguimiento"],
  rutero: ["/seguimiento"],
  visor: ["/reportes"],
}

const ROLE_DEFAULT_REDIRECT: Record<UserRole, string> = {
  admin: "/dashboard",
  rutero: "/seguimiento",
  visor: "/reportes",
}

const normalizePath = (path: string) => {
  if (path === "/") {
    return "/"
  }

  // Ensure trailing slashes do not generate false negatives when checking permissions.
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1)
  }

  return path
}

export interface ProtectedRouteProps {
  userRole: UserRole
  fallbackPath?: string
  children?: ReactNode
}

export function ProtectedRoute({ userRole, fallbackPath, children }: ProtectedRouteProps) {
  const location = useLocation()
  const normalizedPath = normalizePath(location.pathname)
  const allowedPaths = ROLE_ALLOWED_PATHS[userRole] ?? []
  const canAccess = allowedPaths.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`))

  if (!canAccess) {
    const redirectTo = fallbackPath ?? ROLE_DEFAULT_REDIRECT[userRole] ?? "/login"
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  if (children) {
    return <>{children}</>
  }

  return <Outlet />
}

export const getDefaultRouteForRole = (role: UserRole) => ROLE_DEFAULT_REDIRECT[role] ?? "/login"
