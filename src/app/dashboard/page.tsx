"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { TrendingUp, Wallet, AlertTriangle, ArrowRight, Plus, Calendar, CreditCard, Receipt, History } from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/utils"
import Link from "next/link"

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

interface DashboardData {
  analysis: any
  plan: any
  recentTransactions: any[]
  currentMonth: number
  currentYear: number
  closingDay: number | null
  fixedExpenses: number
  debtsPayment: number
  variableSpending: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiTips, setAiTips] = useState<string[]>([])

  useEffect(() => { if (status === "unauthenticated") router.push("/") }, [status, router])

  useEffect(() => {
    async function loadData() {
      try {
        // Primeiro, buscar mês atual
        const monthRes = await fetch("/api/monthly")
        const monthData = await monthRes.json()
        
        const currentMonth = monthData.currentMonth
        const currentYear = monthData.currentYear

        // Agora buscar dados com filtro de mês
        const [diagRes, planRes, transRes, expRes, debtRes] = await Promise.all([
          fetch("/api/diagnostico"),
          fetch("/api/plan"),
          fetch(`/api/transactions?month=${currentMonth}&year=${currentYear}`),
          fetch("/api/expenses?type=FIXA"),
          fetch("/api/debts")
        ])
        
        const [diagData, planData, transData, expData, debtData] = await Promise.all([
          diagRes.json(), planRes.json(), transRes.json(), expRes.json(), debtRes.json()
        ])

        const fixedExpenses = expData.expenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0
        const debtsPayment = debtData.debts?.reduce((sum: number, d: any) => sum + d.monthlyPayment, 0) || 0
        const variableSpending = transData.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0

        setData({
          analysis: diagData.analysis || {},
          plan: planData.plan,
          recentTransactions: transData.transactions?.slice(0, 5) || [],
          currentMonth,
          currentYear,
          closingDay: monthData.closingDay || null,
          fixedExpenses, debtsPayment, variableSpending
        })

        // Carregar dicas IA
        try {
          const tipsRes = await fetch("/api/ai/tips")
          const tipsData = await tipsRes.json()
          if (tipsData.tips) setAiTips(tipsData.tips)
        } catch (e) { console.error("Erro ao carregar dicas:", e) }
      } catch (error) { console.error("Erro:", error) }
      setLoading(false)
    }
    if (status === "authenticated") loadData()
  }, [status])

  if (status === "loading" || loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div></AppLayout>

  const analysis = data?.analysis || {}
  const hasData = analysis.totalIncome > 0
  const totalCompromissos = (data?.fixedExpenses || 0) + (data?.debtsPayment || 0)
  const totalGasto = totalCompromissos + (data?.variableSpending || 0)

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Olá, {session?.user?.name ? session.user.name.split(" ")[0] : "Usuário"}!</h1>
            <p className="text-gray-500">{hasData ? "Veja como está sua saúde financeira hoje." : "Complete o diagnóstico para ver seu panorama financeiro."}</p>
          </div>
          <div className="flex items-center gap-3">
            {data?.currentMonth && data?.currentYear && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">{months[(data.currentMonth || 1) - 1]}/{data.currentYear}</span>
              </div>
            )}
            <Link href="/historico" className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              <History className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Histórico</span>
            </Link>
          </div>
        </div>

        {!hasData ? (
          <div className="bg-white p-8 rounded-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Bem-vindo ao FinAI!</h2>
            <p className="text-gray-500 mb-6">Para começar, faça o diagnóstico financeiro e veja insights personalizados.</p>
            <Link href="/diagnostico" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
              Fazer Diagnóstico <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">Receitas</p>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analysis.totalIncome)}</p>
              </div>

              <div className="bg-white p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">Compromissos Fixos</p>
                  <Receipt className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCompromissos)}</p>
                <p className="text-xs text-gray-500 mt-1">Fixas + Dívidas</p>
              </div>

              <div className="bg-white p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">Gastos Variáveis</p>
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data?.variableSpending || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Mês atual</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Saldo</h2>
                  <Wallet className="w-5 h-5 text-gray-400" />
                </div>
                <p className={`text-3xl font-bold ${analysis.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(analysis.balance)}
                </p>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Composição</p>
                  <p className="text-sm text-gray-700">Receitas - Compromissos - Gastos Variáveis</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(analysis.totalIncome)} - {formatCurrency(totalCompromissos)} - {formatCurrency(data?.variableSpending || 0)}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Taxa de Poupança</h2>
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <p className={`text-3xl font-bold ${analysis.savingsRate >= 20 ? "text-green-600" : analysis.savingsRate >= 10 ? "text-yellow-600" : "text-red-600"}`}>
                  {formatPercent(analysis.savingsRate)}
                </p>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${analysis.savingsRate >= 20 ? "bg-green-600" : analysis.savingsRate >= 10 ? "bg-yellow-600" : "bg-red-600"}`} style={{ width: `${Math.min(analysis.savingsRate, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Meta: 20%</p>
                </div>
              </div>
            </div>

            {aiTips.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Dicas Personalizadas</h2>
                </div>
                <div className="space-y-2">
                  {aiTips.slice(0, 3).map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2"></div>
                      <p className="text-sm text-gray-700">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Últimos Gastos</h2>
                <Link href="/gastos" className="text-sm text-blue-600 hover:text-blue-700">Ver todos</Link>
              </div>
              {data?.recentTransactions && data.recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {data.recentTransactions.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{t.description}</p>
                        <p className="text-xs text-gray-500">{t.category?.name || "Sem categoria"}</p>
                      </div>
                      <p className="font-bold text-gray-900">{formatCurrency(t.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Nenhum gasto registrado ainda</p>
                  <Link href="/gastos" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> Adicionar Gasto
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
