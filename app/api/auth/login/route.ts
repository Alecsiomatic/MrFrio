import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/auth'
import { toAppRole } from '@/auth.config'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    if (!email || !password) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const rows: any = await query(
      'SELECT id, email, nombre, role, password_hash, is_active, rutero_id FROM usuarios WHERE email = ? LIMIT 1',
      [email],
    )
    if (!rows?.length) {
      return NextResponse.json({ error: 'Usuario o contrasena invalidos' }, { status: 401 })
    }
    const user = rows[0]
    if (!user.is_active) {
      return NextResponse.json({ error: 'Usuario inactivo' }, { status: 403 })
    }
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return NextResponse.json({ error: 'Usuario o contrasena invalidos' }, { status: 401 })
    }

    const role = toAppRole(user.role)
    const ruteroId = user.rutero_id === null || user.rutero_id === undefined ? null : Number(user.rutero_id)

    await createSession({
      id: String(user.id),
      email: String(user.email),
      name: String(user.nombre || ''),
      nombre: String(user.nombre || ''),
      role,
      ruteroId: Number.isFinite(ruteroId) ? ruteroId : null,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Error en login', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
