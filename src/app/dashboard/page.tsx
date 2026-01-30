"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { TrendingUp, Wallet, AlertTriangle, ArrowRight, Plus, Calendar, Bell, CreditCard, Receipt } from "lucide-react"
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

  if (status === "loading" || loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div></AppLayout>

  const analysis = data?.analysis || {}
  const hasData = analysis.totalIncome > 0
  const totalCompromissos = (data?.fixedExpenses || 0) + (data?.debtsPayment || 0)
  const totalGasto = totalCompromissos + (data?.variableSpending || 0)

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {data?.needsNewMonth && (
          <Link href="/novo-mes">
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between hover:bg-orange-100 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center"><Bell className="w-5 h-5 text-orange-600" /></div>
                <div><p className="font-medium text-orange-800">Hora de iniciar um novo mês!</p><p className="text-sm text-orange-600">Feche {months[(data.currentMonth || 1) - 1]} e inicie o novo mês</p></div>
              </div>
              <ArrowRight className="w-5 h-5 text-orange-600" />
            </div>
          </Link>
        )}

        <div className="mb-8 flex items-start justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900">Olá, {session?.user?.name ? session.user.name.split(" ")[0] : "Usuário"}!</h1><p className="text-gray-500">{hasData ? "Veja como está sua saúde financeira hoje." : "Complete o diagnóstico para ver seu panorama financeiro."}</p></div>
          {data?.currentMonth && data?.currentYear && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl"><Calendar className="w-4 h-4 text-blue-600" /><span className="text-sm font-medium text-blue-600">{months[(data.currentMonth || 1) - 1]}/{data.currentYear}</span></div>
          )}
        </div>

        {!hasData ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"><Wallet className="w-8 h-8 text-blue-600" /></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vamos começar seu diagnóstico financeiro</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">Para ter acesso ao dashboard completo, primeiro precisamos conhecer sua situação financeira atual.</p>
            <Link href="/diagnostico" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">Iniciar Diagnóstico<ArrowRight className="w-5 h-5" /></Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-600" /></div><span className="text-sm text-gray-500">Receita Mensal</span></div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analysis.totalIncome || 0)}</p>
              </div>

              <Link href="/compromissos" className="bg-white p-6 rounded-2xl hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5 text-blue-600" /></div><span className="text-sm text-gray-500">Compromissos Fixos</span></div>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalCompromissos)}</p>
                <p className="text-xs text-gray-400 mt-1">Fixas: {formatCurrency(data?.fixedExpenses || 0)} | Dívidas: {formatCurrency(data?.debtsPayment || 0)}</p>
              </Link>

              <Link href="/gastos" className="bg-white p-6 rounded-2xl hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center"><Receipt className="w-5 h-5 text-orange-600" /></div><span className="text-sm text-gray-500">Gastos Variáveis</span></div>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(data?.variableSpending || 0)}</p>
                <p className="text-xs text-gray-400 mt-1">{data?.recentTransactions?.length || 0} transações este mês</p>
              </Link>

              <div className="bg-white p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><Wallet className="w-5 h-5 text-purple-600" /></div><span className="text-sm text-gray-500">Saldo Disponível</span></div>
                <p className={`text-2xl font-bold ${((analysis.totalIncome || 0) - totalGasto) >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency((analysis.totalIncome || 0) - totalGasto)}</p>
                <p className="text-xs text-gray-400 mt-1">{formatPercent(totalGasto / (analysis.totalIncome || 1))} comprometido</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl mb-8">
              <h2 className="text-sm font-medium text-gray-500 mb-4">Distribuição do Orçamento</h2>
              <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
                <div className="bg-blue-500 transition-all" style={{ width: `${((data?.fixedExpenses || 0) / (analysis.totalIncome || 1)) * 100}%` }} />
                <div className="bg-red-500 transition-all" style={{ width: `${((data?.debtsPayment || 0) / (analysis.totalIncome || 1)) * 100}%` }} />
                <div className="bg-orange-500 transition-all" style={{ width: `${((data?.variableSpending || 0) / (analysis.totalIncome || 1)) * 100}%` }} />
              </div>
              <div className="flex justify-between mt-3 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded" /><span className="text-gray-600">Fixas ({formatPercent((data?.fixedExpenses || 0) / (analysis.totalIncome || 1))})</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded" /><span className="text-gray-600">Dívidas ({formatPercent((data?.debtsPayment || 0) / (analysis.totalIncome || 1))})</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded" /><span className="text-gray-600">Variáveis ({formatPercent((data?.variableSpending || 0) / (analysis.totalIncome || 1))})</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded" /><span className="text-gray-600">Disponível ({formatPercent(1 - (totalGasto / (analysis.totalIncome || 1)))})</span></div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Pontos de Atenção</h2>
                {analysis.criticalPoints?.length > 0 ? (
                  <ul className="space-y-3">{analysis.criticalPoints.map((point: string, index: number) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl"><AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" /><p className="text-sm text-gray-700">{point}</p></li>
                  ))}</ul>
                ) : <p className="text-gray-500 text-center py-8">Nenhum ponto crítico identificado. Continue assim!</p>}
              </div>

              <div className="bg-white rounded-2xl p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Ações Rápidas</h2>
                <div className="space-y-3">
                  <Link href="/gastos" className="flex items-center justify-between p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"><div className="flex items-center gap-3"><Plus className="w-5 h-5 text-blue-600" /><span className="text-sm font-medium text-blue-600">Registrar Gasto</span></div><ArrowRight className="w-4 h-4 text-blue-600" /></Link>
                  <Link href="/compromissos" className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"><div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-gray-600" /><span className="text-sm font-medium text-gray-600">Ver Compromissos</span></div><ArrowRight className="w-4 h-4 text-gray-600" /></Link>
                  <Link href="/planejamento" className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"><div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-gray-600" /><span className="text-sm font-medium text-gray-600">Ajustar Planejamento</span></div><ArrowRight className="w-4 h-4 text-gray-600" /></Link>
                </div>
              </div>

              <div className="lg:col-span-3 bg-white rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-gray-900">Últimos Gastos Variáveis</h2><Link href="/gastos" className="text-sm text-blue-600 hover:underline">Ver todos</Link></div>
                {data?.recentTransactions && data.recentTransactions.length > 0 ? (
                  <div className="divide-y">{data.recentTransactions.map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between py-3">
                      <div><p className="font-medium text-gray-900">{transaction.description}</p><p className="text-sm text-gray-500">{transaction.category?.name} • {new Date(transaction.date).toLocaleDateString("pt-BR")}</p></div>
                      <p className="font-bold text-red-600">-{formatCurrency(transaction.amount)}</p>
                    </div>
                  ))}</div>
                ) : <p className="text-gray-500 text-center py-8">Nenhum gasto variável registrado este mês.</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
