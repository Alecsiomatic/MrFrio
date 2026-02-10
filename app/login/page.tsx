"use client"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Credenciales invalidas')
      }

      const target = typeof data?.next === 'string' && data.next ? data.next : next
      router.replace(target)
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Error de autenticacion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      {/* Header with background effect */}
      <div className="relative">
        <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay pointer-events-none" />
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex justify-center">
            <Image src="/mrfrio-logo.png" alt="Mr. Frio de San Luis" width={320} height={64} className="drop-shadow-lg" />
          </div>
        </div>
      </div>

      {/* Main Content styled like other pages */}
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="relative overflow-hidden border border-gray-700/50 rounded-xl p-8 mb-10 backdrop-blur-sm bg-black/40 max-w-lg mx-auto">
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex flex-col items-center gap-2 mb-6">
              <h1 className="text-3xl font-bold text-center">Iniciar sesion</h1>
              <p className="text-sm text-gray-400">Accede con tu correo y contrasena</p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Correo</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Contrasena</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button disabled={loading} className="w-full" type="submit">
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer, like other views */}
      <footer className="bg-black/80 border-t border-gray-800 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>2025 Mr. Frio de San Luis - Hielo Gourmet. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
