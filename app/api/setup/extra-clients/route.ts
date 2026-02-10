import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    // Leer el archivo SQL
    const sqlFilePath = path.join(process.cwd(), "add-extra-clients.sql")
    let sqlContent = ""

    // Verificar si el archivo existe
    if (fs.existsSync(sqlFilePath)) {
      sqlContent = fs.readFileSync(sqlFilePath, "utf8")
    } else {
      // Si el archivo no existe, usar el SQL embebido
      sqlContent = `
        -- Primero, asegurémonos de que existen los clientes extra para cada ruta
        INSERT IGNORE INTO clientes (id, local, direccion, lat, lng, isExtra, activo)
        VALUES
        ('extra_101', 'Extra 101', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE, TRUE),
        ('extra_102', 'Extra 102', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE, TRUE),
        ('extra_103', 'Extra 103', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE, TRUE),
        ('extra_104', 'Extra 104', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE, TRUE),
        ('extra_105', 'Extra 105', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE, TRUE),
        ('extra_106', 'Extra 106', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE, TRUE),
        ('extra_107', 'Extra 107', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE, TRUE),
        ('extra_local', 'Extra LOCAL', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE, TRUE);

        -- Ahora, asegurémonos de que cada cliente extra está asignado a su ruta correspondiente
        -- Ruta 101
        INSERT IGNORE INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes, dia_sabado, dia_domingo)
        VALUES ('extra_101', '101', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

        -- Ruta 102
        INSERT IGNORE INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes, dia_sabado, dia_domingo)
        VALUES ('extra_102', '102', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

        -- Ruta 103
        INSERT IGNORE INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes, dia_sabado, dia_domingo)
        VALUES ('extra_103', '103', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

        -- Ruta 104
        INSERT IGNORE INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes, dia_sabado, dia_domingo)
        VALUES ('extra_104', '104', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

        -- Ruta 105
        INSERT IGNORE INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes, dia_sabado, dia_domingo)
        VALUES ('extra_105', '105', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

        -- Ruta 106
        INSERT IGNORE INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes, dia_sabado, dia_domingo)
        VALUES ('extra_106', '106', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

        -- Ruta 107
        INSERT IGNORE INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes, dia_sabado, dia_domingo)
        VALUES ('extra_107', '107', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

        -- Ruta LOCAL
        INSERT IGNORE INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes, dia_sabado, dia_domingo)
        VALUES ('extra_local', 'LOCAL', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);
      `
    }

    // Dividir el contenido en consultas individuales
    const queries = sqlContent
      .split(";")
      .filter((query) => query.trim() !== "")
      .map((query) => query.trim() + ";")

    // Ejecutar cada consulta
    for (const sql of queries) {
      await query(sql)
    }

    return NextResponse.json({
      success: true,
      message: "Clientes extra configurados correctamente",
    })
  } catch (error) {
    console.error("Error al configurar clientes extra:", error)
    return NextResponse.json({ error: "Error al configurar clientes extra", details: error }, { status: 500 })
  }
}
