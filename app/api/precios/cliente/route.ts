import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// Mapea IDs lógicos de producto -> columna en tabla clientes
const columnasProductos: Record<string, string> = {
  gourmet15: "precio_gourmet15",
  gourmet5: "precio_gourmet5",
  barraHielo: "precio_barraHielo",
  mediaBarra: "precio_mediaBarra",
  premium: "precio_premium",
}

// GET: Obtener precios personalizados de un cliente como ARRAY
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get("clienteId")

    if (!clienteId) {
      return NextResponse.json({ error: "Se requiere el parámetro 'clienteId'" }, { status: 400 })
    }

    // Traemos SOLO las columnas necesarias (más id por si quieres validar)
    const cols = Object.values(columnasProductos).join(", ")
    const rows = await query(
      `SELECT id, ${cols}
       FROM clientes
       WHERE id = ?
       LIMIT 1`,
      [clienteId],
    )

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    const cliente = rows[0] as Record<string, any>

    // Genera el arreglo [{ producto_id, precio }]
    const personalizados: Array<{ producto_id: string; precio: number }> = []
    for (const [productoId, columna] of Object.entries(columnasProductos)) {
      const val = cliente[columna]
      if (val !== null && val !== undefined) {
        const precioNum = Number.parseFloat(String(val))
        if (!Number.isNaN(precioNum)) {
          personalizados.push({ producto_id: productoId, precio: precioNum })
        }
      }
    }

    // Devolvemos arreglo (tu UI ya lo sabe manejar)
    return NextResponse.json(personalizados, { status: 200 })
  } catch (error) {
    console.error("Error al obtener precios personalizados:", error)
    return NextResponse.json({ error: "Error al obtener precios personalizados" }, { status: 500 })
  }
}

// POST: Guardar/actualizar un precio personalizado
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clienteId, productoId, precio } = body || {}

    if (!clienteId || !productoId || precio === undefined) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    const precioValue = Number.parseFloat(precio)
    if (Number.isNaN(precioValue) || precioValue < 0) {
      return NextResponse.json({ error: "El precio debe ser un número positivo" }, { status: 400 })
    }

    const columna = columnasProductos[productoId]
    if (!columna) {
      return NextResponse.json({ error: "Producto no válido" }, { status: 400 })
    }

    await query(`UPDATE clientes SET ${columna} = ? WHERE id = ?`, [precioValue, clienteId])

    return NextResponse.json({ success: true, message: "Precio personalizado guardado correctamente" }, { status: 200 })
  } catch (error) {
    console.error("Error al guardar precio personalizado:", error)
    return NextResponse.json({ error: "Error al guardar precio personalizado" }, { status: 500 })
  }
}

// DELETE: Eliminar un precio personalizado (uno o todos)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get("clienteId")
    const productoId = searchParams.get("productoId") // opcional

    if (!clienteId) {
      return NextResponse.json({ error: "Falta 'clienteId'" }, { status: 400 })
    }

    if (productoId) {
      const columna = columnasProductos[productoId]
      if (!columna) {
        return NextResponse.json({ error: "Producto no válido" }, { status: 400 })
      }
      await query(`UPDATE clientes SET ${columna} = NULL WHERE id = ?`, [clienteId])
    } else {
      // Eliminar TODOS los personalizados del cliente
      const sets = Object.values(columnasProductos).map((c) => `${c} = NULL`).join(", ")
      await query(`UPDATE clientes SET ${sets} WHERE id = ?`, [clienteId])
    }

    return NextResponse.json({ success: true, message: "Precio(s) personalizado(s) eliminado(s)" }, { status: 200 })
  } catch (error) {
    console.error("Error al eliminar precio personalizado:", error)
    return NextResponse.json({ error: "Error al eliminar precio personalizado" }, { status: 500 })
  }
}
