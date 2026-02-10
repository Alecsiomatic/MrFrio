"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    if (loading) return
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.replace('/login')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant='ghost' size='sm' onClick={handleLogout} disabled={loading}>
      {loading ? 'Cerrando...' : 'Cerrar sesion'}
    </Button>
  )
}
