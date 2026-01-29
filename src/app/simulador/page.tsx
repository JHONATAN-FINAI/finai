"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown,
  Sparkles,
  Loader2,
  ArrowRight
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const scenarios = [
  { id: 'raise', label: 'Aumento de salário de 10%', icon: TrendingUp },
  { id: 'cut-streaming', label: 'Cancelar todas as assinaturas de streaming', icon: TrendingDown },
  { id: 'extra-income', label: 'Renda extra de R$ 1.000/mês', icon: TrendingUp },
  { id: 'cut-delivery', label: 'Reduzir delivery em 50%', icon: TrendingDown },
  { id: 'pay-debt', label: 'Quitar a maior dívida', icon: TrendingUp },
]

export default function SimuladorPage() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customScenario, setCustomScenario] = useState("")
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  const runSimulation = async (scenario: string) => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/ai/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario })
      })
      const data = await res.json()
      setResult(data.simulation)
    } catch (error) {
      console.error("Erro na simulação:", error)
    }
    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Simulador Financeiro</h1>
          <p className="text-gray-500">Veja o impacto de diferentes cenários nas suas finanças</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Cenários */}
          <div className="bg-white rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Escolha um Cenário</h2>
            
            <div className="space-y-3 mb-6">
              {scenarios.map(s => {
                const Icon = s.icon
                return (
                  <button
                    key={s.id}
                    onClick={() => runSimulation(s.label)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-4 text-left border rounded-xl hover:bg-gray-50 disabled:opacity-50"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      s.icon === TrendingUp ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        s.icon === TrendingUp ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    <span className="flex-1 font-medium text-gray-900">{s.label}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </button>
                )
              })}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Cenário Personalizado</h3>
              <textarea
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                placeholder="Ex: E se eu conseguir um freelance de R$ 2.000 por mês?"
                className="w-full px-4 py-3 border rounded-xl resize-none h-24 mb-3"
              />
              <button
                onClick={() => customScenario && runSimulation(customScenario)}
                disabled={loading || !customScenario.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Simular com IA
              </button>
            </div>
          </div>

          {/* Resultado */}
          <div className="bg-white rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Resultado da Simulação</h2>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-500">Calculando impacto...</p>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-6">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-gray-600">Cenário:</p>
                  <p className="font-medium text-gray-900">{result.scenario}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500">Saldo Atual</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(result.currentSituation?.monthlyBalance || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl">
                    <p className="text-xs text-gray-500">Saldo Projetado</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(result.projectedSituation?.monthlyBalance || 0)}
                    </p>
                  </div>
                </div>

                {result.impact && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Impacto</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span>Diferença mensal:</span>
                        <span className={`font-medium ${
                          (result.impact.monthlyDifference || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(result.impact.monthlyDifference || 0) >= 0 ? '+' : ''}
                          {formatCurrency(result.impact.monthlyDifference || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span>Impacto anual:</span>
                        <span className={`font-medium ${
                          (result.impact.annualDifference || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(result.impact.annualDifference || 0) >= 0 ? '+' : ''}
                          {formatCurrency(result.impact.annualDifference || 0)}
                        </span>
                      </div>
                      {result.impact.timeToGoal && (
                        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                          <span>Tempo para metas:</span>
                          <span className="font-medium">{result.impact.timeToGoal}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {result.analysis && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Análise</h4>
                    <p className="text-sm text-gray-600 p-4 bg-gray-50 rounded-xl">{result.analysis}</p>
                  </div>
                )}

                {result.recommendation && (
                  <div className={`p-4 rounded-xl ${
                    result.recommendation.toLowerCase().includes('vale') || 
                    result.recommendation.toLowerCase().includes('recomend')
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <h4 className="font-medium text-gray-900 mb-1">Recomendação</h4>
                    <p className="text-sm text-gray-700">{result.recommendation}</p>
                  </div>
                )}

                {result.considerations?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Considerações</h4>
                    <ul className="space-y-1">
                      {result.considerations.map((c: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-gray-400">•</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Calculator className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500">Selecione um cenário para simular</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
