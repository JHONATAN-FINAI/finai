"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  Sparkles,
  Loader2,
  Info
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function InvestimentosPage() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [riskProfile, setRiskProfile] = useState("MODERADO")
  const [analysis, setAnalysis] = useState<any>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  const analyze = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: parseFloat(amount) || 0, 
          riskProfile 
        })
      })
      const data = await res.json()
      setAnalysis(data.analysis)
    } catch (error) {
      console.error("Erro:", error)
    }
    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Análise de Investimentos</h1>
          <p className="text-gray-500">Receba sugestões educacionais sobre onde investir</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              <strong>Aviso:</strong> Estas são sugestões educacionais e não constituem recomendação de investimento. 
              Consulte um profissional antes de tomar decisões financeiras.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <div className="bg-white rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Configure sua Análise</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor disponível para investir
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-3 border rounded-xl"
                />
                <p className="text-xs text-gray-500 mt-1">Deixe em branco para usar seu saldo mensal</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perfil de Risco
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CONSERVADOR', label: 'Conservador', icon: Shield, color: 'green' },
                    { id: 'MODERADO', label: 'Moderado', icon: TrendingUp, color: 'blue' },
                    { id: 'ARROJADO', label: 'Arrojado', icon: AlertTriangle, color: 'orange' },
                  ].map(profile => {
                    const Icon = profile.icon
                    return (
                      <button
                        key={profile.id}
                        onClick={() => setRiskProfile(profile.id)}
                        className={`p-3 border-2 rounded-xl text-center transition-colors ${
                          riskProfile === profile.id
                            ? `border-${profile.color}-500 bg-${profile.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${
                          riskProfile === profile.id ? `text-${profile.color}-600` : 'text-gray-400'
                        }`} />
                        <p className="text-xs font-medium">{profile.label}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={analyze}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Analisar com IA
              </button>
            </div>
          </div>

          {/* Resultado */}
          <div className="bg-white rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Sugestões</h2>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                {/* Prontidão */}
                <div className={`p-4 rounded-xl ${
                  analysis.readinessAnalysis?.isReadyToInvest 
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <h4 className="font-medium text-gray-900 mb-1">Prontidão para Investir</h4>
                  <p className="text-sm text-gray-700">{analysis.readinessAnalysis?.reason}</p>
                </div>

                {/* Alocação Sugerida */}
                {analysis.suggestedAllocation?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Alocação Sugerida</h4>
                    <div className="space-y-3">
                      {analysis.suggestedAllocation.map((a: any, i: number) => (
                        <div key={i} className="p-4 border rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-gray-900">{a.assetClass}</span>
                            <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {a.percentage}%
                            </span>
                          </div>
                          <p className="text-lg font-bold text-green-600 mb-2">
                            {formatCurrency(a.amount)}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">{a.why}</p>
                          {a.examples?.length > 0 && (
                            <p className="text-xs text-gray-500">
                              Exemplos: {a.examples.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ordem de Prioridade */}
                {analysis.priorityOrder?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Ordem de Prioridade</h4>
                    <ol className="space-y-2">
                      {analysis.priorityOrder.map((p: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-gray-700">{p}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Avisos */}
                {analysis.warnings?.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <h4 className="font-medium text-red-700 mb-2">⚠️ Atenção</h4>
                    <ul className="space-y-1">
                      {analysis.warnings.map((w: string, i: number) => (
                        <li key={i} className="text-sm text-red-600">• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notas Educacionais */}
                {analysis.educationalNotes?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">📚 Para Estudar</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.educationalNotes.map((n: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.disclaimer && (
                  <p className="text-xs text-gray-500 italic">{analysis.disclaimer}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500">Configure e clique em analisar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
