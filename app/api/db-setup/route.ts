import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    // Leer el archivo SQL
    const sqlFilePath = path.join(process.cwd(), "schema.sql")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

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
      message: "Base de datos configurada correctamente",
    })
  } catch (error) {
    console.error("Error al configurar la base de datos:", error)
    return NextResponse.json({ error: "Error al configurar la base de datos", details: error }, { status: 500 })
  }
}
