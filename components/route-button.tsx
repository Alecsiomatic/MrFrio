"use client"

import { useState, useEffect } from "react"
import { Truck, History, Loader2 } from "lucide-react"
import { RouteInventoryModal } from "./route-inventory-modal"
import { useToast } from "./toast-notification"
import { getDiaActualNombre } from "@/lib/utils-client"

type RouteButtonProps = {
  route: string
  clients?: string
  special?: boolean
}

type Cliente = {
  id: string
  local: string
  direccion: string
  isExtra?: boolean
}

export function RouteButton({ route, clients, special = false }: RouteButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [clientCount, setClientCount] = useState<number | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [diaActual, setDiaActual] = useState("")
  const { showToast } = useToast()

  // Obtener el día actual
  useEffect(() => {
    setDiaActual(getDiaActualNombre())
  }, [])

  // Cargar el número de clientes para esta ruta
  useEffect(() => {
    async function fetchClientCount() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/clientes/ruta/${route}/count`)
        if (response.ok) {
          const data = await response.json()
          setClientCount(data.count)
        } else {
          console.error(`Error al obtener el conteo de clientes para la ruta ${route}`)
        }
      } catch (error) {
        console.error(`Error al obtener el conteo de clientes para la ruta ${route}:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchClientCount()
  }, [route])

  // Cargar los clientes cuando se abre el modal (solo una vez por apertura)
  useEffect(() => {
    if (isModalOpen && !dataLoaded) {
      async function fetchClientes() {
        try {
          const response = await fetch(`/api/clientes/ruta/${route}`)
          if (response.ok) {
            const data = await response.json()
            setClientes(data)
            setDataLoaded(true)
          } else {
            console.error(`Error al obtener clientes para la ruta ${route}`)
            showToast(`Error al cargar los clientes de la ruta ${route}`, "error")
          }
        } catch (error) {
          console.error(`Error al obtener clientes para la ruta ${route}:`, error)
          showToast(`Error al cargar los clientes de la ruta ${route}`, "error")
        }
      }

      fetchClientes()
    }
  }, [isModalOpen, route, showToast, dataLoaded])

  // Reiniciar el estado cuando se cierra el modal
  useEffect(() => {
    if (!isModalOpen) {
      setDataLoaded(false)
    }
  }, [isModalOpen])

  // Función para abrir el modal
  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`
          group relative overflow-hidden border border-gray-700/50 rounded-xl p-6
          flex flex-col items-center justify-center gap-2
          hover:border-blue-500/50 transition-all duration-300
          backdrop-blur-sm bg-black/40
          w-full ${special ? "bg-gradient-to-r from-black/60 to-blue-900/20 py-8" : ""}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-blue-500/10 rounded-full p-3 mb-3 group-hover:bg-blue-500/20 transition-colors duration-300">
            {special ? (
              <History className="h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
            ) : (
              <Truck className="h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
            )}
          </div>

          <span className="text-2xl font-bold text-white mb-1 group-hover:text-blue-200 transition-colors duration-300">
            Ruta {route}
          </span>

          {special ? (
            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
              Historial de sobrantes
            </span>
          ) : (
            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Cargando...
                </span>
              ) : (
                `${clientCount ?? clients ?? "0"} clientes asignados`
              )}
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </button>

      <RouteInventoryModal
        routeId={route}
        routeName={route}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        clientes={clientes}
        diaActual={diaActual}
      />
    </>
  )
}
