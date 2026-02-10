"use client"

import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import { ProtectedRoute, ROLE_ALLOWED_PATHS, UserRole, getDefaultRouteForRole } from "@/components/protected-route"

interface ProtectedRoutesProps {
  userRole: UserRole
  basename?: string
}

const ROUTE_TITLES: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Panel de control",
    description: "Resumen general del negocio, KPIs clave y accesos rapidos.",
  },
  "/usuarios": {
    title: "Gestion de usuarios",
    description: "Administracion de cuentas, asignacion de roles y control de acceso.",
  },
  "/seguimiento": {
    title: "Seguimiento de rutas",
    description: "Estado de entregas en tiempo real y comunicacion con ruteros.",
  },
}

const ROLE_TITLES: Record<UserRole, string> = {
  admin: "Admin",
  rutero: "Rutero",
  visor: "Visor",
}

export function ProtectedRoutes({ userRole, basename }: ProtectedRoutesProps) {
  const defaultRoute = getDefaultRouteForRole(userRole)

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        <Route element={<ProtectedRoute userRole={userRole} />}>
          <Route element={<AppLayout userRole={userRole} />}>
            <Route path="dashboard" element={<SectionView path="/dashboard" />} />
            <Route path="usuarios" element={<SectionView path="/usuarios" />} />
            <Route path="seguimiento" element={<SectionView path="/seguimiento" />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

const AppLayout = ({ userRole }: { userRole: UserRole }) => {
  const location = useLocation()
  const allowedPaths = ROLE_ALLOWED_PATHS[userRole] ?? []

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-900 px-6 py-10 text-gray-100">
      <header className="mx-auto w-full max-w-5xl rounded-3xl bg-white/5 px-8 py-6 shadow-lg shadow-black/40 ring-1 ring-white/10 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-blue-300/70">Portal protegido</p>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">Bienvenido, rol {ROLE_TITLES[userRole]}</h1>
            <p className="text-sm text-gray-300">
              Solo veras las secciones que tu rol tiene autorizadas.
            </p>
          </div>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2">
          {allowedPaths.map((path) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                location.pathname === path ? "bg-blue-500 text-white shadow" : "bg-white/5 text-gray-200 hover:bg-white/10"
              }`}
            >
              {ROUTE_TITLES[path]?.title ?? path.replace("/", "")}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-start">
        <div className="w-full rounded-3xl border border-white/10 bg-black/40 p-10 shadow-inner shadow-black/30">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

const SectionView = ({ path }: { path: string }) => {
  const section = ROUTE_TITLES[path]

  if (!section) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-semibold text-white">{section.title}</h2>
        <p className="text-base text-gray-300">{section.description}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left text-sm text-gray-300">
        <p>
          Esta vista es un ejemplo de como proteger rutas usando <code className="rounded bg-black/50 px-1 py-0.5">react-router-dom</code>. Cambia el
          rol del usuario para ver como se actualiza el menu de navegacion y las rutas accesibles.
        </p>
      </div>
    </div>
  )
}
