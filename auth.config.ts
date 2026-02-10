export const APP_ROLE_VALUES = ["ADMIN", "REPARTIDOR", "SUPERVISOR"] as const

export type AppRole = (typeof APP_ROLE_VALUES)[number]
export type DbRole = "admin" | "rutero" | "visor"

export function toAppRole(dbRole: unknown): AppRole {
  const normalized = String(dbRole || "").toLowerCase()
  switch (normalized) {
    case "admin":
      return "ADMIN"
    case "rutero":
    case "repartidor":
      return "REPARTIDOR"
    case "visor":
    case "supervisor":
    default:
      return "SUPERVISOR"
  }
}

export function toDbRole(role: unknown): DbRole {
  if (typeof role === "string") {
    const normalized = role.toUpperCase()
    if (normalized === "ADMIN") return "admin"
    if (normalized === "SUPERVISOR") return "visor"
    if (normalized === "REPARTIDOR") return "rutero"
  }
  return "rutero"
}

export function parseAppRole(value: unknown): AppRole | null {
  if (typeof value !== "string") return null
  const upper = value.toUpperCase()
  return APP_ROLE_VALUES.find((role) => role === upper) ?? null
}

export const DEFAULT_ROUTE_BY_ROLE: Record<AppRole, string> = {
  ADMIN: "/",
  REPARTIDOR: "/seguimiento",
  SUPERVISOR: "/reportes",
}

export function getDefaultRoute(role: AppRole | null | undefined): string {
  if (!role) return "/"
  return DEFAULT_ROUTE_BY_ROLE[role] || "/"
}

export function isAppRole(value: unknown): value is AppRole {
  return parseAppRole(value) !== null
}
