"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { TrendingUp, Wallet, AlertTriangle, ArrowRight, Plus, Calendar, Bell, CreditCard, Receipt, Sparkles, Target, PiggyBank } from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/utils"
import Link from "next/link"

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

interface DashboardData {
  analysis: any
  plan: any
  recentTransactions: any[]
  currentMonth: number
  currentYear: number
  needsNewMonth: boolean
  fixedExpenses: number
  debtsPayment: number
  variableSpending: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (status === "unauthenticated") router.push("/") }, [status, router])

  useEffect(() => {
    async function loadData() {
      try {
        const [diagRes, planRes, transRes, monthRes, expRes, debtRes] = await Promise.all([
          fetch("/api/diagnostico"), fetch("/api/plan"), fetch("/api/transactions"), fetch("/api/monthly"), fetch("/api/expenses?type=FIXA"), fetch("/api/debts")
        ])
        const [diagData, planData, transData, monthData, expData, debtData] = await Promise.all([diagRes.json(), planRes.json(), transRes.json(), monthRes.json(), expRes.json(), debtRes.json()])

        const now = new Date()
        const realMonth = now.getMonth() + 1
        const realYear = now.getFullYear()
        const needsNewMonth = monthData.currentMonth && monthData.currentYear && (realYear > monthData.currentYear || (realYear === monthData.currentYear && realMonth > monthData.currentMonth))

        const fixedExpenses = expData.expenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0
        const debtsPayment = debtData.debts?.reduce((sum: number, d: any) => sum + d.monthlyPayment, 0) || 0
        const variableSpending = transData.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0

        setData({
          analysis: diagData.analysis || {},
          plan: planData.plan,
          recentTransactions: transData.transactions?.slice(0, 5) || [],
          currentMonth: monthData.currentMonth || realMonth,
          currentYear: monthData.currentYear || realYear,
          needsNewMonth: needsNewMonth || false,
          fixedExpenses, debtsPayment, variableSpending
        })
      } catch (error) { console.error("Erro:", error) }
      setLoading(false)
    }
    if (status === "authenticated") loadData()
  }, [status])

  if (status === "loading" || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
      </AppLayout>
    )
  }

  const analysis = data?.analysis || {}
  const hasData = analysis.totalIncome > 0
  const totalCompromissos = (data?.fixedExpenses || 0) + (data?.debtsPayment || 0)
  const totalGasto = totalCompromissos + (data?.variableSpending || 0)
  const saldoDisponivel = (analysis.totalIncome || 0) - totalGasto
  const percentGasto = totalGasto / (analysis.totalIncome || 1)

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Alerta Novo Mês */}
        {data?.needsNewMonth && (
          <Link href="/novo-mes">
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl flex items-center justify-between hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Hora de iniciar um novo mês!</p>
                  <p className="text-sm text-gray-600">Feche {months[(data.currentMonth || 1) - 1]} e comece {months[new Date().getMonth()]}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Olá, {session?.user?.name ? session.user.name.split(" ")[0] : "Usuário"}! 
              <span className="inline-block ml-2 animate-pulse">👋</span>
            </h1>
            <p className="text-gray-500 mt-1">
              {hasData ? "Acompanhe sua saúde financeira em tempo real." : "Complete o diagnóstico para começar."}
            </p>
          </div>
          {data?.currentMonth && data?.currentYear && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-100/50 rounded-xl">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
                {months[(data.currentMonth || 1) - 1]}/{data.currentYear}
              </span>
            </div>
          )}
        </div>

        {!hasData ? (
          /* Estado vazio - sem dados */
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Vamos começar sua jornada financeira</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Para ter acesso ao dashboard completo com insights personalizados, primeiro precisamos conhecer sua situação financeira.
            </p>
            <Link 
              href="/diagnostico" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="w-5 h-5" />
              Iniciar Diagnóstico
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <>
            {/* Cards principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Receita */}
              <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-emerald-100 text-sm font-medium">Receita Mensal</span>
                </div>
                <p className="text-3xl font-bold">{formatCurrency(analysis.totalIncome || 0)}</p>
                <p className="text-emerald-200 text-sm mt-1">Base do seu orçamento</p>
              </div>

              {/* Compromissos */}
              <Link href="/compromissos" className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-500 text-sm font-medium">Compromissos</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCompromissos)}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  <span>Fixas: {formatCurrency(data?.fixedExpenses || 0)}</span>
                  <span>•</span>
                  <span>Dívidas: {formatCurrency(data?.debtsPayment || 0)}</span>
                </div>
              </Link>

              {/* Gastos */}
              <Link href="/gastos" className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Receipt className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-gray-500 text-sm font-medium">Gastos Variáveis</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data?.variableSpending || 0)}</p>
                <p className="text-xs text-gray-500 mt-2">{data?.recentTransactions?.length || 0} transações este mês</p>
              </Link>

              {/* Saldo */}
              <div className={`p-6 rounded-2xl shadow-sm border ${saldoDisponivel >= 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${saldoDisponivel >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <PiggyBank className={`w-5 h-5 ${saldoDisponivel >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <span className="text-gray-500 text-sm font-medium">Saldo Disponível</span>
                </div>
                <p className={`text-2xl font-bold ${saldoDisponivel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(saldoDisponivel)}
                </p>
                <p className="text-xs text-gray-500 mt-2">{formatPercent(percentGasto)} comprometido</p>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Distribuição do Orçamento</h2>
                <span className="text-sm text-gray-500">{formatPercent(1 - percentGasto)} livre</span>
              </div>
              <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500" 
                  style={{ width: `${((data?.fixedExpenses || 0) / (analysis.totalIncome || 1)) * 100}%` }} 
                />
                <div 
                  className="bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-500" 
                  style={{ width: `${((data?.debtsPayment || 0) / (analysis.totalIncome || 1)) * 100}%` }} 
                />
                <div 
                  className="bg-gradient-to-r from-orange-400 to-amber-500 transition-all duration-500" 
                  style={{ width: `${((data?.variableSpending || 0) / (analysis.totalIncome || 1)) * 100}%` }} 
                />
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" />
                  <span className="text-sm text-gray-600">Fixas ({formatPercent((data?.fixedExpenses || 0) / (analysis.totalIncome || 1))})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-rose-500 rounded-full" />
                  <span className="text-sm text-gray-600">Dívidas ({formatPercent((data?.debtsPayment || 0) / (analysis.totalIncome || 1))})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full" />
                  <span className="text-sm text-gray-600">Variáveis ({formatPercent((data?.variableSpending || 0) / (analysis.totalIncome || 1))})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full" />
                  <span className="text-sm text-gray-600">Disponível ({formatPercent(1 - percentGasto)})</span>
                </div>
              </div>
            </div>

            {/* Grid inferior */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Pontos de Atenção */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-gray-900">Pontos de Atenção</h2>
                </div>
                {analysis.criticalPoints?.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.criticalPoints.map((point: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100/50">
                        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-amber-600 text-xs font-bold">{index + 1}</span>
                        </div>
                        <p className="text-sm text-gray-700">{point}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Target className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-gray-500">Nenhum ponto crítico. Continue assim!</p>
                  </div>
                )}
              </div>

              {/* Ações Rápidas */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
                <div className="space-y-3">
                  <Link 
                    href="/gastos" 
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl hover:from-emerald-100 hover:to-teal-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Plus className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium text-emerald-700">Registrar Gasto</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  
                  <Link 
                    href="/compromissos" 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Ver Compromissos</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  
                  <Link 
                    href="/assistente" 
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-sm font-medium text-purple-700">Assistente IA</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Últimos Gastos */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Últimos Gastos</h2>
                <Link href="/gastos" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  Ver todos →
                </Link>
              </div>
              {data?.recentTransactions && data.recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {data.recentTransactions.map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-sm text-gray-500">
                            {transaction.category?.name} • {new Date(transaction.date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-red-500">-{formatCurrency(transaction.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum gasto registrado este mês.</p>
                  <Link href="/gastos" className="inline-flex items-center gap-2 mt-3 text-sm text-emerald-600 hover:text-emerald-700">
                    <Plus className="w-4 h-4" /> Registrar primeiro gasto
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
