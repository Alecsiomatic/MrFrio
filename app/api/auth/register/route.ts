import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { toDbRole } from '@/auth.config'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const nombre = String(body?.nombre || '').trim()
    const password = String(body?.password || '')
    const role = toDbRole(body?.role || 'RUTERO')

    if (!email || !password || !nombre) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const [countRow]: any = await query('SELECT COUNT(*) as count FROM usuarios')
    if (Number(countRow.count) > 0) {
      return NextResponse.json({ error: 'Registro deshabilitado' }, { status: 403 })
    }

    const hash = await bcrypt.hash(password, 10)

    await query(
      'INSERT INTO usuarios (email, nombre, role, password_hash, is_active) VALUES (?, ?, ?, ?, 1)',
      [email, nombre, role, hash],
    )

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'El email ya existe' }, { status: 409 })
    }
    console.error('Error en registro', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
