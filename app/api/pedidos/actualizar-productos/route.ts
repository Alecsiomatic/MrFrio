import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { pedidoId, productos } = await request.json()

    if (!pedidoId || !productos) {
      return NextResponse.json({ error: "Se requiere ID de pedido y productos" }, { status: 400 })
    }

    // Actualizar los productos del pedido
    await query(
      `
      UPDATE pedidos
      SET 
        gourmet15 = ?,
        gourmet5 = ?,
        barraHielo = ?,
        mediaBarra = ?,
        premium = ?
      WHERE id = ?
    `,
      [
        productos.gourmet15 || 0,
        productos.gourmet5 || 0,
        productos.barraHielo || 0,
        productos.mediaBarra || 0,
        productos.premium || 0,
        pedidoId,
      ],
    )

    // Obtener el cliente asociado al pedido
    const pedidoResult = await query(
      `
      SELECT cliente_id
      FROM pedidos
      WHERE id = ?
    `,
      [pedidoId],
    )

    if (!pedidoResult || !Array.isArray(pedidoResult) || pedidoResult.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    const clienteId = (pedidoResult[0] as any).cliente_id

    // Obtener los precios base de todos los productos
    const preciosBaseResult = await query(
      `
      SELECT id, precio_base
      FROM productos
      WHERE activo = 1
    `,
    )

    if (!preciosBaseResult || !Array.isArray(preciosBaseResult)) {
      return NextResponse.json({ error: "Error al obtener precios base" }, { status: 500 })
    }

    // Crear un mapa de precios base
    const preciosBase: Record<string, number> = {}
    for (const producto of preciosBaseResult as any[]) {
      preciosBase[producto.id] = Number.parseFloat(producto.precio_base) || 0
    }

    // Obtener los precios personalizados del cliente
    const clienteResult = await query(
      `
      SELECT 
        precio_gourmet15, 
        precio_gourmet5, 
        precio_barraHielo, 
        precio_mediaBarra, 
        precio_premium
      FROM clientes
      WHERE id = ?
    `,
      [clienteId],
    )

    if (!clienteResult || !Array.isArray(clienteResult) || clienteResult.length === 0) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    const cliente = clienteResult[0] as any

    // Mapeo de IDs de productos a nombres de columna en la tabla clientes
    const columnasProductos: Record<string, string> = {
      gourmet15: "precio_gourmet15",
      gourmet5: "precio_gourmet5",
      barraHielo: "precio_barraHielo",
      mediaBarra: "precio_mediaBarra",
      premium: "precio_premium",
    }

    // Calcular el total del pedido
    let total = 0
    for (const [productoId, cantidad] of Object.entries(productos)) {
      if (cantidad > 0) {
        // Obtener el precio personalizado si existe
        const columnaProducto = columnasProductos[productoId]
        const precioPersonalizado = columnaProducto ? cliente[columnaProducto] : null

        // Usar precio personalizado si existe, de lo contrario usar precio base
        const precio =
          precioPersonalizado !== null && precioPersonalizado !== undefined
            ? Number.parseFloat(precioPersonalizado)
            : preciosBase[productoId] || 0

        total += precio * (cantidad as number)
      }
    }

    // Actualizar el total del pedido
    await query(
      `
      UPDATE pedidos
      SET total = ?
      WHERE id = ?
    `,
      [total, pedidoId],
    )

    return NextResponse.json({
      success: true,
      message: "Productos y total actualizados correctamente",
      total,
    })
  } catch (error) {
    console.error("Error al actualizar productos:", error)
    return NextResponse.json({ error: "Error al actualizar productos" }, { status: 500 })
  }
}
