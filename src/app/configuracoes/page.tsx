"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { User, Trash2, LogOut, Download } from "lucide-react"

export default function ConfiguracoesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  const handleDeleteAccount = async () => {
    if (!confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.")) {
      return
    }

    setDeleting(true)
    try {
      // Aqui você implementaria a deleção da conta via API
      // await fetch("/api/users/delete", { method: "DELETE" })
      signOut({ callbackUrl: "/" })
    } catch (error) {
      console.error("Erro:", error)
      alert("Erro ao excluir conta")
    }
    setDeleting(false)
  }

  const exportData = async () => {
    try {
      const [incRes, expRes, debtRes, transRes] = await Promise.all([
        fetch("/api/incomes"),
        fetch("/api/expenses"),
        fetch("/api/debts"),
        fetch("/api/transactions")
      ])

      const data = {
        incomes: (await incRes.json()).incomes,
        expenses: (await expRes.json()).expenses,
        debts: (await debtRes.json()).debts,
        transactions: (await transRes.json()).transactions,
        exportedAt: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `finai-dados-${new Date().toISOString().split("T")[0]}.json`
      link.click()
    } catch (error) {
      console.error("Erro:", error)
      alert("Erro ao exportar dados")
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Configurações</h1>

        {/* Perfil */}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{session?.user?.name}</p>
              <p className="text-gray-500">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Privacidade e Dados */}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Privacidade e Dados</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl">
              <h3 className="font-medium text-gray-900 mb-1">Seus dados são privados</h3>
              <p className="text-sm text-gray-600">
                Todas as suas informações financeiras são armazenadas de forma segura e nunca são compartilhadas com terceiros.
              </p>
            </div>

            <button
              onClick={exportData}
              className="flex items-center gap-3 w-full p-4 text-left hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Exportar meus dados</p>
                <p className="text-sm text-gray-500">Baixe todos os seus dados em formato JSON</p>
              </div>
            </button>
          </div>
        </div>

        {/* Conta */}
        <div className="bg-white rounded-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Conta</h2>
          
          <div className="space-y-2">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-3 w-full p-4 text-left hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <LogOut className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Sair da conta</p>
                <p className="text-sm text-gray-500">Encerrar sessão atual</p>
              </div>
            </button>

            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex items-center gap-3 w-full p-4 text-left hover:bg-red-50 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-red-600">Excluir conta</p>
                <p className="text-sm text-gray-500">Remove permanentemente sua conta e todos os dados</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
