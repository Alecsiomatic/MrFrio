import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET: Obtener los precios base de todos los productos
export async function GET() {
  try {
    const productos = await query(`
      SELECT id, nombre, precio_base
      FROM productos
      WHERE activo = 1
      ORDER BY nombre
    `)

    return NextResponse.json(productos)
  } catch (error) {
    console.error("Error al obtener precios de productos:", error)
    return NextResponse.json({ error: "Error al obtener precios de productos" }, { status: 500 })
  }
}

// POST: Actualizar el precio base de un producto
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productoId, precioBase } = body

    if (!productoId || precioBase === undefined) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    await query(
      `
      UPDATE productos
      SET precio_base = ?
      WHERE id = ?
      `,
      [precioBase, productoId],
    )

    return NextResponse.json({
      success: true,
      message: "Precio base actualizado correctamente",
    })
  } catch (error) {
    console.error("Error al actualizar precio base:", error)
    return NextResponse.json({ error: "Error al actualizar precio base" }, { status: 500 })
  }
}
