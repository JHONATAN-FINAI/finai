"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Target,
  ArrowRight
} from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/utils"
import Link from "next/link"

export default function RelatorioPage() {
  const { status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/diagnostico")
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error("Erro ao carregar relatório:", error)
      }
      setLoading(false)
    }

    if (status === "authenticated") {
      loadData()
    }
  }, [status])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    )
  }

  const analysis = data?.analysis || {}

  if (!analysis.totalIncome) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Relatório não disponível</h1>
          <p className="text-gray-500 mb-6">Complete o diagnóstico para ver seu relatório financeiro.</p>
          <Link
            href="/diagnostico"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
          >
            Ir para Diagnóstico <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Relatório Financeiro</h1>
          <p className="text-gray-500">Análise completa da sua situação financeira</p>
        </div>

        {/* Resumo Executivo */}
        <div className={`p-6 rounded-2xl mb-8 ${
          analysis.riskLevel === 'BAIXO' ? 'bg-green-50 border border-green-200' :
          analysis.riskLevel === 'MEDIO' ? 'bg-yellow-50 border border-yellow-200' :
          analysis.riskLevel === 'ALTO' ? 'bg-orange-50 border border-orange-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              analysis.riskLevel === 'BAIXO' ? 'bg-green-100' :
              analysis.riskLevel === 'MEDIO' ? 'bg-yellow-100' :
              analysis.riskLevel === 'ALTO' ? 'bg-orange-100' :
              'bg-red-100'
            }`}>
              {analysis.riskLevel === 'BAIXO' ? 
                <CheckCircle className="w-6 h-6 text-green-600" /> :
                <AlertTriangle className={`w-6 h-6 ${
                  analysis.riskLevel === 'MEDIO' ? 'text-yellow-600' :
                  analysis.riskLevel === 'ALTO' ? 'text-orange-600' :
                  'text-red-600'
                }`} />
              }
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Nível de Risco: {analysis.riskLevel}
              </h2>
              <p className="text-gray-700">{analysis.summary}</p>
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Receitas</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(analysis.totalIncome)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <TrendingDown className="w-5 h-5" />
              <span className="text-sm font-medium">Despesas</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(analysis.totalExpenses)}</p>
            <p className="text-xs text-gray-500 mt-1">{formatPercent(analysis.expenseRatio)} da renda</p>
          </div>

          <div className="bg-white p-5 rounded-xl">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <Target className="w-5 h-5" />
              <span className="text-sm font-medium">Dívidas</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(analysis.totalDebtPayment)}</p>
            <p className="text-xs text-gray-500 mt-1">{formatPercent(analysis.debtRatio)} da renda</p>
          </div>

          <div className="bg-white p-5 rounded-xl">
            <div className={`flex items-center gap-2 mb-2 ${
              analysis.monthlyBalance >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Saldo</span>
            </div>
            <p className={`text-2xl font-bold ${
              analysis.monthlyBalance >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              {formatCurrency(analysis.monthlyBalance)}
            </p>
          </div>
        </div>

        {/* Distribuição vs Ideal */}
        <div className="bg-white p-6 rounded-2xl mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Distribuição Atual vs Ideal (50/30/20)</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Necessidades</span>
                <span>{formatPercent(analysis.currentDistribution?.needs || 0)} / 50%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    (analysis.currentDistribution?.needs || 0) <= 50 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(analysis.currentDistribution?.needs || 0, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Desejos</span>
                <span>{formatPercent(analysis.currentDistribution?.wants || 0)} / 30%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    (analysis.currentDistribution?.wants || 0) <= 30 ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(analysis.currentDistribution?.wants || 0, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Poupança</span>
                <span>{formatPercent(analysis.savingsCapacity || 0)} / 20%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    (analysis.savingsCapacity || 0) >= 20 ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(analysis.savingsCapacity || 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pontos Críticos */}
        {analysis.criticalPoints?.length > 0 && (
          <div className="bg-white p-6 rounded-2xl mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pontos Críticos</h2>
            <ul className="space-y-3">
              {analysis.criticalPoints.map((point: string, index: number) => (
                <li key={index} className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700">{point}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recomendações */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Curto Prazo */}
          <div className="bg-white p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900">Curto Prazo</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">Próximos 30 dias</p>
            <ul className="space-y-2">
              {analysis.recommendations?.shortTerm?.map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-red-500 mt-1">•</span>
                  <span className="text-gray-600">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Médio Prazo */}
          <div className="bg-white p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-yellow-600" />
              </div>
              <h3 className="font-bold text-gray-900">Médio Prazo</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">1 a 6 meses</p>
            <ul className="space-y-2">
              {analysis.recommendations?.mediumTerm?.map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span className="text-gray-600">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Longo Prazo */}
          <div className="bg-white p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900">Longo Prazo</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">6 a 24 meses</p>
            <ul className="space-y-2">
              {analysis.recommendations?.longTerm?.map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-1">•</span>
                  <span className="text-gray-600">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-600 text-white p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold mb-1">Pronto para organizar suas finanças?</h3>
            <p className="text-blue-100">Configure seu planejamento 50/30/20 personalizado.</p>
          </div>
          <Link
            href="/planejamento"
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
          >
            Configurar Planejamento <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
