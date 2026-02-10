"use client"

import { useState, useEffect } from "react"

interface AppleToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  description: string
}

export function AppleToggle({ checked, onCheckedChange, label, description }: AppleToggleProps) {
  // Estado local para manejar la animación y asegurar que el componente responda inmediatamente
  const [isChecked, setIsChecked] = useState(checked)

  // Sincronizar el estado local con el prop cuando cambia externamente
  useEffect(() => {
    setIsChecked(checked)
  }, [checked])

  const handleToggle = () => {
    const newValue = !isChecked
    setIsChecked(newValue)
    onCheckedChange(newValue)
  }

  return (
    <div
      className="flex items-center justify-between space-x-4 p-4 border border-gray-700 rounded-lg bg-gray-800/50 backdrop-blur-sm cursor-pointer"
      onClick={handleToggle}
    >
      <div className="space-y-1 flex-1">
        <h4 className="text-base font-medium text-white">{label}</h4>
        <p className="text-sm text-blue-300">{description}</p>
      </div>

      <div className="relative">
        <div
          className={`
            relative h-6 w-11 rounded-full transition-colors duration-300 ease-in-out
            ${isChecked ? "bg-blue-500" : "bg-gray-600"}
          `}
          role="switch"
          aria-checked={isChecked}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleToggle()
              e.preventDefault()
            }
          }}
        >
          <span
            className={`
              absolute top-1 left-1 inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out
              ${isChecked ? "translate-x-5" : "translate-x-0"}
            `}
          />
        </div>

        {/* Glow effect when active */}
        {isChecked && <div className="absolute inset-0 rounded-full bg-blue-400/30 blur-sm animate-pulse" />}
      </div>
    </div>
  )
}
