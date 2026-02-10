"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { Activity, Eye, Loader2, Lock, MapPin, Pencil, Phone, RefreshCcw, Settings2, ShieldCheck, Store, Truck, UserPlus, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type RoleOption = "admin" | "rutero" | "visor"

type PanelUser = {
  id: number
  name: string
  email: string
  role: RoleOption
  active: boolean
}

type CurrentUser = {
  id: string
  name: string
  role: "ADMIN" | "REPARTIDOR" | "SUPERVISOR"
}

type PanelClient = {
  id: string
  nombre: string
  direccion: string
  telefono: string
  activo: boolean
}

const ROLE_LABELS: Record<RoleOption, string> = {
  admin: "Admin",
  rutero: "Rutero",
  visor: "Visor",
}

const ROLE_CARD_DETAILS: Record<
  RoleOption,
  { title: string; description: string; accent: string; Icon: LucideIcon }
> = {
  admin: {
    title: "Administradores",
    description: "Control total de configuraciones y reportes.",
    accent: "text-emerald-300",
    Icon: ShieldCheck,
  },
  rutero: {
    title: "Ruteros",
    description: "Acceso operativo para rutas y entregas.",
    accent: "text-cyan-300",
    Icon: Truck,
  },
  visor: {
    title: "Visores",
    description: "Visualizan reportes y el estado general.",
    accent: "text-blue-300",
    Icon: Eye,
  },
}

const STATUS_STYLES = {
  activo: "bg-emerald-500/10 text-emerald-200 border border-emerald-500/30",
  inactivo: "bg-amber-500/10 text-amber-200 border border-amber-500/30",
}

export interface AdminPanelProps {
  currentUser: CurrentUser
  users: PanelUser[]
}

export function AdminPanel({ currentUser, users: initialUsers }: AdminPanelProps) {
  const router = useRouter()
  const [users, setUsers] = useState<PanelUser[]>(initialUsers)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<RoleOption>("rutero")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const [clients, setClients] = useState<PanelClient[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientSearch, setClientSearch] = useState("")
  const [userSearch, setUserSearch] = useState("")

  const canManageUsers = currentUser.role === "ADMIN"

  const fetchClients = useCallback(async () => {
    if (!canManageUsers) {
      setClients([])
      setClientsLoading(false)
      return
    }

    setClientsLoading(true)
    try {
      const response = await fetch('/api/clientes/admin')
      const data = await response.json()

      if (!response.ok) {
        const message = (data && typeof data.error === "string") ? data.error : 'Error al obtener clientes'
        throw new Error(message)
      }

      const parsed = Array.isArray(data)
        ? data.map((cliente: any) => ({
            id: String(cliente.id),
            nombre: typeof cliente.nombre === 'string' ? cliente.nombre : '',
            direccion: typeof cliente.direccion === 'string' ? cliente.direccion : '',
            telefono: typeof cliente.telefono === 'string' ? cliente.telefono : '',
            activo: Boolean(cliente.activo),
          }))
        : []

      setClients(parsed)
    } catch (error) {
      console.error('Error al obtener clientes:', error)
      toast.error(error instanceof Error ? error.message : 'Error al obtener clientes')
    } finally {
      setClientsLoading(false)
    }
  }, [canManageUsers])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase()
    if (!term) return clients
    return clients.filter((cliente) => {
      const fields = [cliente.nombre, cliente.direccion, cliente.telefono]
      return fields.some((field) => field.toLowerCase().includes(term))
    })
  }, [clientSearch, clients])

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) => {
      const fields = [user.name, user.email, ROLE_LABELS[user.role]]
      return fields.some((field) => field.toLowerCase().includes(term))
    })
  }, [users, userSearch])

  const stats = useMemo(() => {
    const totals = {
      total: users.length,
      byRole: {
        admin: 0,
        rutero: 0,
        visor: 0,
      } as Record<RoleOption, number>,
      inactive: users.filter((user) => !user.active).length,
    }
    users.forEach((user) => {
      totals.byRole[user.role] = (totals.byRole[user.role] || 0) + 1
    })

    return totals
  }, [users])

  const handleCreateUser = async () => {
    if (!canManageUsers || loading) return
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Completa nombre, correo y contrasena")
      return
    }
    if (password.length < 6) {
      toast.error("La contrasena debe tener al menos 6 caracteres")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Las contrasenas no coinciden")
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          password,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || "No se pudo crear el usuario")
      }

      const data = await response.json()
      const newUser: PanelUser = {
        id: data.user.id,
        name: data.user.nombre,
        email: data.user.email,
        role: data.user.role,
        active: !!data.user.is_active,
      }

      setUsers((prev) => [newUser, ...prev])
      setName("")
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setRole("rutero")
      toast.success("Usuario creado")
    } catch (error: any) {
      toast.error(error?.message || "Error al crear usuario")
    } finally {
      setLoading(false)
    }
  }

  const handleClientEdit = (clienteId: string) => {
    if (!canManageUsers) return
    router.push(`/clientes/${clienteId}/editar`)
  }

  const handleRefreshClients = () => {
    if (!clientsLoading) {
      fetchClients()
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-black via-slate-950 to-slate-900 text-white">
      <Toaster position="top-right" richColors />
      <div className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay" />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center">
          <Image src="/mrfrio-logo.png" alt="Mr Frio" width={260} height={70} className="h-auto w-56" priority />
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-blue-200/80">Panel administrativo</p>
            <h1 className="text-3xl font-semibold md:text-4xl">Control central de operaciones</h1>
            <p className="text-sm text-slate-200/80">
              Gestiona usuarios y revisa el estado de accesos segun tu rol.
            </p>
          </div>
          {!canManageUsers ? (
            <p className="rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-slate-200">
              Acceso de solo lectura
            </p>
          ) : null}
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-white/10 bg-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Usuarios totales</CardTitle>
              <Users className="h-5 w-5 text-blue-300" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.total}</div>
              <p className="text-xs text-slate-200/70">Personas con acceso al sistema</p>
            </CardContent>
          </Card>

          {(Object.keys(ROLE_CARD_DETAILS) as RoleOption[]).map((option) => {
            const { title, description, accent, Icon } = ROLE_CARD_DETAILS[option]
            return (
              <Card key={option} className="border-white/10 bg-white/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">{title}</CardTitle>
                  <Icon className={`h-5 w-5 ${accent}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{stats.byRole[option]}</div>
                  <p className="text-xs text-slate-200/70">{description}</p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card className="border-white/10 bg-black/40">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-xl">Directorio de usuarios</CardTitle>
                <CardDescription className="text-slate-300">
                  Consulta y gestiona los accesos del equipo desde un solo lugar.
                </CardDescription>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <Input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Buscar usuario o correo"
                  className="border-white/20 bg-black/40 text-white placeholder:text-slate-400 sm:w-64"
                  disabled={!canManageUsers}
                />
                <span className="text-sm text-slate-300 sm:text-right">
                  {stats.inactive > 0 ? (
                    <span>{stats.inactive} usuarios inactivos</span>
                  ) : (
                    <span>Todos los usuarios activos</span>
                  )}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-white/10">
                {filteredUsers.length ? (
                  <div className="max-h-[360px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/5">
                          <TableHead className="text-slate-200">Usuario</TableHead>
                          <TableHead className="hidden text-slate-200 md:table-cell">Correo</TableHead>
                          <TableHead className="text-right text-slate-200">Rol</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                            <TableCell className="text-white">
                              <div className="flex flex-col">
                                <span className="font-medium">{user.name}</span>
                                <span className="mt-1 text-xs text-slate-300 md:hidden">{user.email}</span>
                                <span
                                  className={`mt-2 w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    user.active ? STATUS_STYLES.activo : STATUS_STYLES.inactivo
                                  }`}
                                >
                                  {user.active ? "Activo" : "Inactivo"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden text-slate-300 md:table-cell">{user.email}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="border border-blue-500/40 bg-blue-500/15 text-[10px] uppercase tracking-wide text-blue-200">
                                {ROLE_LABELS[user.role]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-slate-300">
                    {userSearch ? "No se encontraron usuarios con el filtro aplicado" : "No hay usuarios registrados"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-xl">Alta de usuarios</CardTitle>
              <CardDescription className="text-slate-300">
                {canManageUsers
                  ? "Registra nuevos integrantes y asigna su rol de acceso"
                  : "Solo los administradores pueden dar de alta usuarios"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Maria Torres"
                  className="border-white/20 bg-black/40 text-white placeholder:text-slate-400"
                  disabled={!canManageUsers}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo institucional</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nombre@mrfrio.mx"
                  className="border-white/20 bg-black/40 text-white placeholder:text-slate-400"
                  disabled={!canManageUsers}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contrasena temporal</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo 6 caracteres"
                  className="border-white/20 bg-black/40 text-white placeholder:text-slate-400"
                  disabled={!canManageUsers}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite la contrasena"
                  className="border-white/20 bg-black/40 text-white placeholder:text-slate-400"
                  disabled={!canManageUsers}
                />
              </div>

              <div className="space-y-2">
                <Label>Rol del usuario</Label>
                <Select value={role} onValueChange={(value) => setRole(value as RoleOption)} disabled={!canManageUsers}>
                  <SelectTrigger className="border-white/20 bg-black/40 text-white">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white">
                    {(Object.keys(ROLE_LABELS) as RoleOption[]).map((option) => (
                      <SelectItem key={option} value={option} className="text-white">
                        {ROLE_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateUser} className="w-full" disabled={!canManageUsers || loading}>
                <UserPlus className="mr-2 h-4 w-4" /> {loading ? "Creando..." : "Crear usuario"}
              </Button>

              <Separator className="bg-white/10" />

              <div className="space-y-3 text-sm text-slate-300">
                <p className="font-medium text-white">Roles disponibles</p>
                <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/30 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Admin</p>
                    <p className="text-xs text-slate-300">
                      Acceso completo a administracion, configuraciones y reportes.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/30 p-3">
                  <Truck className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Rutero</p>
                    <p className="text-xs text-slate-300">
                      Enfocado en rutas, seguimiento y confirmacion de entregas.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/30 p-3">
                  <Activity className="mt-0.5 h-4 w-4 text-blue-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Visor</p>
                    <p className="text-xs text-slate-300">
                      Observa indicadores y reportes sin permisos operativos.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        {canManageUsers ? (
          <section className="space-y-4">
            <Card className="border-white/10 bg-black/40">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Store className="h-5 w-5 text-blue-300" /> Control de clientes
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Revisa tus clientes y entra a su ficha para actualizar sus datos.
                  </CardDescription>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Input
                    value={clientSearch}
                    onChange={(event) => setClientSearch(event.target.value)}
                    placeholder="Buscar cliente o direccion"
                    className="border-white/20 bg-black/40 text-white placeholder:text-slate-400 sm:w-60"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshClients}
                    disabled={clientsLoading}
                    className="border-white/20 px-3 text-slate-200 hover:bg-white/10"
                  >
                    {clientsLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
                        Actualizando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <RefreshCcw className="h-4 w-4 text-blue-300" />
                        Actualizar
                      </span>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {clientsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-slate-300">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-300" />
                    Cargando clientes...
                  </div>
                ) : filteredClients.length ? (
                  <div className="rounded-lg border border-white/10">
                    <div className="max-h-[420px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/5">
                            <TableHead className="text-slate-200">Cliente</TableHead>
                            <TableHead className="hidden text-slate-200 md:table-cell">Detalles</TableHead>
                            <TableHead className="text-right text-slate-200">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredClients.map((cliente) => (
                            <TableRow key={cliente.id} className="border-white/5 hover:bg-white/5">
                              <TableCell className="text-white">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">{cliente.nombre || "Sin nombre"}</span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                      cliente.activo ? STATUS_STYLES.activo : STATUS_STYLES.inactivo
                                    }`}
                                  >
                                    {cliente.activo ? "Activo" : "Inactivo"}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-slate-300 md:hidden">
                                  <div className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 text-blue-300" />
                                    <span>{cliente.direccion || "Sin direccion registrada"}</span>
                                  </div>
                                  <div className="mt-1 flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-blue-300" />
                                    <span>{cliente.telefono || "Sin telefono"}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden text-sm text-slate-300 md:table-cell">
                                <div className="flex flex-col gap-1">
                                  <span className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 text-blue-300" />
                                    <span className="line-clamp-2">{cliente.direccion || "Sin direccion registrada"}</span>
                                  </span>
                                  <span className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-blue-300" />
                                    <span>{cliente.telefono || "Sin telefono"}</span>
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleClientEdit(cliente.id)}
                                  className="border-white/20 px-3 text-slate-200 hover:bg-white/10"
                                >
                                  <Pencil className="mr-1 h-4 w-4" /> Editar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-white/10 py-12 text-center text-sm text-slate-300">
                    {clientSearch ? "No se encontraron clientes con el filtro aplicado" : "No hay clientes registrados"}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        ) : null
}

        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border-white/10 bg-black/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-blue-300" /> Seguridad y accesos
              </CardTitle>
              <CardDescription className="text-slate-300">
                Define politicas de contrasenas, doble factor y reglas de cierre de sesion.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-white/10 bg-black/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5 text-blue-300" /> Integraciones del sistema
              </CardTitle>
              <CardDescription className="text-slate-300">
                Conecta herramientas externas para automatizar reportes y sincronizar datos.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/80 py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-300">
          Copyright (c) 2025 Mr Frio de San Luis - Hielo Gourmet. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}
