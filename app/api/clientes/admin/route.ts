import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireUser } from "@/lib/api-auth"

type DbCliente = {
  id: string | number
  local: string | null
  direccion: string | null
  telefono: string | null
  activo: number | boolean | null
}

export async function GET() {
  try {
    await requireUser(["ADMIN"])

    const rows = (await query(
      `SELECT id, local, direccion, telefono, activo FROM clientes ORDER BY local ASC`,
    )) as DbCliente[]

    const clientes = rows.map((row) => ({
      id: String(row.id),
      nombre: row.local ?? "",
      direccion: row.direccion ?? "",
      telefono: row.telefono ?? "",
      activo: Boolean(row.activo),
    }))

    return NextResponse.json(clientes)
  } catch (error) {
    console.error("Error al obtener clientes para admin:", error)
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 })
  }
}
