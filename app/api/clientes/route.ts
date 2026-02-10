import { NextResponse } from "next/server"
import { crearCliente } from "@/lib/db"
import { requireUser } from "@/lib/api-auth"

export async function POST(request: Request) {
  try {
    await requireUser(["ADMIN"])
    const body = await request.json()
    console.log("Datos recibidos en API:", body)

    const {
      local,
      direccion,
      telefono,
      lat,
      lng,
      tiene_refrigerador,
      capacidad_refrigerador,
      rutas,
    } = body

    if (!local || !direccion || !Array.isArray(rutas) || rutas.length === 0) {
      return NextResponse.json(
        { error: "Faltan datos requeridos. Se necesita local, direccion y al menos una ruta." },
        { status: 400 },
      )
    }

    const rutaIds = new Set<string>()
    for (const ruta of rutas) {
      if (!ruta?.rutaId || typeof ruta.rutaId !== "string") {
        return NextResponse.json(
          { error: "Cada asignacion debe incluir un identificador de ruta valido." },
          { status: 400 },
        )
      }

      if (rutaIds.has(ruta.rutaId)) {
        return NextResponse.json(
          { error: "Cada ruta solo puede asignarse una vez al cliente." },
          { status: 400 },
        )
      }
      rutaIds.add(ruta.rutaId)

      const dias = ruta.dias
      if (!dias || typeof dias !== "object" || !Object.values(dias).some((value: unknown) => Boolean(value))) {
        return NextResponse.json(
          { error: "Cada asignacion debe incluir al menos un dia de visita." },
          { status: 400 },
        )
      }
    }

    const tieneRefrigerador = Boolean(tiene_refrigerador)
    const clienteData = {
      local,
      telefono: telefono ?? "",
      direccion,
      lat,
      lng,
      tiene_refrigerador: tieneRefrigerador,
      capacidad_refrigerador: tieneRefrigerador ? capacidad_refrigerador : "",
      rutas: rutas.map((ruta: any) => ({
        rutaId: String(ruta.rutaId),
        dias: {
          lunes: Boolean(ruta.dias?.lunes),
          martes: Boolean(ruta.dias?.martes),
          miercoles: Boolean(ruta.dias?.miercoles),
          jueves: Boolean(ruta.dias?.jueves),
          viernes: Boolean(ruta.dias?.viernes),
          sabado: Boolean(ruta.dias?.sabado),
          domingo: Boolean(ruta.dias?.domingo),
        },
      })),
    }

    const resultado = await crearCliente(clienteData)
    return NextResponse.json(resultado)
  } catch (error) {
    console.error("Error al crear cliente:", error)
    return NextResponse.json(
      {
        error: "Error al crear cliente",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
