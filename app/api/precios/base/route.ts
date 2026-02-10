import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireUser } from "@/lib/api-auth"

export async function GET() {
  try {
    const productos = await query(
      `SELECT 
         id, 
         nombre, 
         CAST(precio_base AS DECIMAL(10,2)) AS precio_base 
       FROM productos 
       WHERE activo = 1 
       ORDER BY nombre ASC`
    )
    return NextResponse.json(productos, { status: 200 })
  } catch (error) {
    console.error("Error al obtener precios base:", error)
    return NextResponse.json({ error: "Error al obtener precios base" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireUser(["ADMIN"]) 
    const { productoId, precioBase } = await request.json()
    if (!productoId || precioBase === undefined) {
      return NextResponse.json({ error: "Se requiere ID de producto y precio base" }, { status: 400 })
    }

    const precioNum = Number.parseFloat(precioBase)
    if (Number.isNaN(precioNum) || precioNum < 0) {
      return NextResponse.json({ error: "Precio base inválido" }, { status: 400 })
    }

    await query("UPDATE productos SET precio_base = ? WHERE id = ?", [precioNum, productoId])
    return NextResponse.json({ success: true, message: "Precio base actualizado correctamente" }, { status: 200 })
  } catch (error) {
    console.error("Error al actualizar precio base:", error)
    return NextResponse.json({ error: "Error al actualizar precio base" }, { status: 500 })
  }
}
