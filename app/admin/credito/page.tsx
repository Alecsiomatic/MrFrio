import { AdminCreditoContent } from "@/components/admin-credito-content"

export default function AdminCreditoPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6 text-white">Administración de Crédito</h1>
      <AdminCreditoContent />
    </div>
  )
}
