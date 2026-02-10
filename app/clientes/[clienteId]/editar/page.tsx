"use client"

import { use, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  MapPin,
  Search,
  Route,
  Calendar,
  Refrigerator,
  Check,
  X,
  AlertCircle,
  Store,
  Phone,
  Power,
  Save,
  Trash2,
} from "lucide-react"

import { useToast } from "@/components/toast-notification"

const GOOGLE_MAPS_SRC =
  "https://maps.googleapis.com/maps/api/js?key=AIzaSyCnkkBzjxlpg7bh4ZxzMRtqV9YnUaFnYLg&libraries=places"
const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script"
const DEFAULT_LOCATION = { lat: 22.1565, lng: -100.9855 }

const DIAS_SEMANA = [
  { id: "lunes", label: "Lunes" },
  { id: "martes", label: "Martes" },
  { id: "miercoles", label: "Miercoles" },
  { id: "jueves", label: "Jueves" },
  { id: "viernes", label: "Viernes" },
  { id: "sabado", label: "Sabado" },
  { id: "domingo", label: "Domingo" },
] as const

type DiasAsignados = Record<(typeof DIAS_SEMANA)[number]["id"], boolean>

type RutaAsignada = {
  id: string
  rutaId: string
  dias: DiasAsignados
}

type Ruta = {
  id: string
  nombre: string
}

type FormDataState = {
  storeName: string
  phone: string
  address: string
  rutasAsignadas: RutaAsignada[]
  tieneRefrigerador: boolean
  capacidadRefrigerador: string
  lat: number
  lng: number
  formattedAddress: string
  mapUrl: string
  activo: boolean
}

type ClienteApi = {
  id: string
  local: string
  telefono: string
  direccion: string
  lat: number | null
  lng: number | null
  tiene_refrigerador: boolean
  capacidad_refrigerador: string | null
  activo: boolean
  rutas: Array<{
    rutaId: string
    dias: DiasAsignados
  }>
}

const createEmptyDias = (): DiasAsignados => ({
  lunes: false,
  martes: false,
  miercoles: false,
  jueves: false,
  viernes: false,
  sabado: false,
  domingo: false,
})

const createRutaAsignada = (): RutaAsignada => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  rutaId: "",
  dias: createEmptyDias(),
})

const createInitialFormState = (): FormDataState => ({
  storeName: "",
  phone: "",
  address: "",
  rutasAsignadas: [createRutaAsignada()],
  tieneRefrigerador: false,
  capacidadRefrigerador: "",
  lat: 0,
  lng: 0,
  formattedAddress: "",
  mapUrl: "",
  activo: true,
})

const createInitialErrorsState = () => ({
  storeName: "",
  phone: "",
  address: "",
  rutasAsignadas: "",
  capacidadRefrigerador: "",
  mapError: "",
})

type FormErrorsState = ReturnType<typeof createInitialErrorsState>

type AssignmentError = {
  rutaId?: string
  dias?: string
}

type AssignmentErrorMap = Record<string, AssignmentError>

declare global {
  interface Window {
    google?: typeof google.maps
  }
}

interface Props {
  params: Promise<{ clienteId: string }>
}

const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/\D/g, "")

  if (numbers.length <= 3) {
    return numbers
  }

  if (numbers.length <= 6) {
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
  }

  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
}

const digitsFromPhone = (value: string) => value.replace(/\D/g, "")

export default function EditarClientePage({ params }: Props) {
  const { clienteId } = use(params)
  const router = useRouter()
  const { showToast, ToastContainer: ToastContainerComponent } = useToast()


  const [formData, setFormData] = useState<FormDataState>(createInitialFormState)
  const [errors, setErrors] = useState<FormErrorsState>(createInitialErrorsState)
  const [assignmentErrors, setAssignmentErrors] = useState<AssignmentErrorMap>({})
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [isLoadingRutas, setIsLoadingRutas] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTogglingActivo, setIsTogglingActivo] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadedClienteIdRef = useRef<string | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    if (window.google?.maps) {
      setMapLoaded(true)
      return
    }

    const handleLoad = () => setMapLoaded(true)
    const handleError = () => showToast("No se pudo cargar Google Maps", "error")
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad)
      existingScript.addEventListener("error", handleError)

      return () => {
        existingScript.removeEventListener("load", handleLoad)
        existingScript.removeEventListener("error", handleError)
      }
    }

    const script = document.createElement("script")
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = GOOGLE_MAPS_SRC
    script.async = true
    script.defer = true
    script.addEventListener("load", handleLoad)
    script.addEventListener("error", handleError)
    document.head.appendChild(script)

    return () => {
      script.removeEventListener("load", handleLoad)
      script.removeEventListener("error", handleError)
    }
  }, [showToast])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    if (!mapInstanceRef.current) {
      const initialLocation =
        formData.lat && formData.lng
          ? { lat: formData.lat, lng: formData.lng }
          : DEFAULT_LOCATION

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: initialLocation,
        zoom: formData.lat && formData.lng ? 16 : 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })

      markerRef.current = new window.google.maps.Marker({
        position: initialLocation,
        map: mapInstanceRef.current,
        animation: window.google.maps.Animation.DROP,
        title: formData.storeName || "Ubicacion",
      })
    }
  }, [mapLoaded, formData.lat, formData.lng, formData.storeName])

  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !markerRef.current) return
    if (formData.lat && formData.lng) {
      const location = { lat: formData.lat, lng: formData.lng }
      markerRef.current.setPosition(location)
      markerRef.current.setTitle(formData.storeName || "Ubicacion")
      mapInstanceRef.current.setCenter(location)
      mapInstanceRef.current.setZoom(16)
    }
  }, [mapLoaded, formData.lat, formData.lng, formData.storeName])

  useEffect(() => {
    if (loadedClienteIdRef.current === clienteId) return

    let isActive = true

    const loadData = async () => {
      try {
        setLoading(true)
        setIsLoadingRutas(true)

        const [clienteRes, rutasRes] = await Promise.all([
          fetch(`/api/clientes/${clienteId}`),
          fetch("/api/rutas"),
        ])

        if (!clienteRes.ok) {
          throw new Error("No se pudo cargar el cliente")
        }

        const cliente: ClienteApi = await clienteRes.json()

        if (!isActive) return

        if (rutasRes.ok) {
          const rutasData: Ruta[] = (await rutasRes.json()).filter((ruta: Ruta) => ruta.id !== "LOCAL")
          if (isActive) {
            setRutas(rutasData)
          }
        } else if (isActive) {
          setRutas([])
          showToast("No se pudieron cargar las rutas", "error")
        }

        if (!isActive) return

        const rutasAsignadas = cliente.rutas.length
          ? cliente.rutas.map((ruta) => ({
              id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              rutaId: ruta.rutaId,
              dias: { ...ruta.dias },
            }))
          : [createRutaAsignada()]

        setFormData({
          storeName: cliente.local ?? "",
          phone: formatPhoneNumber(cliente.telefono ?? ""),
          address: cliente.direccion ?? "",
          rutasAsignadas,
          tieneRefrigerador: Boolean(cliente.tiene_refrigerador),
          capacidadRefrigerador: cliente.capacidad_refrigerador ?? "",
          lat: cliente.lat ?? 0,
          lng: cliente.lng ?? 0,
          formattedAddress: cliente.direccion ?? "",
          mapUrl:
            cliente.lat !== null &&
            cliente.lat !== undefined &&
            cliente.lng !== null &&
            cliente.lng !== undefined
              ? `https://www.google.com/maps?q=${cliente.lat},${cliente.lng}`
              : "",
          activo: cliente.activo ?? true,
        })

        setAssignmentErrors({})
        loadedClienteIdRef.current = clienteId
      } catch (error) {
        if (isActive) {
          console.error(error)
          showToast(
            error instanceof Error ? error.message : "Error al cargar informacion del cliente",
            "error",
          )
        }
      } finally {
        if (isActive) {
          setLoading(false)
          setIsLoadingRutas(false)
        }
      }
    }

    void loadData()

    return () => {
      isActive = false
    }
  }, [clienteId, showToast])

  const handleSearchAddress = () => {
    if (!mapLoaded || !mapInstanceRef.current || !formData.address.trim()) {
      setErrors((prev) => ({
        ...prev,
        mapError: !formData.address.trim() ? "Ingresa una dirección para buscar" : "",
      }))
      return
    }

    setIsSearchingAddress(true)
    setErrors((prev) => ({ ...prev, mapError: "" }))

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: `${formData.address}, San Luis Potosí, México` }, (results, status) => {
      setIsSearchingAddress(false)

      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(location)
          mapInstanceRef.current.setZoom(16)

          if (markerRef.current) {
            markerRef.current.setPosition(location)
            markerRef.current.setTitle(formData.storeName || results[0].formatted_address)
          }
        }

        const lat = location.lat()
        const lng = location.lng()
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`

        setFormData((prev) => ({
          ...prev,
          lat,
          lng,
          formattedAddress: results[0].formatted_address,
          mapUrl,
        }))
      } else {
        console.error("Error al buscar la dirección:", status)
        setErrors((prev) => ({
          ...prev,
          mapError: "No se encontró la dirección. Intenta con otra más específica.",
        }))
      }
    })
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (errors[name as keyof FormErrorsState]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(event.target.value)
    setFormData((prev) => ({ ...prev, phone: formattedValue }))

    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }))
    }
  }

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target

    if (name === "tieneRefrigerador") {
      setFormData((prev) => ({
        ...prev,
        tieneRefrigerador: checked,
        capacidadRefrigerador: checked ? prev.capacidadRefrigerador : "",
      }))

      if (!checked) {
        setErrors((prev) => ({ ...prev, capacidadRefrigerador: "" }))
      }
    }
  }

  const handleToggleActivo = async () => {
    if (isTogglingActivo) {
      return
    }

    const nextActivo = !formData.activo
    setIsTogglingActivo(true)

    try {
      const response = await fetch(`/api/clientes/${clienteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ activo: nextActivo }),
      })

      if (!response.ok) {
        let message = "No se pudo actualizar el estado del cliente"
        try {
          const errorData = await response.json()
          if (errorData?.error) {
            message = errorData.error
          }
        } catch (parseError) {
          console.error("No se pudo interpretar el error de la API", parseError)
        }
        throw new Error(message)
      }

      setFormData((prev) => ({ ...prev, activo: nextActivo }))
      showToast(nextActivo ? "Cliente activado" : "Cliente desactivado", "success")
      router.refresh()
    } catch (error) {
      console.error("Error al actualizar el estado del cliente:", error)
      const message =
        error instanceof Error ? error.message : "Error al actualizar el estado del cliente"
      showToast(message, "error")

    } finally {
      setIsTogglingActivo(false)
    }
  }

  const handleDeleteCliente = async () => {
    if (isDeleting) {
      return
    }

    const confirmation = window.confirm(
      `Seguro que deseas eliminar al cliente ${formData.storeName || 'sin nombre'}? Esta accion no se puede deshacer.`,
    )

    if (!confirmation) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/clientes/${clienteId}`, { method: "DELETE" })

      if (!response.ok) {
        let message = "No se pudo eliminar el cliente"
        try {
          const errorData = await response.json()
          if (errorData?.error) {
            message = errorData.error
          }
        } catch (parseError) {
          console.error("No se pudo interpretar el error de la API", parseError)
        }
        throw new Error(message)
      }

      showToast("Cliente eliminado correctamente", "success")
      router.push("/admin")
      router.refresh()
    } catch (error) {
      console.error("Error al eliminar cliente:", error)
      const message = error instanceof Error ? error.message : "Error al eliminar cliente"
      showToast(message, "error")
    } finally {
      setIsDeleting(false)
    }
  }

  const clearAssignmentError = (assignmentId: string, field: keyof AssignmentError) => {
    setAssignmentErrors((prev) => {
      const current = prev[assignmentId]
      if (!current || !current[field]) {
        return prev
      }

      const updated = { ...current }
      delete updated[field]

      const next = { ...prev }
      if (Object.keys(updated).length === 0) {
        delete next[assignmentId]
      } else {
        next[assignmentId] = updated
      }

      return next
    })
  }

  const handleAddRutaAsignada = () => {
    setFormData((prev) => ({
      ...prev,
      rutasAsignadas: [...prev.rutasAsignadas, createRutaAsignada()],
    }))
    setErrors((prev) => ({ ...prev, rutasAsignadas: "" }))
  }

  const handleRemoveRutaAsignada = (assignmentId: string) => {
    setFormData((prev) => {
      const updatedAssignments = prev.rutasAsignadas.filter((asignacion) => asignacion.id !== assignmentId)
      setErrors((prevErrors) => ({
        ...prevErrors,
        rutasAsignadas: updatedAssignments.length === 0 ? "Agrega al menos una asignación de ruta" : "",
      }))
      return {
        ...prev,
        rutasAsignadas: updatedAssignments,
      }
    })

    setAssignmentErrors((prev) => {
      if (!prev[assignmentId]) {
        return prev
      }
      const { [assignmentId]: _removed, ...rest } = prev
      return rest
    })
  }

  const handleRutaAsignadaChange = (assignmentId: string, rutaId: string) => {
    setFormData((prev) => ({
      ...prev,
      rutasAsignadas: prev.rutasAsignadas.map((asignacion) =>
        asignacion.id === assignmentId ? { ...asignacion, rutaId } : asignacion,
      ),
    }))

    setErrors((prev) => ({ ...prev, rutasAsignadas: "" }))

    if (rutaId) {
      clearAssignmentError(assignmentId, "rutaId")
    }
  }

  const handleRutaDiaToggle = (assignmentId: string, day: keyof DiasAsignados) => {
    let updatedAssignment: RutaAsignada | null = null

    setFormData((prev) => {
      const updatedAssignments = prev.rutasAsignadas.map((asignacion) => {
        if (asignacion.id !== assignmentId) {
          return asignacion
        }

        const updatedDias = {
          ...asignacion.dias,
          [day]: !asignacion.dias[day],
        }

        updatedAssignment = {
          ...asignacion,
          dias: updatedDias,
        }

        return updatedAssignment
      })

      return {
        ...prev,
        rutasAsignadas: updatedAssignments,
      }
    })

    setErrors((prev) => ({ ...prev, rutasAsignadas: "" }))

    if (updatedAssignment && Object.values(updatedAssignment.dias).some(Boolean)) {
      clearAssignmentError(assignmentId, "dias")
    }
  }

  const validateForm = () => {
    let valid = true
    const newErrors = createInitialErrorsState()
    const assignmentErrorMap: AssignmentErrorMap = {}

    if (!formData.storeName.trim()) {
      newErrors.storeName = "El nombre de la tienda es requerido"
      valid = false
    }

    const digits = digitsFromPhone(formData.phone)
    if (!digits) {
      newErrors.phone = "El número de teléfono es requerido"
      valid = false
    } else if (digits.length !== 10) {
      newErrors.phone = "Ingresa un número de teléfono válido (10 dígitos)"
      valid = false
    }

    if (!formData.address.trim()) {
      newErrors.address = "La dirección es requerida"
      valid = false
    }

    if (formData.lat === 0 && formData.lng === 0) {
      newErrors.mapError = "Debes buscar la dirección en el mapa"
      valid = false
    } else if (!formData.formattedAddress) {
      newErrors.mapError = "Error al obtener la dirección formateada. Intenta buscar nuevamente."
      valid = false
    }

    if (formData.rutasAsignadas.length === 0) {
      newErrors.rutasAsignadas = "Agrega al menos una asignación de ruta"
      valid = false
    } else {
      const rutasUsadas = new Set<string>()
      formData.rutasAsignadas.forEach((asignacion) => {
        const currentAssignmentErrors: AssignmentError = {}

        if (!asignacion.rutaId) {
          currentAssignmentErrors.rutaId = "Selecciona una ruta"
          valid = false
        } else if (rutasUsadas.has(asignacion.rutaId)) {
          currentAssignmentErrors.rutaId = "Esta ruta ya está asignada"
          newErrors.rutasAsignadas = "Cada ruta solo puede asignarse una vez"
          valid = false
        } else {
          rutasUsadas.add(asignacion.rutaId)
        }

        if (!Object.values(asignacion.dias).some(Boolean)) {
          currentAssignmentErrors.dias = "Selecciona al menos un día de visita"
          valid = false
        }

        if (Object.keys(currentAssignmentErrors).length > 0) {
          assignmentErrorMap[asignacion.id] = currentAssignmentErrors
        }
      })
    }

    if (formData.tieneRefrigerador && !formData.capacidadRefrigerador.trim()) {
      newErrors.capacidadRefrigerador = "Indica la capacidad del refrigerador"
      valid = false
    }

    setErrors(newErrors)
    setAssignmentErrors(assignmentErrorMap)
    return valid
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const clienteData = {
        local: formData.storeName,
        telefono: formData.phone,
        direccion: formData.formattedAddress || formData.address,
        lat: formData.lat,
        lng: formData.lng,
        tiene_refrigerador: formData.tieneRefrigerador,
        capacidad_refrigerador: formData.tieneRefrigerador ? formData.capacidadRefrigerador : "",
        activo: formData.activo,
        rutas: formData.rutasAsignadas.map((asignacion) => ({
          rutaId: asignacion.rutaId,
          dias: asignacion.dias,
        })),
      }

      const response = await fetch(`/api/clientes/${clienteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clienteData),
      })

      if (!response.ok) {
        let errorMessage = "Error al actualizar el cliente"
        try {
          const errorData = await response.json()
          if (errorData?.error) {
            errorMessage = errorData.error
          }
        } catch (parseError) {
          console.error("No se pudo interpretar el error de la API", parseError)
        }
        throw new Error(errorMessage)
      }

      showToast("Cliente actualizado exitosamente", "success")
      router.refresh()
    } catch (error) {
      console.error("Error al actualizar el cliente:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar el cliente"
      setErrors((prev) => ({ ...prev, mapError: errorMessage }))
      showToast(errorMessage, "error")
    } finally {
      setIsSubmitting(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-400" />
          <div>
            <p className="text-lg font-semibold">Cargando información del cliente...</p>
            <p className="text-sm text-gray-400">Por favor espera un momento.</p>
          </div>
        </div>
        <ToastContainerComponent />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Store className="h-7 w-7 text-blue-400" />
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                Editar Cliente
              </h1>
            </div>
            <p className="text-gray-300 max-w-3xl">
              Actualiza la información del cliente, valida nuevamente la dirección y ajusta las rutas asignadas según sea
              necesario.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-8 border border-white/10 rounded-xl p-6 md:p-8 bg-white/5 backdrop-blur"
          >
            <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Power className={`h-4 w-4 ${formData.activo ? "text-emerald-300" : "text-amber-300"}`} />
                  Estado de la dirección
                </p>
                <p className="text-xs text-gray-400">
                  Controla si la dirección permanece disponible en las rutas y listados.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <button
                  type="button"
                  onClick={handleToggleActivo}
                  disabled={isTogglingActivo || isSubmitting}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${formData.activo ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20' : 'border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'} ${(isTogglingActivo || isSubmitting) ? 'opacity-70' : ''}`}
                  aria-pressed={formData.activo}
                >
                  {isTogglingActivo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Power className={`h-4 w-4 ${formData.activo ? 'text-emerald-200' : 'text-amber-200'}`} />
                      {formData.activo ? 'Dirección activa' : 'Dirección inactiva'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCliente}
                  disabled={isDeleting || isSubmitting}
                  className={`flex items-center gap-2 rounded-full border border-red-500/60 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 ${(isDeleting || isSubmitting) ? 'opacity-70' : ''}`}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-red-300" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 text-red-300" />
                      Eliminar cliente
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="storeName" className="text-gray-300 flex items-center gap-2 text-sm font-medium">
                  <Store className="h-4 w-4 text-blue-400" />
                  Nombre de la tienda
                </label>
                <input
                  id="storeName"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleChange}
                  placeholder="Ej. Abarrotes Don Juan"
                  className="flex h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.storeName && <p className="text-sm text-red-400">{errors.storeName}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-gray-300 flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-4 w-4 text-blue-400" />
                  Número de teléfono
                </label>
                <input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  maxLength={14}
                  placeholder="(444) 123-4567"
                  className="flex h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.phone && <p className="text-sm text-red-400">{errors.phone}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="address" className="text-gray-300 flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-blue-400" />
                Dirección del negocio
              </label>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Ej. Av. Universidad 123, Col. Centro, San Luis Potosí"
                  className="flex h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={isSearchingAddress || !formData.address.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSearchingAddress ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Validar
                    </>
                  )}
                </button>
              </div>
              {errors.address && <p className="text-sm text-red-400">{errors.address}</p>}
              {!formData.formattedAddress && formData.address && (
                <p className="flex items-center gap-2 text-xs text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Haz clic en “Validar” para confirmar la dirección en el mapa.
                </p>
              )}

              <div ref={mapRef} className="h-56 w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
                {!mapLoaded && (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
                  </div>
                )}
              </div>

              {errors.mapError && <p className="text-sm text-red-400">{errors.mapError}</p>}

              {formData.formattedAddress && (
                <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3">
                  <p className="flex items-center gap-2 text-sm text-blue-100">
                    <Check className="h-4 w-4 text-green-400" />
                    Dirección validada
                  </p>
                  <p className="mt-1 text-sm text-white/90">{formData.formattedAddress}</p>
                </div>
              )}
              {formData.mapUrl && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Check className="h-3 w-3 text-green-500" />
                  URL del mapa generada correctamente.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Route className="h-4 w-4 text-blue-400" />
                  Rutas y días de visita
                </label>
                <button
                  type="button"
                  onClick={handleAddRutaAsignada}
                  disabled={isLoadingRutas || rutas.length === 0 || formData.rutasAsignadas.length >= rutas.length}
                  className="text-sm font-semibold text-blue-400 transition-colors hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  + Agregar asignación de ruta
                </button>
              </div>

              <div className="space-y-4">
                {formData.rutasAsignadas.map((asignacion, index) => {
                  const otrasAsignaciones = formData.rutasAsignadas.filter((item) => item.id !== asignacion.id)

                  return (
                    <div key={asignacion.id} className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-200">Asignación {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRutaAsignada(asignacion.id)}
                          disabled={formData.rutasAsignadas.length === 1}
                          className="flex items-center gap-1 text-xs font-semibold text-red-400 transition-colors hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <X className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>

                      <div className="space-y-2">
                        <span className="text-sm text-gray-300">Ruta</span>
                        <select
                          value={asignacion.rutaId}
                          onChange={(event) => handleRutaAsignadaChange(asignacion.id, event.target.value)}
                          className="flex h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">
                            {isLoadingRutas ? "Cargando rutas..." : "Selecciona una ruta"}
                          </option>
                          {rutas.map((ruta) => {
                            const isDisabled = otrasAsignaciones.some((item) => item.rutaId === ruta.id)
                            return (
                              <option key={ruta.id} value={ruta.id} disabled={isDisabled}>
                                {ruta.nombre}
                              </option>
                            )
                          })}
                        </select>
                        {assignmentErrors[asignacion.id]?.rutaId && (
                          <p className="text-xs text-red-400">{assignmentErrors[asignacion.id]?.rutaId}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <span className="flex items-center gap-2 text-sm text-gray-300">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          Días de visita
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {DIAS_SEMANA.map((dia) => (
                            <label
                              key={`${asignacion.id}-${dia.id}`}
                              className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-200"
                            >
                              <input
                                type="checkbox"
                                checked={asignacion.dias[dia.id as keyof DiasAsignados]}
                                onChange={() => handleRutaDiaToggle(asignacion.id, dia.id as keyof DiasAsignados)}
                                className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
                              />
                              {dia.label}
                            </label>
                          ))}
                        </div>
                        {assignmentErrors[asignacion.id]?.dias && (
                          <p className="text-xs text-red-400">{assignmentErrors[asignacion.id]?.dias}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {errors.rutasAsignadas && <p className="text-sm text-red-400">{errors.rutasAsignadas}</p>}
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Refrigerator className="h-4 w-4 text-blue-400" />
                Refrigeración
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  name="tieneRefrigerador"
                  checked={formData.tieneRefrigerador}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
                />
                El cliente cuenta con refrigerador
              </label>

              {formData.tieneRefrigerador && (
                <div className="pl-6 space-y-2">
                  <label
                    htmlFor="capacidadRefrigerador"
                    className="text-sm font-medium text-gray-300 flex items-center gap-2"
                  >
                    Capacidad del refrigerador
                  </label>
                  <input
                    id="capacidadRefrigerador"
                    name="capacidadRefrigerador"
                    value={formData.capacidadRefrigerador}
                    onChange={handleChange}
                    placeholder="Ej. 200 litros"
                    className="flex h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.capacidadRefrigerador && (
                    <p className="text-sm text-red-400">{errors.capacidadRefrigerador}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainerComponent />
    </div>
  )
}