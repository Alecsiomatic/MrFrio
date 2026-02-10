import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const term = searchParams.get("term") || ""
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10)

    // Construir la consulta base
    let sql = `
      SELECT c.id, c.local as nombre, c.direccion, c.telefono, c.isExtra
      FROM clientes c
      WHERE c.activo = 1
    `
    const params: any[] = []

    // Añadir filtro de búsqueda si se proporciona un término
    if (term) {
      sql += `
        AND (
          c.local LIKE ? OR 
          c.direccion LIKE ? OR 
          c.id LIKE ? OR
          c.telefono LIKE ?
        )
      `
      params.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`)
    }

    // Añadir ordenamiento y límite
    sql += `
      ORDER BY c.local ASC
      LIMIT ?
    `
    params.push(limit)

    const clientes = await query(sql, params)
    return NextResponse.json(clientes)
  } catch (error) {
    console.error("Error al buscar clientes:", error)
    return NextResponse.json({ error: "Error al buscar clientes" }, { status: 500 })
  }
}
