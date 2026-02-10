import { type NextRequest, NextResponse } from "next/server"
import { getSalidasEfectivo, createSalidaEfectivo } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GET /api/salidas-efectivo ===")

    const { searchParams } = new URL(request.url)
    const rutero_id = searchParams.get("rutero_id")
    const fecha_desde = searchParams.get("fecha_desde")
    const fecha_hasta = searchParams.get("fecha_hasta")

    console.log("Parámetros recibidos:", { rutero_id, fecha_desde, fecha_hasta })

    const filters = {
      rutero_id: rutero_id && rutero_id !== "" ? Number.parseInt(rutero_id) : undefined,
      fecha_desde,
      fecha_hasta,
    }

    console.log("Filtros procesados:", filters)

    const salidas = await getSalidasEfectivo(filters)

    console.log("Salidas obtenidas:", salidas.length)

    return NextResponse.json(salidas)
  } catch (error) {
    console.error("Error detallado en GET /api/salidas-efectivo:", error)

    // Devolver error más específico
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"

    return NextResponse.json(
      {
        error: "Error al obtener salidas de efectivo",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== POST /api/salidas-efectivo ===")

    const body = await request.json()
    console.log("Body recibido:", body)

    const { rutero_id, motivo, monto } = body

    // Validaciones
    if (!rutero_id || !motivo || !monto) {
      console.log("Validación fallida: campos faltantes")
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    if (monto <= 0) {
      console.log("Validación fallida: monto inválido")
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 })
    }

    const salidaData = {
      rutero_id: Number.parseInt(rutero_id.toString()),
      motivo: motivo.trim(),
      monto: Number.parseFloat(monto.toString()),
    }

    console.log("Datos a insertar:", salidaData)

    const salidaId = await createSalidaEfectivo(salidaData)

    console.log("Salida creada con ID:", salidaId)

    return NextResponse.json(
      {
        message: "Salida de efectivo registrada exitosamente",
        id: salidaId,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error detallado en POST /api/salidas-efectivo:", error)

    // Manejar errores específicos
    if (error instanceof Error) {
      if (error.message.includes("Repartidor no encontrado")) {
        return NextResponse.json({ error: "Repartidor no encontrado o inactivo" }, { status: 404 })
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Error desconocido"

    return NextResponse.json(
      {
        error: "Error al registrar salida de efectivo",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
