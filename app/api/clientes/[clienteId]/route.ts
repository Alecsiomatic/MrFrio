import { NextResponse } from "next/server"
import { getClientePorId, actualizarCliente, eliminarCliente } from "@/lib/db"
import { requireUser } from "@/lib/api-auth"

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const

type UpdateRutaInput = { rutaId: string; dias: Record<(typeof DIAS)[number], boolean> }

function sanitizeRutas(input: any): UpdateRutaInput[] {
  if (!Array.isArray(input)) return []
  return input.map((ruta: any) => ({
    rutaId: String(ruta?.rutaId ?? ""),
    dias: DIAS.reduce((acc, dia) => {
      acc[dia] = Boolean(ruta?.dias?.[dia])
      return acc
    }, {} as Record<(typeof DIAS)[number], boolean>),
  }))
}

function validateRutas(rutas: UpdateRutaInput[]) {
  if (rutas.length === 0) {
    return "Agrega al menos una asignacion de ruta"
  }
  const ids = new Set<string>()
  for (const ruta of rutas) {
    if (!ruta.rutaId) {
      return "Cada asignacion debe incluir un identificador de ruta valido"
    }
    if (ids.has(ruta.rutaId)) {
      return "Cada ruta solo puede asignarse una vez"
    }
    ids.add(ruta.rutaId)
    if (!DIAS.some((dia) => ruta.dias[dia])) {
      return "Cada asignacion debe incluir al menos un dia de visita"
    }
  }
  return null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clienteId: string }> },
) {
  try {
    await requireUser(["ADMIN"])
    const { clienteId } = await params
    const cliente = await getClientePorId(clienteId)
    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }
    return NextResponse.json(cliente)
  } catch (error) {
    console.error("Error al obtener cliente:", error)
    return NextResponse.json({ error: "Error al obtener cliente" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ clienteId: string }> },
) {
  try {
    await requireUser(["ADMIN"])
    const { clienteId } = await params
    const body = await request.json()

    const rutas = sanitizeRutas(body?.rutas)
    const rutasError = validateRutas(rutas)
    if (rutasError) {
      return NextResponse.json({ error: rutasError }, { status: 400 })
    }

    if (!body?.local || !body?.direccion) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    const telefono = typeof body.telefono === "string" ? body.telefono : ""
    const latValue = body.lat === null || body.lat === undefined || body.lat === "" ? null : Number(body.lat)
    const lngValue = body.lng === null || body.lng === undefined || body.lng === "" ? null : Number(body.lng)

    if (latValue !== null && Number.isNaN(latValue)) {
      return NextResponse.json({ error: "Latitud invalida" }, { status: 400 })
    }
    if (lngValue !== null && Number.isNaN(lngValue)) {
      return NextResponse.json({ error: "Longitud invalida" }, { status: 400 })
    }

    const tieneRefrigerador = Boolean(body?.tiene_refrigerador)

    await actualizarCliente(clienteId, {
      local: body.local,
      telefono,
      direccion: body.direccion,
      lat: latValue,
      lng: lngValue,
      tiene_refrigerador: tieneRefrigerador,
      capacidad_refrigerador: tieneRefrigerador ? body?.capacidad_refrigerador ?? "" : "",
      rutas: rutas.map((ruta) => ({
        rutaId: ruta.rutaId,
        dias: ruta.dias,
      })),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al actualizar cliente:", error)
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clienteId: string }> },
) {
  try {
    await requireUser(["ADMIN"])
    const { clienteId } = await params

    let body: any = null
    try {
      body = await request.json()
    } catch {
      body = null
    }

    const rawActivo = body?.activo
    let activo: boolean | null = null

    if (typeof rawActivo === "boolean") {
      activo = rawActivo
    } else if (rawActivo === 1 || rawActivo === "1") {
      activo = true
    } else if (rawActivo === 0 || rawActivo === "0") {
      activo = false
    }

    if (activo === null) {
      return NextResponse.json({ error: "Estado 'activo' invalido" }, { status: 400 })
    }

    const cliente = await getClientePorId(clienteId)
    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    if (cliente.activo === activo) {
      return NextResponse.json({ success: true, activo })
    }

    await actualizarCliente(clienteId, { activo })
    return NextResponse.json({ success: true, activo })
  } catch (error) {
    console.error("Error al actualizar estado de cliente:", error)
    return NextResponse.json({ error: "Error al actualizar estado del cliente" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ clienteId: string }> },
) {
  try {
    await requireUser(["ADMIN"])
    const { clienteId } = await params

    const result = await eliminarCliente(clienteId)
    if (result?.notFound) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar cliente:", error)
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as any).code
      if (code === "ER_ROW_IS_REFERENCED_2" || code === "ER_ROW_IS_REFERENCED") {
        return NextResponse.json(
          { error: "No se puede eliminar el cliente porque tiene registros relacionados." },
          { status: 409 },
        )
      }
    }
    return NextResponse.json({ error: "Error al eliminar cliente" }, { status: 500 })
  }
}
