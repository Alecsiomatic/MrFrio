"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { CheckCircle, XCircle, X, AlertCircle } from "lucide-react"

export type ToastType = "success" | "error" | "info"

type ToastProps = {
  message: string
  type: ToastType
  duration?: number
  onClose: () => void
}

export function Toast({ message, type, duration = 5000, onClose }: ToastProps) {
  const [mounted, setMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Asegurarse de que el componente está montado antes de usar createPortal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Controlar la animación de entrada y salida
  useEffect(() => {
    if (mounted) {
      // Pequeño retraso para que la animación funcione correctamente
      const showTimer = setTimeout(() => {
        setIsVisible(true)
      }, 10)

      // Configurar el temporizador para cerrar automáticamente
      const closeTimer = setTimeout(() => {
        setIsVisible(false)
        // Esperar a que termine la animación antes de llamar a onClose
        setTimeout(onClose, 300)
      }, duration)

      return () => {
        clearTimeout(showTimer)
        clearTimeout(closeTimer)
      }
    }
  }, [mounted, duration, onClose])

  // Determinar el icono y los colores según el tipo
  const getToastStyles = () => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-400" />,
          bgColor: "bg-green-900/20",
          borderColor: "border-green-500/30",
          textColor: "text-green-400",
        }
      case "error":
        return {
          icon: <XCircle className="h-5 w-5 text-red-400" />,
          bgColor: "bg-red-900/20",
          borderColor: "border-red-500/30",
          textColor: "text-red-400",
        }
      case "info":
        return {
          icon: <AlertCircle className="h-5 w-5 text-blue-400" />,
          bgColor: "bg-blue-900/20",
          borderColor: "border-blue-500/30",
          textColor: "text-blue-400",
        }
      default:
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-400" />,
          bgColor: "bg-green-900/20",
          borderColor: "border-green-500/30",
          textColor: "text-green-400",
        }
    }
  }

  const styles = getToastStyles()

  // Manejar el cierre manual
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  // El toast que se renderizará en el portal
  const toastContent = mounted
    ? createPortal(
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-300 ${
            styles.bgColor
          } ${styles.borderColor} ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          style={{ maxWidth: "calc(100% - 2rem)" }}
        >
          {styles.icon}
          <p className={`text-sm ${styles.textColor}`}>{message}</p>
          <button
            onClick={handleClose}
            className="ml-2 rounded-full p-1 hover:bg-black/20 transition-colors"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>,
        document.body,
      )
    : null

  return toastContent
}

// Componente para gestionar múltiples toasts
type ToastItem = {
  id: string
  message: string
  type: ToastType
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = (message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const ToastContainer = () => (
    <>
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}
    </>
  )

  return {
    showToast,
    ToastContainer,
  }
}
