"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronRight,
  FileText,
  Loader2
} from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/utils"

const months = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
]

interface MonthlyClose {
  id: string
  month: number
  year: number
  totalIncome: number
  totalExpenses: number
  totalDebts: number
  totalTransactions: number
  balance: number
  savingsRate: number | null
  status: string
  closedAt: string
}

export default function HistoricoPage() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<MonthlyClose[]>([])
  const [selectedMonth, setSelectedMonth] = useState<MonthlyClose | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/monthly?action=history")
        const data = await res.json()
        setHistory(data.history || [])
      } catch (error) {
        console.error("Erro ao carregar histórico:", error)
      }
      setLoading(false)
    }
    loadHistory()
  }, [])

  const getMonthName = (month: number) => {
    return months.find(m => m.value === month)?.label || ""
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Histórico Mensal</h1>
          <p className="text-gray-500">Veja o fechamento de cada mês</p>
        </div>

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Nenhum mês fechado</h2>
            <p className="text-gray-500 mb-6">
              Quando você fechar um mês, o relatório aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {history.map((item) => (
              <div 
                key={item.id}
                onClick={() => setSelectedMonth(selectedMonth?.id === item.id ? null : item)}
                className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {getMonthName(item.month)} de {item.year}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Fechado em {new Date(item.closedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Saldo</p>
                      <p className={`font-bold ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.balance)}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      selectedMonth?.id === item.id ? 'rotate-90' : ''
                    }`} />
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {selectedMonth?.id === item.id && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="grid sm:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-green-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-600">Receitas</span>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(item.totalIncome)}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-gray-600">Despesas</span>
                        </div>
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(item.totalExpenses)}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <Wallet className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-600">Dívidas</span>
                        </div>
                        <p className="text-lg font-bold text-orange-600">
                          {formatCurrency(item.totalDebts)}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-gray-600">Gastos</span>
                        </div>
                        <p className="text-lg font-bold text-purple-600">
                          {formatCurrency(item.totalTransactions)}
                        </p>
                      </div>
                    </div>

                    {item.savingsRate !== null && (
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-gray-600">Taxa de Poupança do Mês</p>
                        <p className={`text-xl font-bold ${
                          item.savingsRate >= 0 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {formatPercent(item.savingsRate)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.savingsRate >= 20 
                            ? "Excelente! Você poupou mais de 20% da renda."
                            : item.savingsRate >= 10
                            ? "Bom! Continue assim."
                            : item.savingsRate >= 0
                            ? "Tente poupar pelo menos 20% da renda."
                            : "Atenção: você gastou mais do que ganhou neste mês."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
