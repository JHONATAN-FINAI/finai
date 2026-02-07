"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { Calendar, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronUp, Receipt, ArrowLeft } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

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
  transactionDetails: Record<string, { name: string, total: number, count: number }>
  closedAt: string
}

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  category: { name: string }
  paymentMethod: string
}

export default function HistoricoPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [history, setHistory] = useState<MonthlyClose[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<MonthlyClose | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  useEffect(() => { if (status === "unauthenticated") router.push("/") }, [status, router])

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/monthly?action=history")
        const data = await res.json()
        setHistory(data.history || [])
      } catch (error) { console.error("Erro:", error) }
      setLoading(false)
    }
    if (status === "authenticated") loadHistory()
  }, [status])

  const loadMonthDetails = async (monthData: MonthlyClose) => {
    if (selectedMonth?.id === monthData.id) {
      setSelectedMonth(null)
      setTransactions([])
      return
    }

    setLoadingTransactions(true)
    setSelectedMonth(monthData)

    try {
      const res = await fetch(`/api/monthly?action=month&month=${monthData.month}&year=${monthData.year}`)
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch (error) { console.error("Erro:", error) }
    setLoadingTransactions(false)
  }

  const toggleExpand = (id: string) => {
    setExpandedMonth(expandedMonth === id ? null : id)
  }

  if (status === "loading" || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Histórico Mensal</h1>
          <p className="text-gray-500">Consulte os gastos de meses anteriores</p>
        </div>

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhum histórico disponível</h2>
            <p className="text-gray-500">Quando você fechar o primeiro mês, ele aparecerá aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden">
                <button
                  onClick={() => loadMonthDetails(item)}
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{months[item.month - 1]} {item.year}</p>
                      <p className="text-sm text-gray-500">Fechado em {new Date(item.closedAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Saldo</p>
                      <p className={`font-bold ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.balance)}
                      </p>
                    </div>
                    {selectedMonth?.id === item.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {selectedMonth?.id === item.id && (
                  <div className="border-t px-6 py-6">
                    {/* Resumo do mês */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-green-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700">Receitas</span>
                        </div>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(item.totalIncome)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Receipt className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-700">Fixas</span>
                        </div>
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(item.totalExpenses)}</p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-orange-700">Dívidas</span>
                        </div>
                        <p className="text-lg font-bold text-orange-600">{formatCurrency(item.totalDebts)}</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-700">Variáveis</span>
                        </div>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(item.totalTransactions)}</p>
                      </div>
                    </div>

                    {/* Gastos por categoria */}
                    {item.transactionDetails && Object.keys(item.transactionDetails).length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-3">Gastos por Categoria</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(item.transactionDetails).map(([catId, cat]) => (
                            <div key={catId} className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-600">{cat.name}</p>
                              <p className="font-bold text-gray-900">{formatCurrency(cat.total)}</p>
                              <p className="text-xs text-gray-500">{cat.count} transações</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lista de transações */}
                    <div>
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3"
                      >
                        {expandedMonth === item.id ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Ocultar transações
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Ver todas as transações ({transactions.length})
                          </>
                        )}
                      </button>

                      {expandedMonth === item.id && (
                        loadingTransactions ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        ) : transactions.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {transactions.map((t) => (
                              <div key={t.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-gray-900">{t.description}</p>
                                  <p className="text-sm text-gray-500">
                                    {t.category?.name} • {new Date(t.date).toLocaleDateString('pt-BR')} • {t.paymentMethod.replace('_', ' ')}
                                  </p>
                                </div>
                                <p className="font-medium text-red-600">-{formatCurrency(t.amount)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">Nenhuma transação neste mês</p>
                        )
                      )}
                    </div>
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
