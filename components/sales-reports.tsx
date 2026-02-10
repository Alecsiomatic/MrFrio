"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
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
  CalendarIcon,
  Search,
  Users,
  CalendarDays,
  FileText,
  Download,
  FileSpreadsheet,
  Snowflake,
  ArrowLeft,
} from "lucide-react"
import { endOfDay, format, startOfDay, subDays } from "date-fns"
import { es } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { AppleToggle } from "@/components/apple-toggle"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import "jspdf-autotable"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"


type TimeRange = "today" | "yesterday" | "lastWeek" | "lastMonth" | "custom"

interface Rutero {
  id: number
  nombre: string
  telefono: string
  activo: boolean
}

interface Cliente {
  id: string
  local: string
  telefono: string
  direccion: string
  tiene_refrigerador: boolean
  activo: boolean
}

interface Producto {
  id: string
  nombre: string
  precio: number
}

interface SalidaEfectivo {
  id: number
  rutero_id: number
  fecha: string
  motivo: string
  monto: number
}

interface PedidoDetalle {
  id: number
  uuid?: string
  fecha: string
  rutero: string
  ruta?: string
  cliente: string
  estado: 'completado' | 'cancelado' | 'descancelado' | string
  motivo_cancelacion?: string | null
  productos: Array<{
    nombre: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }>
  total: number
  credito_usado: number
  efectivo_cobrado: number
}

interface ProductoResumen {
  nombre: string
  cantidad_total: number
  precio_unitario: number
  total_vendido: number
}

interface DateRange {
  from: Date
  to: Date
}

export default function SalesReports() {
  const [selectedRutero, setSelectedRutero] = useState<string>("all")
  const [selectedRuta, setSelectedRuta] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<TimeRange>("today")
  const [selectedCliente, setSelectedCliente] = useState<string>("all")
  const [filtroRefrigerador, setFiltroRefrigerador] = useState<boolean>(false)
  const [incluirSalidasEfectivo, setIncluirSalidasEfectivo] = useState<boolean>(false)
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  })
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false)
  const [reporteGenerado, setReporteGenerado] = useState<boolean>(false)
  const [ruteros, setRuteros] = useState<Rutero[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [rutas, setRutas] = useState<Array<{ id: string; nombre: string }>>([])
  const [pedidosDetalle, setPedidosDetalle] = useState<PedidoDetalle[]>([])
  const [salidasEfectivo, setSalidasEfectivo] = useState<SalidaEfectivo[]>([])
  const [kpis, setKpis] = useState<{ ventas_totales: number; ventas_credito: number; ventas_efectivo: number; entregas: number; cancelaciones: number } | null>(null)
  const [porRuta, setPorRuta] = useState<Array<{ ruta_id: string; ruta_nombre: string; ventas_totales: number; credito_usado: number; ventas_efectivo: number }>>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [rRes, cRes, ruRes] = await Promise.all([
          fetch('/api/ruteros'),
          fetch('/api/clientes/lista'),
          fetch('/api/rutas'),
        ])
        if (rRes.ok) setRuteros(await rRes.json())
        if (cRes.ok) setClientes(await cRes.json())
        if (ruRes.ok) setRutas(await ruRes.json())
      } catch (e) {
        console.error('Error loading initial data', e)
      }
    }
    load()
  }, [])

  // Función para obtener el rango de fechas según la selección
  const getDateRange = (range: TimeRange): DateRange => {
    const today = new Date()
    const startToday = startOfDay(today)
    const endToday = endOfDay(today)

    switch (range) {
      case "today":
        return { from: startToday, to: endToday }
      case "yesterday":
        const yesterday = subDays(today, 1)
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
      case "lastWeek":
        const sevenDaysAgo = subDays(today, 7)
        return { from: startOfDay(sevenDaysAgo), to: endToday }
      case "lastMonth":
        const thirtyDaysAgo = subDays(today, 30)
        return { from: startOfDay(thirtyDaysAgo), to: endToday }
      case "custom":
        return customDateRange
      default:
        return { from: startToday, to: endToday }
    }
  }

  // Función para obtener el texto del rango seleccionado
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

  // Filtrar datos según selecciones
  const getFilteredData = () => {
    let filtered = [...pedidosDetalle]

    // Filtrar por rango de fechas para soportar reportes diarios,
    // semanales y mensuales aunque la API no aplique filtros
    const range = getDateRange(timeRange)
    filtered = filtered.filter((pedido) => {
      const fecha = new Date(pedido.fecha)
      return fecha >= range.from && fecha <= range.to
    })

    // Filtrar por repartidor
    if (selectedRutero !== "all") {
      const ruteroNombre = ruteros.find((r) => r.id.toString() === selectedRutero)?.nombre
      filtered = filtered.filter((pedido) => pedido.rutero === ruteroNombre)
    }

    // Filtrar por ruta
    if (selectedRuta !== "all") {
      const rutaNombre = rutas.find((r) => r.id === selectedRuta)?.nombre
      filtered = filtered.filter((pedido) => pedido.ruta === rutaNombre)
    }

    // Filtrar por cliente
    if (selectedCliente !== "all") {
      const clienteNombre = clientes.find((c) => c.id === selectedCliente)?.local
      filtered = filtered.filter((pedido) => pedido.cliente === clienteNombre)
    }

    // Filtrar por refrigerador
    if (filtroRefrigerador) {
      const clientesConRefrigerador = clientes.filter((c) => c.tiene_refrigerador).map((c) => c.local)
      filtered = filtered.filter((pedido) => clientesConRefrigerador.includes(pedido.cliente))
    }

    return filtered
  }

  // Calcular resumen de productos
  const getProductosResumen = (pedidos: PedidoDetalle[]): ProductoResumen[] => {
    const resumen: { [key: string]: ProductoResumen } = {}

    pedidos.forEach((pedido) => {
      pedido.productos.forEach((producto) => {
        if (!resumen[producto.nombre]) {
          resumen[producto.nombre] = {
            nombre: producto.nombre,
            cantidad_total: 0,
            precio_unitario: producto.precio_unitario,
            total_vendido: 0,
          }
        }
        resumen[producto.nombre].cantidad_total += producto.cantidad
        resumen[producto.nombre].total_vendido += producto.subtotal
      })
    })

    return Object.values(resumen)
  }

  // Calcular salidas de efectivo
  const getSalidasEfectivo = () => {
    if (!incluirSalidasEfectivo) return []

    let salidas = [...salidasEfectivo]

    // Filtrar por repartidor si está seleccionado
    if (selectedRutero !== "all") {
      salidas = salidas.filter((salida) => salida.rutero_id.toString() === selectedRutero)
    }

    // Aplicar el rango de fechas localmente en caso de que la API
    // no filtre correctamente los resultados
    const range = getDateRange(timeRange)
    salidas = salidas.filter((s) => {
      const fecha = new Date(s.fecha)
      return fecha >= range.from && fecha <= range.to
    })

    return salidas
  }

  const handleGenerateReport = async () => {
    const range = getDateRange(timeRange)
    const params = new URLSearchParams({
      rutero: selectedRutero,
      ruta: selectedRuta,
      desde: range.from.toISOString(),
      hasta: range.to.toISOString(),
    })
    try {
      const res = await fetch(`/api/reportes?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const pedidosApi = Array.isArray(data.pedidos)
          ? (data.pedidos as Array<PedidoDetalle & { uuid?: string }>)
          : []
        const seenIds = new Set<string>()
        const uniquePedidos = pedidosApi.filter((pedido) => {
          const rawKey = pedido.uuid ?? pedido.id
          if (rawKey === undefined || rawKey === null) return true
          const key = typeof rawKey === 'number' ? rawKey.toString() : String(rawKey)
          if (seenIds.has(key)) {
            console.warn(`Pedido duplicado detectado en API: ${key}`)
            return false
          }
          seenIds.add(key)
          return true
        })
        if (uniquePedidos.length !== pedidosApi.length) {
          console.warn(
            `Se descartaron ${pedidosApi.length - uniquePedidos.length} pedidos duplicados por identificador.`,
          )
        }
        setPedidosDetalle(uniquePedidos)
        if (data.kpis) setKpis(data.kpis)
        if (data.rendimiento_por_ruta) setPorRuta(data.rendimiento_por_ruta)
      }

      if (incluirSalidasEfectivo) {
        const salidaParams = new URLSearchParams({
          rutero_id: selectedRutero !== 'all' ? selectedRutero : '',
          fecha_desde: range.from.toISOString().split('T')[0],
          fecha_hasta: range.to.toISOString().split('T')[0],
        })
        const r = await fetch(`/api/salidas-efectivo?${salidaParams.toString()}`)
        if (r.ok) setSalidasEfectivo(await r.json())
      } else {
        setSalidasEfectivo([])
      }
      setReporteGenerado(true)
    } catch (e) {
      console.error('Error generating report', e)
    }
  }

  const exportToExcel = () => {
    const data = pedidosDetalle.map((p) => ({
      Fecha: format(new Date(p.fecha), "dd/MM/yyyy"),
      Cliente: p.cliente,
      Repartidor: p.rutero,
      Estado:
        p.estado === 'cancelado'
          ? 'Cancelado'
          : p.estado === 'descancelado'
            ? 'Descancelado'
            : 'Completado',
      MotivoCancelacion:
        p.estado === 'cancelado' || p.estado === 'descancelado'
          ? p.motivo_cancelacion ?? ''
          : '',
      Total: p.total,
      Crédito: p.credito_usado,
      Efectivo: p.efectivo_cobrado,
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Ventas")

    const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }))
    ws["!cols"] = colWidths

    XLSX.writeFile(wb, "reporte_ventas.xlsx")
  }


  const filteredPedidos = getFilteredData()
  const pedidosCompletados = filteredPedidos.filter((pedido) => pedido.estado === 'completado')
  const pedidosCancelados = filteredPedidos.filter((pedido) => pedido.estado === 'cancelado')
  const pedidosDescancelados = filteredPedidos.filter((pedido) => pedido.estado === 'descancelado')
  const productosResumen = getProductosResumen(pedidosCompletados)
  const salidasEfectivoFiltradas = getSalidasEfectivo()
  const totalVentas = pedidosCompletados.reduce((sum, pedido) => sum + pedido.total, 0)
  const totalCredito = pedidosCompletados.reduce((sum, pedido) => sum + (pedido.credito_usado || 0), 0)
  const totalEfectivoCobrado = pedidosCompletados.reduce(
    (sum, pedido) => sum + (pedido.efectivo_cobrado ?? pedido.total - (pedido.credito_usado || 0)),
    0,
  )
  const totalSalidas = salidasEfectivoFiltradas.reduce((sum, salida) => sum + salida.monto, 0)
  const totalNeto = totalEfectivoCobrado - totalSalidas
  const entregas = kpis?.entregas ?? pedidosCompletados.length
  const cancelacionesLocal = pedidosCancelados.length + pedidosDescancelados.length
  const cancelaciones = kpis?.cancelaciones ?? cancelacionesLocal
  const efectividad =
    entregas + cancelaciones > 0 ? Math.round((entregas / (entregas + cancelaciones)) * 100) : 0
  const ventasTotalesKpi = kpis?.ventas_totales ?? totalVentas
  const ventasCreditoKpi = kpis?.ventas_credito ?? totalCredito
  const ventasEfectivoKpi = kpis?.ventas_efectivo ?? totalEfectivoCobrado

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      {/* Header con logotipo para mantener consistencia visual */}
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
            {/* Header con botón de regreso */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                <Snowflake className="h-10 w-10 text-blue-400" />
                Reporte De Ventas
              </h1>
              <p className="text-blue-200 mt-2">
                Configura los filtros y genera reportes detallados de ventas por período
              </p>
            </div>
          </div>
        </div>

        {/* Módulo de Filtros */}
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-200">Ventas del período</CardDescription>
              <CardTitle className="text-2xl text-white">${ventasTotalesKpi.toLocaleString()}</CardTitle>
              <p className="text-sm text-gray-300">Efectivo: ${ventasEfectivoKpi.toLocaleString()} • Crédito: ${ventasCreditoKpi.toLocaleString()}</p>
            </CardHeader>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-200">Entregas</CardDescription>
              <CardTitle className="text-2xl text-white">{entregas}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-200">Efectividad</CardDescription>
              <CardTitle className="text-2xl text-white">{efectividad}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white">Ventas por Ruta</CardTitle>
              <CardDescription className="text-blue-200">Comparativa por rutas</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[280px]">
                <ResponsiveContainer>
                  <BarChart data={porRuta.map((r) => ({
                    name: r.ruta_nombre || r.ruta_id,
                    efectivo: Number(r.ventas_efectivo || 0),
                    credito: Number(r.credito_usado || 0),
                  }))}>
                    <XAxis dataKey="name" stroke="#9ca3af" interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip formatter={(value: any, name) => [`$${Number(value).toLocaleString()}`, name === 'credito' ? 'Crédito' : 'Efectivo']} />
                    <Legend />
                    <Bar dataKey="efectivo" stackId="ventas" name="Efectivo" fill="#34d399" />
                    <Bar dataKey="credito" stackId="ventas" name="Crédito" fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white">Productos Más Vendidos</CardTitle>
              <CardDescription className="text-blue-200">Proporción por unidades</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[280px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={productosResumen.map((p) => ({ name: p.nombre, value: p.cantidad_total }))} dataKey="value" nameKey="name" outerRadius={100} fill="#8884d8" label>
                      {productosResumen.map((_, idx) => (
                        <Cell key={`c-${idx}`} fill={["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa"][idx % 5]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v: any, n: any) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Módulo de Filtros */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-2 text-white">
              <Search className="h-5 w-5 text-blue-400" />
              Configuración de Filtros
            </CardTitle>
            <CardDescription className="text-blue-200">
              Selecciona los parámetros para generar tu reporte personalizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
          {/* Primera fila: Repartidor, Ruta y Rango de Tiempo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Selección de Repartidor */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2 text-white">
                  <Users className="h-4 w-4 text-blue-400" />
                  Seleccionar Repartidor
                </Label>
                <Select value={selectedRutero} onValueChange={setSelectedRutero}>
                  <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Selecciona un repartidor" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-700">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-400" />
                        Todos los Repartidores
                      </div>
                    </SelectItem>
                    {ruteros
                      .filter((rutero) => rutero.activo)
                      .map((rutero) => (
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

              {/* Selección de Rango de Tiempo */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2 text-white">
                  <CalendarDays className="h-4 w-4 text-blue-400" />
                  Rango de Tiempo
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
                      <DialogContent className="sm:max-w-[700px] w-full bg-gray-900 border border-gray-700 rounded-2xl shadow-xl p-6 z-[50]">
                      <DialogHeader>
                        <DialogTitle className="text-white">Seleccionar Rango Personalizado</DialogTitle>
                        <DialogDescription className="text-blue-200">
                          Elige las fechas desde y hasta para tu reporte de ventas
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                        <div className="space-y-3">
                          <Label className="text-white">Fecha Desde</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-gray-800 border border-gray-700 z-[60]">
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
            className="w-full justify-start text-left font-normal bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          avoidCollisions={false}
          className="w-auto p-0 bg-gray-900 border border-gray-700 z-[60] rounded-xl shadow-lg"
        >
          <Calendar
            mode="single"
            selected={dateFrom}
            onSelect={setDateFrom}
            initialFocus
            locale={es}
            className="bg-gray-900 text-white"
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  </div>

  <DialogFooter>
    <Button
      variant="outline"
      onClick={() => setIsCustomRangeOpen(false)}
      className="bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
    >
      Cancelar
    </Button>
    <Button
      onClick={applyCustomRange}
      disabled={!dateFrom || !dateTo}
      className="bg-blue-600 hover:bg-blue-700 text-white"
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

            {/* Segunda fila: Cliente */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2 text-white">
                <Users className="h-4 w-4 text-blue-400" />
                Seleccionar Cliente
              </Label>
              <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      Todos los Clientes
                    </div>
                  </SelectItem>
                  {clientes
                    .filter((cliente) => cliente && !cliente.local.startsWith("Extra"))
                    .map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id} className="text-white hover:bg-gray-700">
                        <div className="flex flex-col">
                          <span className="font-medium">{cliente.local}</span>
                          <span className="text-xs text-blue-300">
                            {cliente.direccion} {cliente.tiene_refrigerador && "• Con Refrigerador"}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selección de Ruta */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2 text-white">
                <Users className="h-4 w-4 text-blue-400" />
                Seleccionar Ruta
              </Label>
              <Select value={selectedRuta} onValueChange={setSelectedRuta}>
                <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecciona una ruta" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">
                    Todas las Rutas
                  </SelectItem>
                  {rutas
                    .filter((ruta) => ruta && !ruta.nombre.toLowerCase().includes("ruta local"))
                    .map((ruta) => (
                      <SelectItem
                        key={ruta.id}
                        value={ruta.id}
                        className="text-white hover:bg-gray-700"
                      >
                        {ruta.nombre}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tercera fila: Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Toggle Refrigerador */}
              <AppleToggle
                checked={filtroRefrigerador}
                onCheckedChange={(checked) => {
                  console.log("Cambiando filtro refrigerador a:", checked)
                  setFiltroRefrigerador(checked)
                }}
                label="Filtrar por Refrigerador"
                description="Mostrar solo clientes que tienen refrigerador asignado"
              />

              {/* Toggle Salidas de Efectivo */}
              <AppleToggle
                checked={incluirSalidasEfectivo}
                onCheckedChange={(checked) => {
                  console.log("Cambiando incluir salidas a:", checked)
                  setIncluirSalidasEfectivo(checked)
                }}
                label="Incluir Salidas de Efectivo"
                description="Mostrar descuentos por gastos autorizados del repartidor"
              />
            </div>

            {/* Botón Generar Reporte */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleGenerateReport}
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="h-4 w-4" />
                Generar Reporte
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados del Reporte - Solo se muestran después de generar */}
        {reporteGenerado && (
          <>
            {/* Tabla Principal de Pedidos */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Detalle de Ventas</CardTitle>
                    <CardDescription className="text-blue-200">
                      Reporte generado para {getRangeText(timeRange)} •{" "}
                      {selectedRutero === "all"
                        ? "Todos los repartidores"
                        : ruteros.find((r) => r.id.toString() === selectedRutero)?.nombre}{" "}
                      •{" "}
                      {selectedCliente === "all"
                        ? "Todos los clientes"
                        : clientes.find((c) => c.id === selectedCliente)?.local}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={exportToExcel}
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-green-400" />
                      Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="rounded-md border border-gray-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-gray-800">
                        <TableHead className="text-blue-300">No. Pedido</TableHead>
                        <TableHead className="text-blue-300">Fecha</TableHead>
                        <TableHead className="text-blue-300">Repartidor</TableHead>
                        <TableHead className="text-blue-300">Cliente</TableHead>
                        <TableHead className="text-blue-300">Estado</TableHead>
                        <TableHead className="text-blue-300">Motivo cancelación</TableHead>
                        <TableHead className="text-blue-300">Refrigerador</TableHead>
                        <TableHead className="text-blue-300">Productos Vendidos</TableHead>
                        <TableHead className="text-right text-blue-300">Total Venta</TableHead>
                        <TableHead className="text-right text-blue-300">Crédito</TableHead>
                        <TableHead className="text-right text-blue-300">Cobrado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPedidos.map((pedido, index) => (
                        <TableRow
                          key={pedido.uuid ?? `${pedido.id}-${index}`}
                          className={`border-gray-700 hover:bg-gray-800 ${pedido.estado === 'cancelado' ? 'bg-red-950/30 hover:bg-red-900/20' : pedido.estado === 'descancelado' ? 'bg-amber-900/20 hover:bg-amber-800/20' : ''}`}
                        >
                          <TableCell className="font-medium text-white">#{pedido.id}</TableCell>
                          <TableCell className="text-gray-300">
                            {format(new Date(pedido.fecha), "dd/MM/yyyy", { locale: es })}
                          </TableCell>
                          <TableCell className="text-gray-300">{pedido.rutero}</TableCell>
                          <TableCell className="text-gray-300">{pedido.cliente}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-semibold ${pedido.estado === 'cancelado' ? 'bg-red-500/20 text-red-300' : pedido.estado === 'descancelado' ? 'bg-amber-500/20 text-amber-200' : 'bg-green-500/20 text-green-300'}`}
                            >
                              {pedido.estado === 'cancelado' ? 'Cancelado' : pedido.estado === 'descancelado' ? 'Descancelado' : 'Completado'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-300">
                            {pedido.estado === 'cancelado' || pedido.estado === 'descancelado' ? pedido.motivo_cancelacion || 'Sin motivo' : '—'}
                          </TableCell>
                          <TableCell>
                            {clientes.find((c) => c.local === pedido.cliente)?.tiene_refrigerador ? (
                              <span className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-300 text-xs font-medium">
                                Sí
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-md bg-gray-700/40 text-gray-400 text-xs font-medium">
                                No
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {pedido.productos.map((producto, productoIndex) => (
                                <div key={`${producto.nombre}-${productoIndex}`} className="text-sm">
                                  <span className="font-medium text-white">{producto.nombre}</span> -{" "}
                                  {producto.cantidad} unidades
                                  <span className="text-blue-300 ml-2">
                                    (${producto.precio_unitario} c/u = ${producto.subtotal})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${pedido.estado === 'cancelado' ? 'text-red-300 line-through' : pedido.estado === 'descancelado' ? 'text-amber-300' : 'text-green-400'}`}
                          >
                            ${pedido.total.toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={`text-right ${pedido.estado === 'cancelado' ? 'text-red-300 line-through' : pedido.estado === 'descancelado' ? 'text-amber-300' : 'text-orange-300'}`}
                          >
                            ${Number(pedido.credito_usado || 0).toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={`text-right ${pedido.estado === 'cancelado' ? 'text-red-300 line-through' : pedido.estado === 'descancelado' ? 'text-amber-300' : 'text-green-300'}`}
                          >
                            ${Number(pedido.efectivo_cobrado || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totales */}
                <div className="mt-6 space-y-2">
                  <Separator className="bg-gray-700" />
                  <div className="flex justify-end space-y-2">
                    <div className="text-right space-y-1">
                      <div className="flex justify-between items-center min-w-[300px]">
                        <span className="font-medium text-white">Total de Ventas:</span>
                        <span className="font-bold text-lg text-green-400">${totalVentas.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center min-w-[300px]">
                        <span className="text-gray-300">Crédito usado:</span>
                        <span className="text-orange-300">${totalCredito.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center min-w-[300px]">
                        <span className="text-gray-300">Efectivo cobrado:</span>
                        <span className="text-green-300">${totalEfectivoCobrado.toLocaleString()}</span>
                      </div>

                      {incluirSalidasEfectivo && salidasEfectivoFiltradas.length > 0 && (
                        <>
                          <div className="flex justify-between items-center min-w-[300px] text-red-400">
                            <span>Salidas de Efectivo:</span>
                            <span>-${totalSalidas.toLocaleString()}</span>
                          </div>
                          <Separator className="bg-gray-700" />
                          <div className="flex justify-between items-center min-w-[300px]">
                            <span className="font-bold text-white">Total Neto:</span>
                            <span className="font-bold text-xl text-blue-400">${totalNeto.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de Salidas de Efectivo */}
            {incluirSalidasEfectivo && salidasEfectivoFiltradas.length > 0 && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="border-b border-gray-800">
                  <CardTitle className="text-white">Salidas de Efectivo</CardTitle>
                  <CardDescription className="text-blue-200">
                    Gastos autorizados para el período seleccionado
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="rounded-md border border-gray-700">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700 hover:bg-gray-800">
                          <TableHead className="text-blue-300">Fecha</TableHead>
                          <TableHead className="text-blue-300">Repartidor</TableHead>
                          <TableHead className="text-blue-300">Motivo</TableHead>
                          <TableHead className="text-right text-blue-300">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salidasEfectivoFiltradas.map((salida) => (
                          <TableRow key={salida.id} className="border-gray-700 hover:bg-gray-800">
                            <TableCell className="text-gray-300">
                              {format(new Date(salida.fecha), "dd/MM/yyyy", { locale: es })}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {ruteros.find((r) => r.id === salida.rutero_id)?.nombre}
                            </TableCell>
                            <TableCell className="text-gray-300">{salida.motivo}</TableCell>
                            <TableCell className="text-right font-medium text-red-400">
                              ${salida.monto.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabla de Resumen de Productos */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="text-white">Resumen de Productos Vendidos</CardTitle>
                <CardDescription className="text-blue-200">Cantidad total vendida por tipo de producto</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="rounded-md border border-gray-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-gray-800">
                        <TableHead className="text-blue-300">Producto</TableHead>
                        <TableHead className="text-center text-blue-300">Cantidad Vendida</TableHead>
                        <TableHead className="text-right text-blue-300">Precio Unitario</TableHead>
                        <TableHead className="text-right text-blue-300">Total Vendido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productosResumen.map((producto) => (
                        <TableRow key={producto.nombre} className="border-gray-700 hover:bg-gray-800">
                          <TableCell className="font-medium text-white">{producto.nombre}</TableCell>
                          <TableCell className="text-center text-gray-300">
                            {producto.cantidad_total} unidades
                          </TableCell>
                          <TableCell className="text-right text-gray-300">
                            ${producto.precio_unitario.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-400">
                            ${producto.total_vendido.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
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
