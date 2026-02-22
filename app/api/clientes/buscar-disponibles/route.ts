import { NextResponse } from "next/server"
import { getPool, getDiaActualColumna } from "@/lib/db"

// GET /api/clientes/buscar-disponibles?q=texto&rutaId=101
// Busca clientes que NO estén asignados al día actual en esa ruta
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || ""
    const rutaId = searchParams.get("rutaId")

    if (!rutaId) {
      return NextResponse.json(
        { error: "Se requiere rutaId" },
        { status: 400 }
      )
    }

    if (q.length < 2) {
      return NextResponse.json([])
    }

    const diaActual = getDiaActualColumna() // ej: "dia_lunes"
    const pool = getPool()

    // Buscar clientes activos que:
    // 1. Coincidan con el término de búsqueda
    // 2. NO estén ya asignados a esta ruta para el día actual
    const [clientes]: any = await pool.query(
      `SELECT c.id, c.local, c.direccion, c.telefono
       FROM clientes c
       WHERE c.activo = 1
         AND (c.local LIKE ? OR c.direccion LIKE ?)
         AND c.id NOT IN (
           SELECT cr.cliente_id 
           FROM clientes_rutas cr 
           WHERE cr.ruta_id = ? AND cr.${diaActual} = 1
         )
       ORDER BY c.local
       LIMIT 20`,
      [`%${q}%`, `%${q}%`, rutaId]
    )

    return NextResponse.json(clientes || [])
  } catch (error) {
    console.error("Error al buscar clientes disponibles:", error)
    return NextResponse.json(
      { error: "Error al buscar clientes", details: String(error) },
      { status: 500 }
    )
  }
}
