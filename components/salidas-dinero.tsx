"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  TrendingDown,
  Plus,
  ArrowLeft,
  DollarSign,
  CalendarIcon,
  User,
  FileText,
  Search,
  Users,
  CalendarDays,
  Loader2,
} from "lucide-react"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

type TimeRange = "today" | "yesterday" | "lastWeek" | "lastMonth" | "custom"

interface Rutero {
  id: number
  nombre: string
  telefono: string
  activo: boolean
}

interface SalidaEfectivo {
  id: number
  rutero_id: number
  rutero_nombre: string
  fecha: string
  motivo: string
  monto: number
  fecha_creacion: string
  fecha_actualizacion: string
}

interface DateRange {
  from: Date
  to: Date
}

export default function SalidasDinero() {
  const { toast } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRutero, setSelectedRutero] = useState<string>("")
  const [motivo, setMotivo] = useState<string>("")
  const [monto, setMonto] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para filtros
  const [filtroRutero, setFiltroRutero] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<TimeRange>("today")
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  })
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false)

  // Estados para datos de la BD
  const [ruteros, setRuteros] = useState<Rutero[]>([])
  const [salidas, setSalidas] = useState<SalidaEfectivo[]>([])

  // Cargar repartidores al montar el componente
  useEffect(() => {
    fetchRuteros()
    fetchSalidas()
  }, [])

  // Recargar salidas cuando cambien los filtros
  useEffect(() => {
    fetchSalidas()
  }, [filtroRutero, timeRange, customDateRange])

  const fetchRuteros = async () => {
    try {
      const response = await fetch("/api/ruteros")
      if (response.ok) {
        const data = await response.json()
        setRuteros(data.filter((rutero: Rutero) => rutero.activo))
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los repartidores",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al cargar repartidores:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    }
  }

  const fetchSalidas = async () => {
    setIsLoading(true)
    try {
      const dateRange = getDateRange(timeRange)

      // Crear parámetros solo si hay valores válidos
      const params = new URLSearchParams()

      if (filtroRutero !== "all") {
        params.append("rutero_id", filtroRutero)
      }

      // CORREGIDO: Solo aplicar filtros de fecha cuando NO sea "today" para mostrar todos por defecto
      // Pero aplicar correctamente los otros filtros
      if (timeRange === "today") {
        // Para "hoy", filtrar por la fecha actual
        params.append("fecha_desde", format(dateRange.from, "yyyy-MM-dd"))
        params.append("fecha_hasta", format(dateRange.to, "yyyy-MM-dd"))
      } else if (timeRange === "yesterday") {
        // Para "ayer", filtrar por ayer específicamente
        params.append("fecha_desde", format(dateRange.from, "yyyy-MM-dd"))
        params.append("fecha_hasta", format(dateRange.to, "yyyy-MM-dd"))
      } else if (timeRange === "lastWeek") {
        // Para "últimos 7 días", desde hace 7 días hasta hoy
        params.append("fecha_desde", format(dateRange.from, "yyyy-MM-dd"))
        params.append("fecha_hasta", format(dateRange.to, "yyyy-MM-dd"))
      } else if (timeRange === "lastMonth") {
        params.append("fecha_desde", format(dateRange.from, "yyyy-MM-dd"))
        params.append("fecha_hasta", format(dateRange.to, "yyyy-MM-dd"))
      } else if (timeRange === "custom") {
        // Para rango personalizado
        params.append("fecha_desde", format(dateRange.from, "yyyy-MM-dd"))
        params.append("fecha_hasta", format(dateRange.to, "yyyy-MM-dd"))
      }

      const url = params.toString() ? `/api/salidas-efectivo?${params}` : "/api/salidas-efectivo"

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        // Asegurar que los montos sean números
        const salidasConMontos = data.map((salida: any) => ({
          ...salida,
          monto: typeof salida.monto === "string" ? Number.parseFloat(salida.monto) : salida.monto,
        }))
        setSalidas(salidasConMontos)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar las salidas de efectivo",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al cargar salidas:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // CORREGIDO: Solo ajustar el caso de "lastWeek"
  const getDateRange = (range: TimeRange): DateRange => {
    const today = new Date()

    switch (range) {
      case "today":
        return { from: today, to: today }
      case "yesterday":
        const yesterday = subDays(today, 1)
        return { from: yesterday, to: yesterday }
      case "lastWeek":
        // CORREGIDO: Desde hace 7 días hasta hoy (en lugar de la semana pasada completa)
        const sevenDaysAgo = subDays(today, 7)
        return { from: sevenDaysAgo, to: today }
      case "lastMonth":
        const thirtyDaysAgo = subDays(today, 30)
        return { from: thirtyDaysAgo, to: today }
      case "custom":
        return customDateRange
      default:
        return { from: today, to: today }
    }
  }

  // CORREGIDO: Solo cambiar el texto de "lastWeek"
  const getRangeText = (range: TimeRange): string => {
    switch (range) {
      case "today":
        return "Hoy"
      case "yesterday":
        return "Ayer"
      case "lastWeek":
        return "Últimos 7 días"
      case "lastMonth":
        return "Últimos 30 días"
      case "custom":
        if (dateFrom && dateTo) {
          return `${format(dateFrom, "dd/MM/yyyy")} - ${format(dateTo, "dd/MM/yyyy")}`
        }
        return "Rango Personalizado"
      default:
        return "Hoy"
    }
  }

  // Aplicar rango personalizado
  const applyCustomRange = () => {
    if (dateFrom && dateTo) {
      setCustomDateRange({ from: dateFrom, to: dateTo })
      setTimeRange("custom")
      setIsCustomRangeOpen(false)
    }
  }

  // Obtener fecha y hora actual
  const getCurrentDateTime = () => {
    return new Date()
  }

  const handleSubmit = async () => {
    if (!selectedRutero || !motivo.trim() || !monto.trim()) {
      toast({
        title: "Campos incompletos",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      })
      return
    }

    const montoNumerico = Number.parseFloat(monto)
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      toast({
        title: "Monto inválido",
        description: "Por favor ingresa un monto válido mayor a cero",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/salidas-efectivo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rutero_id: Number.parseInt(selectedRutero),
          motivo: motivo.trim(),
          monto: montoNumerico,
        }),
      })

      if (response.ok) {
        // Limpiar formulario
        setSelectedRutero("")
        setMotivo("")
        setMonto("")
        setIsModalOpen(false)

        // Recargar datos inmediatamente
        await fetchSalidas()

        toast({
          title: "Éxito",
          description: "Salida de efectivo registrada exitosamente",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Error desconocido al registrar la salida",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al registrar salida:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedRutero("")
    setMotivo("")
    setMonto("")
    setIsModalOpen(false)
  }

  const totalSalidas = salidas.reduce((sum, salida) => {
    const monto = typeof salida.monto === "number" ? salida.monto : Number.parseFloat(salida.monto) || 0
    return sum + monto
  }, 0)

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay pointer-events-none" />
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex justify-center">
            <img src="/mrfrio-logo.png" alt="Mr. Frío de San Luis" width={320} height={64} className="drop-shadow-lg" />
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 flex-grow">
        <div className="relative overflow-hidden border border-gray-700/50 rounded-xl p-8 mb-10 backdrop-blur-sm bg-black/40">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="relative z-10 space-y-6">
            {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Inicio
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                <TrendingDown className="h-10 w-10 text-red-400" />
                Salidas de Efectivo
              </h1>
              <p className="text-blue-200 mt-2">
                Registra y gestiona las salidas de dinero autorizadas para los repartidores
              </p>
            </div>
          </div>

          {/* Botón para agregar nueva salida */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                <Plus className="h-4 w-4" />
                Nueva Salida
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-red-400" />
                  Registrar Salida de Efectivo
                </DialogTitle>
                <DialogDescription className="text-blue-200">
                  Completa la información para registrar una nueva salida de dinero autorizada
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Selección de Repartidor */}
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-400" />
                    Repartidor
                  </Label>
                  <Select value={selectedRutero} onValueChange={setSelectedRutero}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Selecciona un repartidor" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {ruteros.map((rutero) => (
                        <SelectItem
                          key={rutero.id}
                          value={rutero.id.toString()}
                          className="text-white hover:bg-gray-700"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{rutero.nombre}</span>
                            <span className="text-xs text-blue-300">{rutero.telefono}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fecha y Hora (Solo lectura) */}
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-blue-400" />
                    Fecha y Hora
                  </Label>
                  <Input
                    value={format(getCurrentDateTime(), "dd/MM/yyyy - HH:mm", { locale: es })}
                    disabled
                    className="bg-gray-700 border-gray-600 text-gray-300 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400">La fecha y hora se asignan automáticamente</p>
                </div>

                {/* Motivo */}
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    Motivo de la Salida
                  </Label>
                  <Textarea
                    placeholder="Describe el motivo de la salida de efectivo..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 min-h-[80px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400">{motivo.length}/500 caracteres</p>
                </div>

                {/* Monto */}
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-400" />
                    Monto
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 pl-8"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={!selectedRutero || !motivo.trim() || !monto.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Registrar Salida"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Módulo de Filtros */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-2 text-white">
              <Search className="h-5 w-5 text-red-400" />
              Filtros de Búsqueda
            </CardTitle>
            <CardDescription className="text-blue-200">
              Filtra las salidas de efectivo por repartidor y período de tiempo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selección de Repartidor */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2 text-white">
                  <Users className="h-4 w-4 text-red-400" />
                  Seleccionar Repartidor
                </Label>
                <Select value={filtroRutero} onValueChange={setFiltroRutero}>
                  <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Selecciona un repartidor" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-700">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-red-400" />
                        Todos los Repartidores
                      </div>
                    </SelectItem>
                    {ruteros.map((rutero) => (
                      <SelectItem key={rutero.id} value={rutero.id.toString()} className="text-white hover:bg-gray-700">
                        <div className="flex flex-col">
                          <span className="font-medium">{rutero.nombre}</span>
                          <span className="text-xs text-blue-300">{rutero.telefono}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selección de Rango de Tiempo */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2 text-white">
                  <CalendarDays className="h-4 w-4 text-red-400" />
                  Período de Tiempo
                </Label>
                <div className="flex gap-2">
                  <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                    <SelectTrigger className="flex-1 bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="today" className="text-white hover:bg-gray-700">
                        Hoy
                      </SelectItem>
                      <SelectItem value="yesterday" className="text-white hover:bg-gray-700">
                        Ayer
                      </SelectItem>
                      <SelectItem value="lastWeek" className="text-white hover:bg-gray-700">
                        Últimos 7 días
                      </SelectItem>
                      <SelectItem value="lastMonth" className="text-white hover:bg-gray-700">
                        Últimos 30 días
                      </SelectItem>
                      <SelectItem value="custom" className="text-white hover:bg-gray-700">
                        Rango Personalizado
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {timeRange === "custom" && (
                    <Dialog open={isCustomRangeOpen} onOpenChange={setIsCustomRangeOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="default"
                          className="gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                        >
                          <CalendarIcon className="h-4 w-4" />
                          Fechas
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[700px] bg-gray-900 border-gray-800">
                        <DialogHeader>
                          <DialogTitle className="text-white">Seleccionar Rango Personalizado</DialogTitle>
                          <DialogDescription className="text-blue-200">
                            Elige las fechas desde y hasta para filtrar las salidas de efectivo
                          </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                          <div className="space-y-3">
                            <Label className="text-white">Fecha Desde</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                                <Calendar
                                  mode="single"
                                  selected={dateFrom}
                                  onSelect={setDateFrom}
                                  initialFocus
                                  locale={es}
                                  className="bg-gray-800 text-white"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-white">Fecha Hasta</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                                <Calendar
                                  mode="single"
                                  selected={dateTo}
                                  onSelect={setDateTo}
                                  initialFocus
                                  locale={es}
                                  disabled={(date) => (dateFrom ? date < dateFrom : false)}
                                  className="bg-gray-800 text-white"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsCustomRangeOpen(false)}
                            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={applyCustomRange}
                            disabled={!dateFrom || !dateTo}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Aplicar Rango
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <p className="text-sm text-blue-300">Período: {getRangeText(timeRange)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Total de Salidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{salidas.length}</div>
              <p className="text-xs text-gray-400">
                {filtroRutero === "all"
                  ? `Registros para ${getRangeText(timeRange).toLowerCase()}`
                  : `${ruteros.find((r) => r.id.toString() === filtroRutero)?.nombre} - ${getRangeText(timeRange).toLowerCase()}`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Monto Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                $
                {totalSalidas.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-gray-400">Efectivo total saliente</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Promedio por Salida</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                $
                {salidas.length > 0
                  ? (totalSalidas / salidas.length).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"}
              </div>
              <p className="text-xs text-gray-400">Monto promedio</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Salidas */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white">Historial de Salidas de Efectivo</CardTitle>
            <CardDescription className="text-blue-200">
              {filtroRutero === "all"
                ? `Mostrando todas las salidas para ${getRangeText(timeRange).toLowerCase()}`
                : `Mostrando salidas de ${ruteros.find((r) => r.id.toString() === filtroRutero)?.nombre} para ${getRangeText(timeRange).toLowerCase()}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <span className="ml-2 text-gray-400">Cargando salidas...</span>
              </div>
            ) : (
              <div className="rounded-md border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-gray-800">
                      <TableHead className="text-blue-300">ID</TableHead>
                      <TableHead className="text-blue-300">Fecha y Hora</TableHead>
                      <TableHead className="text-blue-300">Repartidor</TableHead>
                      <TableHead className="text-blue-300">Motivo</TableHead>
                      <TableHead className="text-right text-blue-300">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salidas.length > 0 ? (
                      salidas.map((salida) => (
                        <TableRow key={salida.id} className="border-gray-700 hover:bg-gray-800">
                          <TableCell className="font-medium text-white">#{salida.id}</TableCell>
                          <TableCell className="text-gray-300">
                            {format(new Date(salida.fecha_creacion), "dd/MM/yyyy - HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell className="text-gray-300">{salida.rutero_nombre}</TableCell>
                          <TableCell className="text-gray-300 max-w-xs">
                            <div className="truncate" title={salida.motivo}>
                              {salida.motivo}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-400">
                            $
                            {typeof salida.monto === "number"
                              ? salida.monto.toLocaleString("es-MX", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : Number.parseFloat(salida.monto || 0).toLocaleString("es-MX", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                          No hay salidas de efectivo para los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
            </div>
          </div>
      </div>
      <footer className="bg-black/80 border-t border-gray-800 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2025 Mr. Frío de San Luis - Hielo Gourmet. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
