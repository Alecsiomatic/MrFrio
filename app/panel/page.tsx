"use client"

import { useState } from "react"
import { ProtectedRoutes } from "@/components/protected-routes"
import type { UserRole } from "@/components/protected-route"

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  rutero: "Rutero",
  visor: "Visor",
}

const AVAILABLE_ROLES: UserRole[] = ["admin", "rutero", "visor"]

export default function PanelPage() {
  const [role, setRole] = useState<UserRole>("admin")

  return (
    <div className="relative min-h-screen bg-black">
      <RoleSwitcher role={role} onChange={setRole} />
      <ProtectedRoutes userRole={role} basename="/panel" />
    </div>
  )
}

interface RoleSwitcherProps {
  role: UserRole
  onChange: (role: UserRole) => void
}

const RoleSwitcher = ({ role, onChange }: RoleSwitcherProps) => {
  return (
    <div className="fixed left-1/2 top-8 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-gray-100 shadow-lg shadow-black/30 backdrop-blur ring-1 ring-white/15">
      <label htmlFor="role-switcher" className="text-xs uppercase tracking-[0.3em] text-gray-300">
        Rol activo
      </label>
      <select
        id="role-switcher"
        value={role}
        onChange={(event) => onChange(event.target.value as UserRole)}
        className="rounded-md border border-white/10 bg-black/60 px-2 py-1 text-sm text-white outline-none focus:border-blue-400"
      >
        {AVAILABLE_ROLES.map((availableRole) => (
          <option key={availableRole} value={availableRole} className="bg-black text-white">
            {ROLE_LABELS[availableRole]}
          </option>
        ))}
      </select>
    </div>
  )
}
