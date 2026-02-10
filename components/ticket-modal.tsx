// src/components/ticket-modal.tsx
"use client"

// Asegúrate de instalar headlessui para que no marque error:
//   npm install @headlessui/react
import React, { useRef, useEffect } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { X } from "lucide-react"

type ProductoVenta = {
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

type TicketData = {
  clienteNombre: string
  clienteDireccion: string
  fecha: string
  productos: ProductoVenta[]
  creditoUsado?: number
  limiteCredito?: number
  creditoDisponible?: number
  total: number
  esCredito: boolean
}

interface TicketModalProps {
  isOpen: boolean
  onClose: () => void
  ticketData: TicketData
}

export function TicketModal({ isOpen, onClose, ticketData }: TicketModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && printRef.current) {
      printRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [isOpen])

  const handleImprimir = () => {
    window.print()
  }

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={onClose}
      >
        <div className="min-h-screen px-4 text-center bg-black/50">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-90"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-90"
          >
            <div
              className="print-container inline-block w-full max-w-md p-6 my-16 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl"
              ref={printRef}
            >
              {/* Encabezado centrado */}
              <div className="flex justify-center mb-4 relative">
                <h2 className="text-2xl font-bold text-gray-800 text-center">
                  Ticket De Venta Mr Frío
                </h2>
                <button
                  className="absolute right-0 top-0 text-gray-500 hover:text-gray-700"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Cuerpo del ticket */}
              <div className="text-gray-700">
                <div className="mb-1">
                  <span className="font-semibold">Cliente:</span>{" "}
                  {ticketData.clienteNombre}
                </div>
                <div className="mb-2 text-sm text-gray-600">
                  {ticketData.clienteDireccion}
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Fecha:</span>{" "}
                  {ticketData.fecha}
                </div>
                <div className="border-t border-gray-300 my-2" />

                <div className="mb-4">
                  <span className="font-semibold">Productos:</span>
                  <ul className="mt-2 space-y-1">
                    {ticketData.productos.map((prod, idx) => (
                      <li key={idx} className="text-gray-700 text-sm">
                        {prod.nombre} x {prod.cantidad}{" "}
                        <span className="text-gray-600">
                          (
                          {new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: "MXN",
                            minimumFractionDigits: 2,
                          }).format(prod.precioUnitario)}{" "}
                          c/u) ={" "}
                          {new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: "MXN",
                            minimumFractionDigits: 2,
                          }).format(prod.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-gray-300 my-2" />

                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">Total:</span>
                  <span className="font-bold text-gray-800">
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                      minimumFractionDigits: 2,
                    }).format(ticketData.total)}
                  </span>
                </div>

                {ticketData.esCredito && ticketData.creditoUsado !== undefined && (
                  <div className="mb-2 text-sm italic text-gray-600">
                    Venta a crédito:{" "}
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                      minimumFractionDigits: 2,
                    }).format(ticketData.creditoUsado)}
                  </div>
                )}
                {ticketData.esCredito && ticketData.creditoDisponible !== undefined && (
                  <div className="mb-2 text-sm italic text-gray-600">
                    Crédito disponible:{" "}
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                      minimumFractionDigits: 2,
                    }).format(ticketData.creditoDisponible)}
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={handleImprimir}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Imprimir Ticket
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>

        {/* Estilos CSS para impresión */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-container,
            .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
      </Dialog>
    </Transition>
  )
}
