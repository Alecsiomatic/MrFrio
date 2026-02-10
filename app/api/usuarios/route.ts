import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { query } from "@/lib/db"
import { requireUser } from "@/lib/api-auth"

const VALID_ROLES = new Set(["admin", "rutero", "visor"])

export async function POST(req: Request) {
  try {
    await requireUser(["ADMIN"])
    const body = await req.json()
    const email = String(body?.email || "").trim().toLowerCase()
    const nombre = String(body?.nombre || "").trim()
    const role = String(body?.role || "rutero").toLowerCase()
    const password = String(body?.password || "")

    if (!email || !nombre || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: "Rol no permitido" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contrasena debe tener al menos 6 caracteres" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const insertResult: any = await query(
      "INSERT INTO usuarios (email, nombre, role, password_hash, is_active) VALUES (?, ?, ?, ?, 1)",
      [email, nombre, role, hashed],
    )

    const insertedId = Number(insertResult?.insertId)
    const rows: any = await query(
      "SELECT id, email, nombre, role, is_active FROM usuarios WHERE id = ?",
      [insertedId],
    )

    const user = rows?.[0]
    return NextResponse.json({ user })
  } catch (error: any) {
    const status = Number(error?.status)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "El correo ya existe" }, { status: 409 })
    }
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "No autorizado" }, { status })
    }
    console.error("Error creando usuario", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
