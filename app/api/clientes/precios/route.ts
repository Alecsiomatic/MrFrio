import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET: Obtener los precios personalizados de un cliente
export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get("clienteId")

    if (!clienteId) {
      return NextResponse.json({ error: "Se requiere el parámetro 'clienteId'" }, { status: 400 })
    }

    const cliente = await query(
      `
      SELECT 
        id, 
        local, 
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

    if (!cliente || cliente.length === 0) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Obtener los precios base de los productos para comparación
    const productos = await query(`
      SELECT id, precio_base
      FROM productos
      WHERE activo = 1
    `)

    // Crear un objeto con los precios base para fácil acceso
    const preciosBase = productos.reduce((acc: any, producto: any) => {
      acc[producto.id] = producto.precio_base
      return acc
    }, {})

    // Formatear la respuesta
    const clienteData = cliente[0]
    const precios = {
      clienteId: clienteData.id,
      nombreCliente: clienteData.local,
      precios: {
        gourmet15: {
          precioBase: preciosBase.gourmet15 || 0,
          precioPersonalizado: clienteData.precio_gourmet15,
        },
        gourmet5: {
          precioBase: preciosBase.gourmet5 || 0,
          precioPersonalizado: clienteData.precio_gourmet5,
        },
        barraHielo: {
          precioBase: preciosBase.barraHielo || 0,
          precioPersonalizado: clienteData.precio_barraHielo,
        },
        mediaBarra: {
          precioBase: preciosBase.mediaBarra || 0,
          precioPersonalizado: clienteData.precio_mediaBarra,
        },
        premium: {
          precioBase: preciosBase.premium || 0,
          precioPersonalizado: clienteData.precio_premium,
        },
      },
    }

    return NextResponse.json(precios)
  } catch (error) {
    console.error("Error al obtener precios personalizados:", error)
    return NextResponse.json({ error: "Error al obtener precios personalizados" }, { status: 500 })
  }
}

// POST: Actualizar los precios personalizados de un cliente
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clienteId, precios } = body

    if (!clienteId || !precios) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Actualizar los precios personalizados del cliente
    await query(
      `
      UPDATE clientes
      SET 
        precio_gourmet15 = ?,
        precio_gourmet5 = ?,
        precio_barraHielo = ?,
        precio_mediaBarra = ?,
        precio_premium = ?
      WHERE id = ?
      `,
      [
        precios.gourmet15 || null,
        precios.gourmet5 || null,
        precios.barraHielo || null,
        precios.mediaBarra || null,
        precios.premium || null,
        clienteId,
      ],
    )

    return NextResponse.json({
      success: true,
      message: "Precios personalizados actualizados correctamente",
    })
  } catch (error) {
    console.error("Error al actualizar precios personalizados:", error)
    return NextResponse.json({ error: "Error al actualizar precios personalizados" }, { status: 500 })
  }
}
