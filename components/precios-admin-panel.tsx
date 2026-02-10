"use client"

import { useState, useEffect } from "react"
import { DollarSign, Loader2, Save, Search, User, Tag, Check, X } from "lucide-react"
import { useToast } from "./toast-notification"

type Producto = {
  id: string
  nombre: string
  precio_base: number
}

type Cliente = {
  id: string
  local: string
}

type PreciosCliente = {
  clienteId: string
  nombreCliente: string
  precios: {
    [key: string]: {
      precioBase: number
      precioPersonalizado: number | null
    }
  }
}

export function PreciosAdminPanel() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("")
  const [preciosCliente, setPreciosCliente] = useState<PreciosCliente | null>(null)
  const [preciosEditados, setPreciosEditados] = useState<{ [key: string]: number | null }>({})
  const [isLoadingProductos, setIsLoadingProductos] = useState(false)
  const [isLoadingClientes, setIsLoadingClientes] = useState(false)
  const [isLoadingPrecios, setIsLoadingPrecios] = useState(false)
  const [isGuardando, setIsGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [editandoPrecioBase, setEditandoPrecioBase] = useState<string | null>(null)
  const [nuevoPrecioBase, setNuevoPrecioBase] = useState<string>("")
  const { showToast } = useToast()

  // Cargar productos y clientes al montar el componente
  useEffect(() => {
    cargarProductos()
    cargarClientes()
  }, [])

  // Cargar precios del cliente cuando se selecciona uno
  useEffect(() => {
    if (clienteSeleccionado) {
      cargarPreciosCliente(clienteSeleccionado)
    } else {
      setPreciosCliente(null)
      setPreciosEditados({})
    }
  }, [clienteSeleccionado])

  // Cargar productos
  const cargarProductos = async () => {
    setIsLoadingProductos(true)
    try {
      const response = await fetch("/api/productos/precios")
      if (response.ok) {
        const data = await response.json()
        setProductos(data)
      } else {
        showToast("Error al cargar los productos", "error")
      }
    } catch (error) {
      console.error("Error al cargar productos:", error)
      showToast("Error al cargar los productos", "error")
    } finally {
      setIsLoadingProductos(false)
    }
  }

  // Cargar clientes
  const cargarClientes = async () => {
    setIsLoadingClientes(true)
    try {
      const response = await fetch("/api/clientes/lista")
      if (response.ok) {
        const data = await response.json()
        setClientes(data)
      } else {
        showToast("Error al cargar los clientes", "error")
      }
    } catch (error) {
      console.error("Error al cargar clientes:", error)
      showToast("Error al cargar los clientes", "error")
    } finally {
      setIsLoadingClientes(false)
    }
  }

  // Cargar precios del cliente
  const cargarPreciosCliente = async (clienteId: string) => {
    setIsLoadingPrecios(true)
    try {
      const response = await fetch(`/api/clientes/precios?clienteId=${clienteId}`)
      if (response.ok) {
        const data = await response.json()
        setPreciosCliente(data)
        // Inicializar los precios editados con los valores actuales
        const preciosIniciales: { [key: string]: number | null } = {}
        Object.keys(data.precios).forEach((productoId) => {
          preciosIniciales[productoId] = data.precios[productoId].precioPersonalizado
        })
        setPreciosEditados(preciosIniciales)
      } else {
        showToast("Error al cargar los precios del cliente", "error")
      }
    } catch (error) {
      console.error("Error al cargar precios del cliente:", error)
      showToast("Error al cargar los precios del cliente", "error")
    } finally {
      setIsLoadingPrecios(false)
    }
  }

  // Manejar cambio en el precio personalizado
  const handlePrecioChange = (productoId: string, valor: string) => {
    // Si el valor está vacío, establecer como null (usar precio base)
    const nuevoPrecio = valor === "" ? null : Number.parseFloat(valor)
    setPreciosEditados((prev) => ({
      ...prev,
      [productoId]: nuevoPrecio,
    }))
  }

  // Guardar precios personalizados
  const guardarPreciosPersonalizados = async () => {
    if (!clienteSeleccionado) return

    setIsGuardando(true)
    try {
      const response = await fetch("/api/clientes/precios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: clienteSeleccionado,
          precios: preciosEditados,
        }),
      })

      if (response.ok) {
        showToast("Precios personalizados guardados correctamente", "success")
        // Recargar los precios del cliente para mostrar los cambios
        await cargarPreciosCliente(clienteSeleccionado)
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar los precios personalizados")
      }
    } catch (error) {
      console.error("Error al guardar precios personalizados:", error)
      showToast(error instanceof Error ? error.message : "Error al guardar los precios personalizados", "error")
    } finally {
      setIsGuardando(false)
    }
  }

  // Actualizar precio base de un producto
  const actualizarPrecioBase = async (productoId: string) => {
    if (!nuevoPrecioBase) return

    try {
      const precioBase = Number.parseFloat(nuevoPrecioBase)

      const response = await fetch("/api/productos/precios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productoId,
          precioBase,
        }),
      })

      if (response.ok) {
        showToast("Precio base actualizado correctamente", "success")
        // Recargar los productos para mostrar los cambios
        await cargarProductos()
        // Si hay un cliente seleccionado, recargar sus precios también
        if (clienteSeleccionado) {
          await cargarPreciosCliente(clienteSeleccionado)
        }
        // Limpiar el estado de edición
        setEditandoPrecioBase(null)
        setNuevoPrecioBase("")
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al actualizar el precio base")
      }
    } catch (error) {
      console.error("Error al actualizar precio base:", error)
      showToast(error instanceof Error ? error.message : "Error al actualizar el precio base", "error")
    }
  }

  // Filtrar clientes según la búsqueda
  const clientesFiltrados = clientes.filter((cliente) => cliente.local.toLowerCase().includes(busqueda.toLowerCase()))

  // Obtener el nombre del producto
  const getNombreProducto = (productoId: string) => {
    const producto = productos.find((p) => p.id === productoId)
    return producto ? producto.nombre : productoId
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-green-500" />
          Administración de Precios
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Precios Base */}
        <div className="border border-gray-700/50 rounded-lg p-6 bg-black/30">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-blue-400" />
            Precios Base de Productos
          </h3>

          {isLoadingProductos ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
              <span>Cargando productos...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {productos.map((producto) => (
                <div key={producto.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <span className="font-medium">{producto.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {editandoPrecioBase === producto.id ? (
                      <>
                        <input
                          type="number"
                          value={nuevoPrecioBase}
                          onChange={(e) => setNuevoPrecioBase(e.target.value)}
                          className="w-24 py-1 px-2 text-right rounded border text-white bg-gray-700 border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                        <button
                          onClick={() => actualizarPrecioBase(producto.id)}
                          className="p-1 rounded-full bg-green-600/20 text-green-400 hover:bg-green-600/30"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditandoPrecioBase(null)
                            setNuevoPrecioBase("")
                          }}
                          className="p-1 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-green-400 font-medium">${producto.precio_base.toFixed(2)}</span>
                        <button
                          onClick={() => {
                            setEditandoPrecioBase(producto.id)
                            setNuevoPrecioBase(producto.precio_base.toString())
                          }}
                          className="p-1 rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selector de Cliente */}
        <div className="border border-gray-700/50 rounded-lg p-6 bg-black/30">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-400" />
            Seleccionar Cliente
          </h3>

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full py-2 pl-10 pr-4 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar cliente..."
              />
            </div>

            {isLoadingClientes ? (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-2" />
                <span>Cargando clientes...</span>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-gray-700 rounded-lg">
                {clientesFiltrados.length > 0 ? (
                  <div className="divide-y divide-gray-700">
                    {clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => setClienteSeleccionado(cliente.id)}
                        className={`w-full text-left p-3 hover:bg-gray-700/50 transition-colors ${
                          clienteSeleccionado === cliente.id ? "bg-blue-900/30 border-l-4 border-blue-500" : ""
                        }`}
                      >
                        {cliente.local}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-400">No se encontraron clientes con ese criterio</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Precios Personalizados */}
        <div className="border border-gray-700/50 rounded-lg p-6 bg-black/30">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-400" />
            Precios Personalizados
          </h3>

          {!clienteSeleccionado ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="h-12 w-12 text-gray-500 mb-2" />
              <p className="text-gray-400">Selecciona un cliente para ver y editar sus precios personalizados</p>
            </div>
          ) : isLoadingPrecios ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
              <span>Cargando precios...</span>
            </div>
          ) : preciosCliente ? (
            <div className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 mb-4">
                <p className="text-blue-200 font-medium">{preciosCliente.nombreCliente}</p>
                <p className="text-sm text-blue-300">
                  Los precios personalizados tienen prioridad sobre los precios base. Deja en blanco para usar el precio
                  base.
                </p>
              </div>

              {Object.keys(preciosCliente.precios).map((productoId) => {
                const producto = preciosCliente.precios[productoId]
                const usaPrecioBase = preciosEditados[productoId] === null
                return (
                  <div key={productoId} className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{getNombreProducto(productoId)}</span>
                      <span className="text-sm text-gray-400">Precio Base: ${producto.precioBase.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={preciosEditados[productoId] === null ? "" : preciosEditados[productoId] || ""}
                        onChange={(e) => handlePrecioChange(productoId, e.target.value)}
                        className={`w-full py-2 px-3 rounded border text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          usaPrecioBase
                            ? "bg-gray-700 border-gray-600 placeholder:text-gray-500"
                            : "bg-blue-900/30 border-blue-600/50"
                        }`}
                        placeholder={`Usar precio base (${producto.precioBase.toFixed(2)})`}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                )
              })}

              <div className="pt-4">
                <button
                  onClick={guardarPreciosPersonalizados}
                  disabled={isGuardando}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGuardando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Guardar Precios Personalizados
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-8 text-center">
              <p className="text-gray-400">No se pudieron cargar los precios para este cliente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
