import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getDiaActualColumna } from "@/lib/utils-client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { rutaId } = body

    if (!rutaId) {
      return NextResponse.json({ error: "Se requiere el parámetro 'rutaId'" }, { status: 400 })
    }

    // Obtener el día actual
    const diaActual = getDiaActualColumna()

    // Obtener todos los clientes de la ruta para el día actual
    const clientes = await query(
      `
      -- Clientes regulares asignados a esta ruta para hoy
      SELECT 
        c.id as cliente_id
      FROM clientes c
      JOIN clientes_rutas cr ON c.id = cr.cliente_id
      WHERE cr.ruta_id = ? AND c.activo = 1 AND cr.${diaActual} = 1
      
      UNION
      
      -- Clientes extemporáneos para esta ruta hoy
      SELECT 
        c.id as cliente_id
      FROM clientes c
      JOIN clientes_extemporaneos ce ON c.id = ce.cliente_id
      WHERE ce.ruta_id = ? 
        AND ce.fecha = CURDATE() 
        AND c.activo = 1
      `,
      [rutaId, rutaId],
    )

    // Si no hay clientes, devolver un mensaje
    if (!clientes || clientes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay clientes para inicializar",
        clientesInicializados: 0,
      })
    }

    // Inicializar el seguimiento para cada cliente
    for (const cliente of clientes) {
      await query(
        `
        INSERT INTO seguimiento_clientes (cliente_id, ruta_id, fecha, estado)
        VALUES (?, ?, CURDATE(), 'pendiente')
        ON DUPLICATE KEY UPDATE estado = estado
        `,
        [cliente.cliente_id, rutaId],
      )
    }

    // Establecer el primer cliente como activo si no hay ninguno activo
    const clientesActivos = await query(
      `
      SELECT cliente_id
      FROM seguimiento_clientes
      WHERE ruta_id = ? 
        AND fecha = CURDATE()
        AND estado = 'activo'
      LIMIT 1
      `,
      [rutaId],
    )

    if (!clientesActivos || clientesActivos.length === 0) {
      const primerClienteId = clientes[0]?.cliente_id

      if (primerClienteId) {
        await query(
          `
          UPDATE seguimiento_clientes
          SET estado = 'activo'
          WHERE cliente_id = ?
            AND ruta_id = ?
            AND fecha = CURDATE()
          `,
          [primerClienteId, rutaId],
        )

        // También actualizar el estado en la tabla de pedidos
        await query(
          `
          UPDATE pedidos p
          JOIN asignaciones a ON p.asignacion_id = a.id
          SET p.estado_seguimiento = 'activo'
          WHERE p.cliente_id = ?
            AND a.ruta_id = ?
            AND DATE(a.fecha) = CURDATE()
          `,
          [primerClienteId, rutaId],
        )

        console.log(`Cliente ${primerClienteId} establecido como activo`)
      } else {
        console.log("No se encontraron clientes para establecer como activo")
      }
    } else {
      console.log(`Ya existe un cliente activo: ${clientesActivos[0].cliente_id}`)
    }

    return NextResponse.json({
      success: true,
      message: "Seguimiento inicializado correctamente",
      clientesInicializados: clientes.length,
    })
  } catch (error) {
    console.error("Error al inicializar seguimiento:", error)
    return NextResponse.json({ error: "Error al inicializar seguimiento" }, { status: 500 })
  }
}
