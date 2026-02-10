"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Store, Phone, MapPin, Loader2, Snowflake } from "lucide-react"

export function AddClientDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    storeName: "",
    phone: "",
    address: "",
  })
  const [errors, setErrors] = useState({
    storeName: "",
    phone: "",
    address: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Limpiar error cuando el usuario comienza a escribir
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    let valid = true
    const newErrors = { storeName: "", phone: "", address: "" }

    if (!formData.storeName.trim()) {
      newErrors.storeName = "El nombre de la tienda es requerido"
      valid = false
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El número de teléfono es requerido"
      valid = false
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Ingresa un número de teléfono válido (10 dígitos)"
      valid = false
    }

    if (!formData.address.trim()) {
      newErrors.address = "La dirección es requerida"
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Aquí iría la lógica para guardar el cliente en la base de datos
      // Simulamos una petici��n con un timeout
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Éxito
      setFormData({ storeName: "", phone: "", address: "" })
      setOpen(false)
    } catch (error) {
      console.error("Error al guardar el cliente:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Eliminar todos los caracteres no numéricos
    const numbers = value.replace(/\D/g, "")

    // Aplicar formato: (XXX) XXX-XXXX
    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    } else {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value)
    setFormData((prev) => ({ ...prev, phone: formattedValue }))

    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
          <UserPlus className="h-5 w-5 group-hover:animate-bounce" />
          Agregar Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="relative overflow-hidden border border-gray-700/50 rounded-xl p-8 backdrop-blur-sm bg-black/80 text-white max-w-md">
        {/* Elementos decorativos */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Snowflake className="h-6 w-6 text-blue-400" />
              <DialogTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                Agregar Nuevo Cliente
              </DialogTitle>
              <Snowflake className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-gray-300 text-center text-sm">
              Ingresa los datos del nuevo cliente para agregarlo al sistema
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="storeName" className="text-gray-300 flex items-center gap-2">
                <Store className="h-4 w-4 text-blue-400" />
                Nombre de la Tienda
              </Label>
              <Input
                id="storeName"
                name="storeName"
                placeholder="Ej. Abarrotes Don Juan"
                className="bg-gray-900/50 border-gray-700/50 text-white focus:border-blue-500/50 transition-colors"
                value={formData.storeName}
                onChange={handleChange}
              />
              {errors.storeName && <p className="text-red-400 text-sm">{errors.storeName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300 flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-400" />
                Número de Teléfono
              </Label>
              <Input
                id="phone"
                name="phone"
                placeholder="(444) 123-4567"
                className="bg-gray-900/50 border-gray-700/50 text-white focus:border-blue-500/50 transition-colors"
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength={14}
              />
              {errors.phone && <p className="text-red-400 text-sm">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-gray-300 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-400" />
                Dirección
              </Label>
              <Input
                id="address"
                name="address"
                placeholder="Ej. Av. Universidad 123, Col. Centro"
                className="bg-gray-900/50 border-gray-700/50 text-white focus:border-blue-500/50 transition-colors"
                value={formData.address}
                onChange={handleChange}
              />
              {errors.address && <p className="text-red-400 text-sm">{errors.address}</p>}
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 group bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-black/20 border border-gray-600/30"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Guardar Cliente
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Barra decorativa inferior */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-400"></div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
