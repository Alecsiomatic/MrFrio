import { createPool } from "mysql2/promise"

let pool: any = null

function getPool() {
  if (!pool) {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
      throw new Error("Database configuration variables are not set")
    }

    pool = createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: "+00:00", // Configurar timezone UTC
    })
  }
  return pool
}

// Ensure that the "orden" column exists in clientes_rutas
let checkedOrdenColumn = false
async function ensureOrdenColumn() {
  if (checkedOrdenColumn) return
  const p = getPool()
  const [rows]: any = await p.query("SHOW COLUMNS FROM clientes_rutas LIKE 'orden'")
  if (rows.length === 0) {
    await p.query("ALTER TABLE clientes_rutas ADD COLUMN orden INT DEFAULT NULL")
  }
  checkedOrdenColumn = true
}

// Reemplazar la función query con una versión sin logs de depuración
export async function query(sql: string, params?: any[]) {
  try {
    const p = getPool();                    // ← aseguramos pool
    const [rows] = await p.execute(sql, params);
    return rows;
  } catch (error) {
    console.error("Error en consulta SQL:", error);
    throw error;
  }
}

export async function getRuteros() {
  const usuarios = (await query(
    `
    SELECT
      u.id AS usuario_id,
      u.nombre AS usuario_nombre,
      u.email,
      u.is_active,
      u.rutero_id,
      r.id AS rutero_id_real,
      r.nombre AS rutero_nombre,
      r.telefono AS rutero_telefono,
      r.activo AS rutero_activo
    FROM usuarios u
    LEFT JOIN ruteros r ON r.id = u.rutero_id
    WHERE u.role = 'rutero'
    ORDER BY COALESCE(r.nombre, u.nombre) ASC
    `,
  )) as any[]

  const normalizados = usuarios.map((row) => ({
    id: row.rutero_id_real ?? row.usuario_id,
    usuario_id: row.usuario_id,
    rutero_id: row.rutero_id_real ?? null,
    nombre: row.rutero_nombre ?? row.usuario_nombre,
    telefono: row.rutero_telefono ?? '',
    email: row.email ?? null,
    activo: Boolean(row.is_active) && ((row.rutero_activo === null || row.rutero_activo === undefined || Boolean(row.rutero_activo))),
  }))

  const faltantes = (await query(
    `
    SELECT r.id, r.nombre, r.telefono, r.activo
    FROM ruteros r
    WHERE r.activo = 1
      AND NOT EXISTS (
        SELECT 1 FROM usuarios u
        WHERE u.role = 'rutero' AND u.rutero_id = r.id
      )
    ORDER BY r.nombre ASC
    `,
  )) as any[]

  const adicionales = faltantes.map((r) => ({
    id: r.id,
    usuario_id: null,
    rutero_id: r.id,
    nombre: r.nombre,
    telefono: r.telefono ?? '',
    email: null,
    activo: Boolean(r.activo),
  }))

  return [...normalizados, ...adicionales]
}

export async function getProductos() {
  const rows = await query("SELECT * FROM productos WHERE activo = 1")
  return rows
}

export async function getRutas() {
  const rows = await query("SELECT id, nombre FROM rutas WHERE activo = 1")
  return rows
}

// Función para obtener el nombre de la columna del día actual en la base de datos
export function getDiaActualColumna() {
  const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
  const hoy = new Date()
  const diaSemana = hoy.getDay() // 0 = domingo, 1 = lunes, etc.
  return `dia_${diasSemana[diaSemana]}`
}

// Función para obtener el nombre del día actual en español
export function getDiaActualNombre() {
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  const hoy = new Date()
  const diaSemana = hoy.getDay()
  return diasSemana[diaSemana]
}

// Modificar la función getClientesPorRuta para limpiar los nombres antes de devolverlos
type ClienteConCoordenadas = {
  lat?: number | string | null
  lng?: number | string | null
}

function obtenerCoordenadasValidas(cliente: ClienteConCoordenadas): [number, number] | null {
  const lat = typeof cliente.lat === "string" ? parseFloat(cliente.lat) : cliente.lat
  const lng = typeof cliente.lng === "string" ? parseFloat(cliente.lng) : cliente.lng

  if (lat === null || lat === undefined || lng === null || lng === undefined) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  return [lat, lng]
}

function calcularDistanciaHaversine(
  origen: ClienteConCoordenadas,
  destino: ClienteConCoordenadas,
): number | null {
  const origenCoords = obtenerCoordenadasValidas(origen)
  const destinoCoords = obtenerCoordenadasValidas(destino)

  if (!origenCoords || !destinoCoords) return null

  const [lat1, lon1] = origenCoords
  const [lat2, lon2] = destinoCoords

  const toRad = (valor: number) => (valor * Math.PI) / 180
  const R = 6371 // Radio de la tierra en kilómetros
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const lat1Rad = toRad(lat1)
  const lat2Rad = toRad(lat2)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export async function getClientesPorRuta(rutaId: string) {
  const diaActual = getDiaActualColumna()
  await ensureOrdenColumn()

  // Consulta para obtener clientes regulares y extemporáneos para esta ruta
  const rows = await query(
    `
    -- Clientes regulares asignados a esta ruta para hoy
    SELECT
      c.*,
      0 as es_extemporaneo,
      cr.orden
    FROM clientes c
    JOIN clientes_rutas cr ON c.id = cr.cliente_id
    WHERE cr.ruta_id = ? AND c.activo = 1 AND cr.${diaActual} = 1

    UNION

    -- Clientes extemporáneos para esta ruta hoy
    SELECT
      c.*,
      1 as es_extemporaneo,
      NULL as orden
    FROM clientes c
    JOIN clientes_extemporaneos ce ON c.id = ce.cliente_id
    WHERE ce.ruta_id = ?
      AND ce.fecha = CURDATE()
      AND c.activo = 1

    ORDER BY isExtra ASC, es_extemporaneo ASC, IFNULL(orden, 9999) ASC, local ASC
    `,
    [rutaId, rutaId],
  )

  const regulares = rows.filter((cliente: any) => !cliente.es_extemporaneo)
  const extemporaneos = rows.filter((cliente: any) => cliente.es_extemporaneo)

  const asignaciones = new Map<number, any[]>()
  const extemporaneosAlFinal: any[] = []

  extemporaneos.forEach((cliente: any) => {
    const distanciaMasCorta = { valor: Number.POSITIVE_INFINITY, indice: -1 }

    regulares.forEach((regular: any, indice: number) => {
      const distancia = calcularDistanciaHaversine(cliente, regular)
      if (distancia === null) return
      if (distancia < distanciaMasCorta.valor) {
        distanciaMasCorta.valor = distancia
        distanciaMasCorta.indice = indice
      }
    })

    if (distanciaMasCorta.indice === -1) {
      extemporaneosAlFinal.push(cliente)
      return
    }

    const lista = asignaciones.get(distanciaMasCorta.indice) ?? []
    lista.push(cliente)
    asignaciones.set(distanciaMasCorta.indice, lista)
  })

  const regularesNoExtra = regulares
    .map((cliente: any, indice: number) => ({ cliente, indice }))
    .filter(({ cliente }) => !cliente.isExtra)
  const regularesExtra = regulares
    .map((cliente: any, indice: number) => ({ cliente, indice }))
    .filter(({ cliente }) => cliente.isExtra)

  const clientesOrdenados: any[] = []

  const agregarClienteConExtemporaneos = ({ cliente, indice }: { cliente: any; indice: number }) => {
    clientesOrdenados.push(cliente)
    const extras = asignaciones.get(indice)
    if (extras) {
      clientesOrdenados.push(...extras)
    }
  }

  regularesNoExtra.forEach(agregarClienteConExtemporaneos)
  regularesExtra.forEach(agregarClienteConExtemporaneos)

  clientesOrdenados.push(...extemporaneosAlFinal)

  // Limpiar los nombres de los clientes antes de devolverlos
  const clientesLimpios = clientesOrdenados.map((cliente: any) => {
    // Crear una copia del cliente para no modificar el original
    const clienteLimpio = { ...cliente }

    // Limpiar el nombre del cliente (eliminar números al final)
    if (clienteLimpio.local) {
      clienteLimpio.local = clienteLimpio.local.replace(/\s*\d+$/, "")
    }

    return clienteLimpio
  })

  return clientesLimpios
}

// También modificar la función getClienteCountPorRuta para contar correctamente
export async function getClienteCountPorRuta(rutaId: string) {
  const diaActual = getDiaActualColumna()

  const [result]: any = await query(
    `
    SELECT COUNT(*) as count
    FROM (
      -- Clientes regulares para esta ruta hoy
      SELECT c.id
      FROM clientes c
      JOIN clientes_rutas cr ON c.id = cr.cliente_id
      WHERE cr.ruta_id = ? AND c.activo = 1 AND cr.${diaActual} = 1
      
      UNION
      
      -- Clientes extemporáneos para esta ruta hoy
      SELECT c.id
      FROM clientes c
      JOIN clientes_extemporaneos ce ON c.id = ce.cliente_id
      WHERE ce.ruta_id = ? 
        AND ce.fecha = CURDATE() 
        AND c.activo = 1
    ) AS clientes_combinados
  `,
    [rutaId, rutaId],
  )
  return result.count
}

// Reemplazar la función getHistorialSobrantes con una versión sin logs de depuración
export async function getHistorialSobrantes(ruteroId: string) {
  try {
    const rows = await query(
      `
      SELECT ruta_id as ruta, DATE_FORMAT(fecha, '%Y-%m-%d') as fecha, 
             gourmet15, gourmet5, barraHielo, mediaBarra, premium
      FROM sobrantes
      WHERE rutero_id = ?
      ORDER BY fecha DESC
    `,
      [ruteroId],
    )

    // Transformar los resultados al formato esperado
    return rows.map((row: any) => ({
      fecha: row.fecha,
      ruta: row.ruta,
      productos: {
        gourmet15: row.gourmet15,
        gourmet5: row.gourmet5,
        barraHielo: row.barraHielo,
        mediaBarra: row.mediaBarra,
        premium: row.premium,
      },
    }))
  } catch (error) {
    console.error("Error en getHistorialSobrantes:", error)
    throw error
  }
}

// Función para calcular los totales de productos de una lista de pedidos
function calcularTotalesPedidos(pedidos: any[]) {
  const totales = {
    gourmet15: 0,
    gourmet5: 0,
    barraHielo: 0,
    mediaBarra: 0,
    premium: 0,
  }

  pedidos.forEach((pedido) => {
    totales.gourmet15 += pedido.productos.gourmet15 || 0
    totales.gourmet5 += pedido.productos.gourmet5 || 0
    totales.barraHielo += pedido.productos.barraHielo || 0
    totales.mediaBarra += pedido.productos.mediaBarra || 0
    totales.premium += pedido.productos.premium || 0
  })

  return totales
}

// Modificar la función guardarAsignacionRuta para guardar solo los totales
export async function guardarAsignacionRuta(
  rutaId: string,
  ruteroId: string,
  pedidos: any[],
  cargaGeneral?: Record<string, number>,
  modoInventario?: "individual" | "general",
) {
  const connection = await (await getPool()).getConnection()
  try {
    await connection.beginTransaction()

    // Buscar si ya existe una asignación para esta ruta en la fecha actual
    const [asignacionesExistentes]: any = await connection.execute(
      `
      SELECT id
      FROM asignaciones
      WHERE ruta_id = ?
        AND DATE(fecha) = CURDATE()
      ORDER BY fecha DESC
      LIMIT 1
      `,
      [rutaId],
    )

    let asignacionId
    let accion: "creada" | "actualizada"

    if (asignacionesExistentes && asignacionesExistentes.length > 0) {
      asignacionId = asignacionesExistentes[0].id
      await connection.execute(
        `UPDATE asignaciones SET rutero_id = ?, fecha = NOW() WHERE id = ?`,
        [ruteroId, asignacionId],
      )
      accion = "actualizada"
    } else {
      const [asignacionResult]: any = await connection.execute(
        "INSERT INTO asignaciones (ruta_id, rutero_id, fecha) VALUES (?, ?, NOW())",
        [rutaId, ruteroId],
      )
      asignacionId = asignacionResult.insertId
      accion = "creada"
    }

    const usarCargaGeneral = modoInventario === "general" && cargaGeneral
    const totales = usarCargaGeneral
      ? {
          gourmet15: cargaGeneral.gourmet15 || 0,
          gourmet5: cargaGeneral.gourmet5 || 0,
          barraHielo: cargaGeneral.barraHielo || 0,
          mediaBarra: cargaGeneral.mediaBarra || 0,
          premium: cargaGeneral.premium || 0,
        }
      : calcularTotalesPedidos(pedidos)

    // Registrar o actualizar el inventario inicial en la tabla de sobrantes
    const [sobranteExistente]: any = await connection.execute(
      `
      SELECT id
      FROM sobrantes
      WHERE ruta_id = ?
        AND fecha = CURDATE()
      LIMIT 1
      `,
      [rutaId],
    )

    if (sobranteExistente && sobranteExistente.length > 0) {
      await connection.execute(
        `
        UPDATE sobrantes
        SET
          rutero_id = ?,
          gourmet15 = ?,
          gourmet5 = ?,
          barraHielo = ?,
          mediaBarra = ?,
          premium = ?
        WHERE id = ?
        `,
        [
          ruteroId,
          totales.gourmet15,
          totales.gourmet5,
          totales.barraHielo,
          totales.mediaBarra,
          totales.premium,
          sobranteExistente[0].id,
        ],
      )
    } else {
      await connection.execute(
        `INSERT INTO sobrantes (rutero_id, ruta_id, fecha, gourmet15, gourmet5, barraHielo, mediaBarra, premium)
         VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
        [
          ruteroId,
          rutaId,
          totales.gourmet15,
          totales.gourmet5,
          totales.barraHielo,
          totales.mediaBarra,
          totales.premium,
        ],
      )
    }

    await connection.commit()
    return { success: true, asignacionId, accion }
  } catch (error) {
    await connection.rollback()
    console.error("Error al guardar asignación:", error)
    throw error
  } finally {
    connection.release()
  }
}

export async function registrarSobrantes(ruteroId: string, rutaId: string, productos: any) {
  try {
    await query(
      `INSERT INTO sobrantes (rutero_id, ruta_id, fecha, gourmet15, gourmet5, barraHielo, mediaBarra, premium)
       VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
      [
        ruteroId,
        rutaId,
        productos.gourmet15 || 0,
        productos.gourmet5 || 0,
        productos.barraHielo || 0,
        productos.mediaBarra || 0,
        productos.premium || 0,
      ],
    )
    return { success: true }
  } catch (error) {
    console.error("Error al registrar sobrantes:", error)
    throw error
  }
}

// Función para crear un nuevo cliente
export async function crearCliente(cliente: {
  local: string
  telefono: string
  direccion: string
  lat?: number
  lng?: number
  tiene_refrigerador: boolean
  capacidad_refrigerador?: string
  rutas: Array<{
    rutaId: string
    dias: {
      lunes: boolean
      martes: boolean
      miercoles: boolean
      jueves: boolean
      viernes: boolean
      sabado: boolean
      domingo: boolean
    }
  }>
}) {
  // Iniciar transacción
  const connection = await (await getPool()).getConnection()
  try {
    await connection.beginTransaction()

    // Generar un ID único para el cliente
    const clienteId = `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`

    console.log("Creando cliente con ID:", clienteId)

    // Insertar el cliente
    await connection.execute(
      `INSERT INTO clientes 
       (id, local, telefono, direccion, lat, lng, tiene_refrigerador, capacidad_refrigerador) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clienteId,
        cliente.local,
        cliente.telefono || null,
        cliente.direccion,
        cliente.lat || null,
        cliente.lng || null,
        cliente.tiene_refrigerador ? 1 : 0, // Convertir booleano a 1/0 para MySQL
        cliente.capacidad_refrigerador || null,
      ],
    )

    console.log("Cliente insertado, asignando a rutas...")

    // Asignar el cliente a las rutas seleccionadas
    for (const ruta of cliente.rutas) {
      await connection.execute(
        `INSERT INTO clientes_rutas 
         (cliente_id, ruta_id, dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes, dia_sabado, dia_domingo) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clienteId,
          ruta.rutaId,
          ruta.dias.lunes ? 1 : 0,
          ruta.dias.martes ? 1 : 0,
          ruta.dias.miercoles ? 1 : 0,
          ruta.dias.jueves ? 1 : 0,
          ruta.dias.viernes ? 1 : 0,
          ruta.dias.sabado ? 1 : 0,
          ruta.dias.domingo ? 1 : 0,
        ],
      )
    }

    console.log("Rutas asignadas, confirmando transacción...")

    await connection.commit()
    return { success: true, clienteId }
  } catch (error) {
    await connection.rollback()
    console.error("Error al crear cliente:", error)
    throw error
  } finally {
    connection.release()
  }
}

// Obtener un cliente por su ID
export async function getClientePorId(clienteId: string) {
  const clienteRows: any = await query(
    `SELECT id, local, telefono, direccion, lat, lng, tiene_refrigerador, capacidad_refrigerador, activo
       FROM clientes WHERE id = ? LIMIT 1`,
    [clienteId],
  )

  if (!clienteRows || clienteRows.length === 0) return null

  const cliente = clienteRows[0]

  const rutas: any = await query(
    `
    SELECT
      cr.ruta_id,
      cr.dia_lunes,
      cr.dia_martes,
      cr.dia_miercoles,
      cr.dia_jueves,
      cr.dia_viernes,
      cr.dia_sabado,
      cr.dia_domingo
    FROM clientes_rutas cr
    WHERE cr.cliente_id = ?
    ORDER BY cr.ruta_id
    `,
    [clienteId],
  )

  return {
    id: cliente.id,
    local: cliente.local || "",
    telefono: cliente.telefono || "",
    direccion: cliente.direccion || "",
    lat: cliente.lat !== null && cliente.lat !== undefined ? Number(cliente.lat) : null,
    lng: cliente.lng !== null && cliente.lng !== undefined ? Number(cliente.lng) : null,
    tiene_refrigerador: Boolean(cliente.tiene_refrigerador),
    capacidad_refrigerador: cliente.capacidad_refrigerador || "",
    activo: Boolean(cliente.activo),
    rutas: Array.isArray(rutas)
      ? rutas.map((ruta: any) => ({
          rutaId: String(ruta.ruta_id),
          dias: {
            lunes: Boolean(ruta.dia_lunes),
            martes: Boolean(ruta.dia_martes),
            miercoles: Boolean(ruta.dia_miercoles),
            jueves: Boolean(ruta.dia_jueves),
            viernes: Boolean(ruta.dia_viernes),
            sabado: Boolean(ruta.dia_sabado),
            domingo: Boolean(ruta.dia_domingo),
          },
        }))
      : [],
  }
}

// Actualizar información de un cliente
export async function actualizarCliente(
  clienteId: string,
  datos: {
    local?: string
    telefono?: string
    direccion?: string
    lat?: number | null
    lng?: number | null
    tiene_refrigerador?: boolean
    capacidad_refrigerador?: string | null
    activo?: boolean
    rutas?: Array<{
      rutaId: string
      dias: {
        lunes: boolean
        martes: boolean
        miercoles: boolean
        jueves: boolean
        viernes: boolean
        sabado: boolean
        domingo: boolean
      }
    }>
  },
) {
  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()

    const campos: string[] = []
    const valores: any[] = []

    if (datos.local !== undefined) {
      campos.push("local = ?")
      valores.push(datos.local)
    }
    if (datos.telefono !== undefined) {
      campos.push("telefono = ?")
      valores.push(datos.telefono)
    }
    if (datos.direccion !== undefined) {
      campos.push("direccion = ?")
      valores.push(datos.direccion)
    }
    if (datos.lat !== undefined) {
      campos.push("lat = ?")
      valores.push(datos.lat)
    }
    if (datos.lng !== undefined) {
      campos.push("lng = ?")
      valores.push(datos.lng)
    }
    if (datos.tiene_refrigerador !== undefined) {
      campos.push("tiene_refrigerador = ?")
      valores.push(datos.tiene_refrigerador ? 1 : 0)
    }
    if (datos.capacidad_refrigerador !== undefined) {
      campos.push("capacidad_refrigerador = ?")
      valores.push(datos.capacidad_refrigerador)
    }
    if (datos.activo !== undefined) {
      campos.push("activo = ?")
      valores.push(datos.activo ? 1 : 0)
    }

    if (campos.length > 0) {
      valores.push(clienteId)
      await connection.execute(`UPDATE clientes SET ${campos.join(", ")} WHERE id = ?`, valores)
    }

    if (datos.rutas) {
      await connection.execute('DELETE FROM clientes_rutas WHERE cliente_id = ?', [clienteId])

      for (const ruta of datos.rutas) {
        await connection.execute(
          `INSERT INTO clientes_rutas (
            cliente_id, ruta_id,
            dia_lunes, dia_martes, dia_miercoles,
            dia_jueves, dia_viernes, dia_sabado, dia_domingo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            clienteId,
            ruta.rutaId,
            ruta.dias.lunes ? 1 : 0,
            ruta.dias.martes ? 1 : 0,
            ruta.dias.miercoles ? 1 : 0,
            ruta.dias.jueves ? 1 : 0,
            ruta.dias.viernes ? 1 : 0,
            ruta.dias.sabado ? 1 : 0,
            ruta.dias.domingo ? 1 : 0,
          ],
        )
      }
    }

    await connection.commit()
    return { success: true }
  } catch (error) {
    await connection.rollback()
    console.error("Error al actualizar cliente:", error)
    throw error
  } finally {
    connection.release()
  }
}

export async function eliminarCliente(clienteId: string) {
  const connection = await getPool().getConnection()
  let startedTransaction = false
  try {
    const [rows]: any = await connection.query("SELECT id FROM clientes WHERE id = ?", [clienteId])
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, notFound: true }
    }

    await connection.beginTransaction()
    startedTransaction = true

    await connection.execute('DELETE FROM historial_credito WHERE cliente_id = ?', [clienteId])
    await connection.execute('DELETE FROM pedidos WHERE cliente_id = ?', [clienteId])
    await connection.execute('DELETE FROM clientes_extemporaneos WHERE cliente_id = ?', [clienteId])
    await connection.execute('DELETE FROM clientes_rutas WHERE cliente_id = ?', [clienteId])
    await connection.execute('DELETE FROM clientes WHERE id = ?', [clienteId])

    await connection.commit()
    return { success: true }
  } catch (error) {
    if (startedTransaction) {
      await connection.rollback()
    }
    console.error('Error al eliminar cliente:', error)
    throw error
  } finally {
    connection.release()
  }
}
// Añadir estas nuevas funciones al archivo lib/db.ts existente

// Función para buscar clientes por término (nombre, dirección o ID)
export async function buscarClientes(termino: string, excluirDia?: string) {
  // Construir la consulta base
  let sql = `
    SELECT c.id, c.local, c.direccion, c.lat, c.lng, c.isExtra
    FROM clientes c
    WHERE c.activo = 1 AND (
      c.local LIKE ? OR 
      c.direccion LIKE ? OR 
      c.id LIKE ?
    )
    AND c.id NOT IN (
      -- Excluir clientes que ya están asignados extemporáneamente hoy
      SELECT ce.cliente_id
      FROM clientes_extemporaneos ce
      WHERE ce.fecha = CURDATE()
    )
  `

  const params = [`%${termino}%`, `%${termino}%`, `%${termino}%`]

  // Si se especifica un día para excluir, añadir la condición
  if (excluirDia) {
    sql += `
      AND c.id NOT IN (
        SELECT cr.cliente_id
        FROM clientes_rutas cr
        WHERE cr.${excluirDia} = 1
      )
    `
  }

  sql += " ORDER BY c.local ASC LIMIT 20"

  const rows = await query(sql, params)
  return rows
}

// Función para obtener todos los clientes que NO están asignados a un día específico
export async function getClientesNoDia(excluirDia: string) {
  const sql = `
    SELECT c.id, c.local, c.direccion, c.lat, c.lng, c.isExtra
    FROM clientes c
    WHERE c.activo = 1
    AND c.id NOT IN (
      SELECT cr.cliente_id
      FROM clientes_rutas cr
      WHERE cr.${excluirDia} = 1
    )
    AND c.id NOT IN (
      -- Excluir clientes que ya están asignados extemporáneamente hoy
      SELECT ce.cliente_id
      FROM clientes_extemporaneos ce
      WHERE ce.fecha = CURDATE()
    )
    ORDER BY c.local ASC
  `

  const rows = await query(sql)
  return rows
}

// Función para obtener el primer cliente de una ruta (para calcular distancias)
export async function getPrimerClienteRuta(rutaId: string) {
  const diaActual = getDiaActualColumna()

  const [primerCliente]: any = await query(
    `
    SELECT c.id, c.lat, c.lng
    FROM clientes c
    INNER JOIN clientes_rutas cr ON c.id = cr.cliente_id
    WHERE cr.ruta_id = ? AND c.activo = 1 AND cr.${diaActual} = 1 AND c.isExtra = 0
    ORDER BY cr.orden ASC, c.local ASC
    LIMIT 1
    `,
    [rutaId],
  )

  return primerCliente || null
}

// Actualiza el orden de los clientes en una ruta específica
export async function actualizarOrdenClientesRuta(rutaId: string, clienteIds: string[]) {
  await ensureOrdenColumn()
  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()
    for (let i = 0; i < clienteIds.length; i++) {
      await connection.execute(
        `UPDATE clientes_rutas SET orden = ? WHERE cliente_id = ? AND ruta_id = ?`,
        [i + 1, clienteIds[i], rutaId],
      )
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    console.error("Error al actualizar orden de clientes:", error)
    throw error
  } finally {
    connection.release()
  }
}

// Función para crear un pedido extemporáneo
export async function crearPedidoExtemporaneo(clienteId: string, rutaId: string, esExtemporaneo = true) {
  const connection = await (await getPool()).getConnection()
  try {
    await connection.beginTransaction()

    // Obtener el día actual
    const diaActual = getDiaActualColumna()

    // Buscar todas las rutas del cliente
    const clienteRutas: any = await connection.execute(
      `SELECT ruta_id, ${diaActual} as dia_actual
       FROM clientes_rutas 
       WHERE cliente_id = ?`,
      [clienteId],
    )

    // Guardar todas las rutas originales del cliente
    let rutasOriginales = []
    if (clienteRutas && clienteRutas[0]) {
      rutasOriginales = clienteRutas[0].map((ruta: any) => ({
        rutaId: ruta.ruta_id,
        diaActual: ruta.dia_actual === 1,
      }))
    }

    // Convertir a JSON para almacenar en la base de datos
    const rutasOriginalesJSON = JSON.stringify(rutasOriginales)

    // 1. Verificar si ya existe una asignación para esta ruta hoy
    const [asignacionExistente]: any = await connection.execute(
      `
      SELECT id, rutero_id FROM asignaciones
      WHERE ruta_id = ? AND DATE(fecha) = CURDATE()
      ORDER BY fecha DESC
      LIMIT 1
      `,
      [rutaId],
    )

    let asignacionId

    if (asignacionExistente && asignacionExistente.length > 0 && asignacionExistente[0].id) {
      // Usar la asignación existente
      asignacionId = asignacionExistente[0].id
    } else {
      // Crear una nueva asignación con un rutero existente
      // Primero, obtener un rutero disponible (el primero activo)
      const [ruteros]: any = await connection.execute("SELECT id FROM ruteros WHERE activo = 1 LIMIT 1")

      if (!ruteros || ruteros.length === 0) {
        throw new Error(
          "No hay ruteros disponibles para asignar. Debe existir al menos un rutero activo en el sistema.",
        )
      }

      const ruteroId = ruteros[0].id

      // Crear la asignación con el rutero encontrado
      const [asignacionResult]: any = await connection.execute(
        "INSERT INTO asignaciones (ruta_id, rutero_id, fecha, estado) VALUES (?, ?, NOW(), 'pendiente')",
        [rutaId, ruteroId],
      )

      asignacionId = asignacionResult.insertId
    }

    // 2. Verificar si ya existe un pedido para este cliente en esta asignación
    const [pedidoExistente]: any = await connection.execute(
      "SELECT id FROM pedidos WHERE asignacion_id = ? AND cliente_id = ?",
      [asignacionId, clienteId],
    )

    if (pedidoExistente && pedidoExistente.length > 0 && pedidoExistente[0].id) {
      // Ya existe un pedido para este cliente en esta asignación
      await connection.commit()
      return {
        success: true,
        message: "El cliente ya tiene un pedido asignado para hoy",
        pedidoId: pedidoExistente[0].id,
      }
    }

    // 3. Crear el pedido con la información de rutas originales
    const [pedidoResult]: any = await connection.execute(
      `INSERT INTO pedidos (
        asignacion_id, cliente_id, 
        gourmet15, gourmet5, barraHielo, mediaBarra, premium, 
        es_extemporaneo, rutas_originales
      ) VALUES (?, ?, 0, 0, 0, 0, 0, ?, ?)`,
      [asignacionId, clienteId, esExtemporaneo ? 1 : 0, rutasOriginalesJSON],
    )

    await connection.commit()
    return {
      success: true,
      message: "Pedido extemporáneo creado correctamente solo para hoy",
      pedidoId: pedidoResult.insertId,
    }
  } catch (error) {
    await connection.rollback()
    console.error("Error al crear pedido extemporáneo:", error)
    throw error
  } finally {
    connection.release()
  }
}

// Nueva función para asignar un cliente extemporáneo a una ruta
export async function asignarClienteExtemporaneo(clienteId: string, rutaId: string) {
  try {
    // Insertar o actualizar la asignación extemporánea
    await query(
      `
      INSERT INTO clientes_extemporaneos (cliente_id, ruta_id, fecha)
      VALUES (?, ?, CURDATE())
      ON DUPLICATE KEY UPDATE ruta_id = ?
      `,
      [clienteId, rutaId, rutaId],
    )

    return {
      success: true,
      message: "Cliente asignado extemporáneamente a la ruta solo para hoy",
    }
  } catch (error) {
    console.error("Error al asignar cliente extemporáneo:", error)
    throw error
  }
}

// Función para limpiar clientes extemporáneos de días anteriores
export async function limpiarClientesExtemporaneos() {
  try {
    const result = await query(
      `
      DELETE FROM clientes_extemporaneos
      WHERE fecha < CURDATE()
      `,
    )

    return {
      success: true,
      affectedRows: result.affectedRows || 0,
    }
  } catch (error) {
    console.error("Error al limpiar clientes extemporáneos:", error)
    throw error
  }
}

// ===== FUNCIONES PARA SALIDAS DE EFECTIVO =====

// Interfaces para salidas de efectivo
interface SalidaEfectivoFilters {
  rutero_id?: number
  fecha_desde?: string | null
  fecha_hasta?: string | null
}

interface CreateSalidaEfectivo {
  rutero_id: number
  motivo: string
  monto: number
}

// CORREGIDA: Función para obtener salidas de efectivo con manejo correcto de zona horaria
export async function getSalidasEfectivo(filters: SalidaEfectivoFilters = {}) {
  try {
    let sql = `
      SELECT 
        se.id,
        se.rutero_id,
        r.nombre as rutero_nombre,
        se.fecha,
        se.motivo,
        CAST(se.monto AS DECIMAL(10,2)) as monto,
        se.fecha_creacion,
        se.fecha_actualizacion
      FROM salidas_efectivo se
      INNER JOIN ruteros r ON se.rutero_id = r.id
      WHERE 1=1
    `

    const params: any[] = []

    if (filters.rutero_id) {
      sql += " AND se.rutero_id = ?"
      params.push(filters.rutero_id)
    }

    // CORREGIDO: Usar CONVERT_TZ para manejar zona horaria correctamente
    // Convertir de UTC a zona horaria local de México (UTC-6)
    if (filters.fecha_desde) {
      sql += " AND DATE(CONVERT_TZ(se.fecha_creacion, '+00:00', '-06:00')) >= ?"
      params.push(filters.fecha_desde)
    }

    if (filters.fecha_hasta) {
      sql += " AND DATE(CONVERT_TZ(se.fecha_creacion, '+00:00', '-06:00')) <= ?"
      params.push(filters.fecha_hasta)
    }

    sql += " ORDER BY se.fecha_creacion DESC"

    const rows: any = await query(sql, params)

    // Asegurar que los montos sean números
    return rows.map((row: any) => ({
      ...row,
      monto: Number.parseFloat(row.monto) || 0,
    }))
  } catch (error) {
    console.error("Error al obtener salidas de efectivo:", error)
    throw error
  }
}

// CORREGIDA: Función para crear una nueva salida de efectivo con zona horaria local
export async function createSalidaEfectivo(data: CreateSalidaEfectivo) {
  const connection = await (await getPool()).getConnection()

  try {
    await connection.beginTransaction()

    // Verificar que el rutero existe y está activo
    const [ruteroRows]: any = await connection.execute("SELECT id FROM ruteros WHERE id = ? AND activo = 1", [
      data.rutero_id,
    ])

    if (!ruteroRows || ruteroRows.length === 0) {
      throw new Error("Repartidor no encontrado o inactivo")
    }

    // CORREGIDO: Insertar con zona horaria local de México
    const [result]: any = await connection.execute(
      `INSERT INTO salidas_efectivo (rutero_id, fecha, motivo, monto, fecha_creacion, fecha_actualizacion) 
       VALUES (?, CONVERT_TZ(NOW(), '+00:00', '-06:00'), ?, ?, 
               CONVERT_TZ(NOW(), '+00:00', '-06:00'), 
               CONVERT_TZ(NOW(), '+00:00', '-06:00'))`,
      [data.rutero_id, data.motivo, data.monto],
    )

    await connection.commit()
    return result.insertId
  } catch (error) {
    await connection.rollback()
    console.error("Error al crear salida de efectivo:", error)
    throw error
  } finally {
    connection.release()
  }
}



