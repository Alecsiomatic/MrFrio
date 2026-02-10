"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Search, Store, User, X, Loader2 } from "lucide-react"

type Cliente = {
  id: string
  nombre: string
  direccion: string
  telefono?: string
  isExtra?: boolean
}

type ClienteSearchProps = {
  onSelect: (cliente: Cliente) => void
  selectedClienteId?: string | null
}

export function ClienteSearch({ onSelect, selectedClienteId }: ClienteSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Manejar clic fuera del dropdown para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Limpiar el timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Cargar el cliente seleccionado si se proporciona un ID
  useEffect(() => {
    if (selectedClienteId) {
      const fetchCliente = async () => {
        try {
          const response = await fetch(`/api/clientes/buscar-todos?term=${selectedClienteId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.length > 0) {
              const clienteFound = data.find((c: Cliente) => c.id === selectedClienteId)
              if (clienteFound) {
                setSelectedCliente(clienteFound)
              }
            }
          }
        } catch (error) {
          console.error("Error al obtener cliente:", error)
        }
      }

      fetchCliente()
    } else {
      setSelectedCliente(null)
    }
  }, [selectedClienteId])

  // Buscar clientes cuando cambia el término de búsqueda
  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      setClientes([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/clientes/buscar-todos?term=${encodeURIComponent(term)}`)
      if (response.ok) {
        const data = await response.json()
        setClientes(data)
      } else {
        setClientes([])
      }
    } catch (error) {
      console.error("Error al buscar clientes:", error)
      setClientes([])
    } finally {
      setIsSearching(false)
    }
  }

  // Manejar cambio en el input de búsqueda
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    // Limpiar el timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Configurar un nuevo timeout para la búsqueda
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value)
    }, 300)

    // Mostrar el dropdown si hay texto
    setIsDropdownOpen(!!value.trim())
  }

  // Manejar la selección de un cliente
  const handleClienteSelect = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setSearchTerm("")
    setIsDropdownOpen(false)
    onSelect(cliente)
  }

  // Limpiar la selección
  const handleClearSelection = () => {
    setSelectedCliente(null)
    setSearchTerm("")
    onSelect({ id: "", nombre: "", direccion: "" })
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="relative w-full">
      {/* Input de búsqueda */}
      {!selectedCliente ? (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => searchTerm.trim() && setIsDropdownOpen(true)}
            className="pl-10 pr-10 py-2 w-full border border-gray-700 bg-gray-900 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Buscar cliente por nombre, dirección o teléfono..."
          />
          {isSearching && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center p-2 border border-gray-700 bg-gray-800 rounded-lg">
          <div className="flex-grow flex items-center">
            <Store className="h-4 w-4 text-blue-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-white">{selectedCliente.nombre}</p>
              <p className="text-xs text-gray-400">{selectedCliente.direccion}</p>
            </div>
          </div>
          <button
            onClick={handleClearSelection}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
            type="button"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* Dropdown de resultados */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 border border-gray-700 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {clientes.length > 0 ? (
            <ul className="divide-y divide-gray-700">
              {clientes.map((cliente) => (
                <li
                  key={cliente.id}
                  className="p-2 hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => handleClienteSelect(cliente)}
                >
                  <div className="flex items-center">
                    {cliente.isExtra ? (
                      <Store className="h-4 w-4 text-blue-400 mr-2" />
                    ) : (
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">{cliente.nombre}</p>
                      <p className="text-xs text-gray-400">{cliente.direccion}</p>
                      {cliente.telefono && <p className="text-xs text-gray-500">{cliente.telefono}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : searchTerm.trim() && !isSearching ? (
            <div className="p-4 text-center text-gray-400">No se encontraron clientes</div>
          ) : null}
        </div>
      )}
    </div>
  )
}
