import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { query } from "@/lib/db"
import { AdminPanel } from "@/components/admin-panel"

type DbUserRow = {
  id: number
  email: string
  nombre: string
  role: "admin" | "rutero" | "visor"
  is_active: number | boolean
}

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const currentUser = session.user

  const rows = (await query(
    "SELECT id, email, nombre, role, is_active FROM usuarios ORDER BY nombre ASC",
  )) as DbUserRow[]

  const users = rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.nombre,
    role: row.role,
    active: Boolean(row.is_active),
  }))

  return (
    <AdminPanel
      currentUser={{
        id: currentUser.id,
        name: currentUser.name || "",
        role: currentUser.role,
      }}
      users={users}
    />
  )
}
