"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart
} from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/utils"

export default function RelatoriosPage() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'dre' | 'indicadores' | 'fluxo' | 'dividas'>('dre')

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function loadData() {
      try {
        const [diagRes, transRes] = await Promise.all([
          fetch("/api/diagnostico"),
          fetch("/api/transactions")
        ])

        const diagData = await diagRes.json()
        const transData = await transRes.json()

        const byCategory: Record<string, number> = {}
        transData.transactions?.forEach((t: any) => {
          const catName = t.category?.name || "Outros"
          byCategory[catName] = (byCategory[catName] || 0) + t.amount
        })

        setData({
          analysis: diagData.analysis,
          transactions: transData.transactions,
          byCategory
        })
      } catch (error) {
        console.error("Erro:", error)
      }
      setLoading(false)
    }

    if (status === "authenticated") {
      loadData()
    }
  }, [status])

  const exportCSV = () => {
    if (!data?.transactions) return

    const headers = ["Data", "Descrição", "Categoria", "Valor", "Forma de Pagamento"]
    const rows = data.transactions.map((t: any) => [
      new Date(t.date).toLocaleDateString("pt-BR"),
      t.description,
      t.category?.name || "Outros",
      t.amount.toFixed(2).replace(".", ","),
      t.paymentMethod
    ])

    const csv = [headers, ...rows].map(row => row.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `finai-transacoes-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

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
  const dre = analysis.dre || {}
  const indicators = analysis.indicators || {}
  const cashFlow = analysis.cashFlow || []
  const debtAnalysis = analysis.debtAnalysis || {}

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios Financeiros</h1>
            <p className="text-gray-500">Análise completa da sua situação financeira</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            <Download className="w-5 h-5" /> Exportar CSV
          </button>
        </div>

        {/* Score Card */}
        <div className={`p-6 rounded-2xl mb-6 ${
          indicators.scoreGeral >= 70 ? 'bg-green-50 border border-green-200' :
          indicators.scoreGeral >= 50 ? 'bg-yellow-50 border border-yellow-200' :
          indicators.scoreGeral >= 30 ? 'bg-orange-50 border border-orange-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                indicators.scoreGeral >= 70 ? 'bg-green-100' :
                indicators.scoreGeral >= 50 ? 'bg-yellow-100' :
                indicators.scoreGeral >= 30 ? 'bg-orange-100' : 'bg-red-100'
              }`}>
                {indicators.scoreGeral >= 50 ? 
                  <CheckCircle className={`w-8 h-8 ${indicators.scoreGeral >= 70 ? 'text-green-600' : 'text-yellow-600'}`} /> :
                  <AlertTriangle className={`w-8 h-8 ${indicators.scoreGeral >= 30 ? 'text-orange-600' : 'text-red-600'}`} />
                }
              </div>
              <div>
                <p className="text-sm text-gray-600">Score de Saúde Financeira</p>
                <p className="text-4xl font-bold text-gray-900">{indicators.scoreGeral || 0}<span className="text-lg text-gray-500">/100</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Nível de Risco</p>
              <p className={`text-xl font-bold ${
                analysis.riskLevel === 'BAIXO' ? 'text-green-600' :
                analysis.riskLevel === 'MEDIO' ? 'text-yellow-600' :
                analysis.riskLevel === 'ALTO' ? 'text-orange-600' : 'text-red-600'
              }`}>
                {analysis.riskLevel || '---'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'dre', label: 'DRE Pessoal', icon: FileText },
            { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
            { id: 'fluxo', label: 'Fluxo de Caixa', icon: TrendingUp },
            { id: 'dividas', label: 'Análise de Dívidas', icon: Target },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* DRE Pessoal */}
        {activeTab === 'dre' && (
          <div className="bg-white rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Demonstração do Resultado (DRE Pessoal)</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b-2 border-gray-200">
                <span className="font-bold text-gray-900">RECEITA BRUTA</span>
                <span className="font-bold text-green-600">{formatCurrency(dre.receitaBruta || 0)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 pl-4">
                <span className="text-gray-600">(-) Deduções</span>
                <span className="text-red-500">{formatCurrency(dre.deducoes || 0)}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-200 bg-gray-50 px-4 rounded">
                <span className="font-medium text-gray-900">= RECEITA LÍQUIDA</span>
                <span className="font-bold text-gray-900">{formatCurrency(dre.receitaLiquida || 0)}</span>
              </div>
              
              <div className="py-2">
                <p className="font-medium text-gray-700 mb-2">DESPESAS OPERACIONAIS</p>
                <div className="flex justify-between items-center py-2 pl-4">
                  <span className="text-gray-600">(-) Despesas Fixas</span>
                  <span className="text-red-500">{formatCurrency(dre.despesasOperacionais?.fixas || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 pl-4">
                  <span className="text-gray-600">(-) Despesas Variáveis</span>
                  <span className="text-red-500">{formatCurrency(dre.despesasOperacionais?.variaveis || 0)}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-200 bg-blue-50 px-4 rounded">
                <span className="font-medium text-gray-900">= RESULTADO OPERACIONAL (EBITDA)</span>
                <span className={`font-bold ${(dre.resultadoOperacional || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(dre.resultadoOperacional || 0)}
                </span>
              </div>
              
              <div className="py-2">
                <p className="font-medium text-gray-700 mb-2">DESPESAS FINANCEIRAS</p>
                <div className="flex justify-between items-center py-2 pl-4">
                  <span className="text-gray-600">(-) Juros de Dívidas</span>
                  <span className="text-red-500">{formatCurrency(dre.despesasFinanceiras?.juros || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 pl-4">
                  <span className="text-gray-600">(-) Amortização</span>
                  <span className="text-red-500">{formatCurrency(dre.despesasFinanceiras?.amortizacao || 0)}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-4 border-t-2 border-gray-300 bg-gray-100 px-4 rounded-xl">
                <span className="font-bold text-gray-900 text-lg">= RESULTADO LÍQUIDO</span>
                <span className={`text-2xl font-bold ${(dre.resultadoLiquido || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(dre.resultadoLiquido || 0)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-gray-600">Margem Operacional</p>
                  <p className="text-xl font-bold text-blue-600">{(dre.margemOperacional || 0).toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-gray-600">Margem Líquida</p>
                  <p className="text-xl font-bold text-green-600">{(dre.margemLiquida || 0).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Indicadores */}
        {activeTab === 'indicadores' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Liquidez Corrente */}
              <div className="bg-white p-5 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Liquidez Corrente</p>
                <p className={`text-2xl font-bold ${
                  (indicators.liquidezCorrente || 0) >= 1.2 ? 'text-green-600' :
                  (indicators.liquidezCorrente || 0) >= 1 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {(indicators.liquidezCorrente || 0).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Ideal: maior que 1.2</p>
              </div>

              {/* Comprometimento */}
              <div className="bg-white p-5 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Comprometimento Dívidas</p>
                <p className={`text-2xl font-bold ${
                  (indicators.comprometimentoRenda || 0) <= 20 ? 'text-green-600' :
                  (indicators.comprometimentoRenda || 0) <= 30 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {(indicators.comprometimentoRenda || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">Limite: até 30%</p>
              </div>

              {/* Taxa de Poupança */}
              <div className="bg-white p-5 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Taxa de Poupança</p>
                <p className={`text-2xl font-bold ${
                  (indicators.taxaPoupanca || 0) >= 20 ? 'text-green-600' :
                  (indicators.taxaPoupanca || 0) >= 10 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {(indicators.taxaPoupanca || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">Meta: mínimo 20%</p>
              </div>

              {/* Endividamento */}
              <div className="bg-white p-5 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Endividamento Total</p>
                <p className={`text-2xl font-bold ${
                  (indicators.endividamentoTotal || 0) <= 0.3 ? 'text-green-600' :
                  (indicators.endividamentoTotal || 0) <= 0.5 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {((indicators.endividamentoTotal || 0) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">Dívidas / Renda anual</p>
              </div>
            </div>

            {/* Gastos por Categoria */}
            <div className="bg-white rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Gastos por Categoria</h3>
              <div className="space-y-4">
                {Object.entries(data?.byCategory || {})
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([category, amount]) => {
                    const total = Object.values(data?.byCategory || {}).reduce((s: any, v: any) => s + v, 0) as number
                    const percent = total > 0 ? ((amount as number) / total) * 100 : 0
                    
                    return (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{category}</span>
                          <span>{formatCurrency(amount as number)} ({percent.toFixed(1)}%)</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Fluxo de Caixa */}
        {activeTab === 'fluxo' && (
          <div className="bg-white rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Projeção de Fluxo de Caixa (12 meses)</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Mês</th>
                    <th className="text-right py-3 px-2">Entradas</th>
                    <th className="text-right py-3 px-2">Saídas</th>
                    <th className="text-right py-3 px-2">Saldo</th>
                    <th className="text-right py-3 px-2">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlow.map((cf: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{cf.label}</td>
                      <td className="py-3 px-2 text-right text-green-600">{formatCurrency(cf.entradas)}</td>
                      <td className="py-3 px-2 text-right text-red-600">{formatCurrency(cf.saidas)}</td>
                      <td className={`py-3 px-2 text-right font-medium ${cf.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatCurrency(cf.saldo)}
                      </td>
                      <td className={`py-3 px-2 text-right font-bold ${cf.saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(cf.saldoAcumulado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-gray-600">Projeção em 12 meses:</p>
              <p className={`text-2xl font-bold ${
                (cashFlow[cashFlow.length - 1]?.saldoAcumulado || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(cashFlow[cashFlow.length - 1]?.saldoAcumulado || 0)}
              </p>
            </div>
          </div>
        )}

        {/* Análise de Dívidas */}
        {activeTab === 'dividas' && (
          <div className="space-y-6">
            {debtAnalysis.totalBalance > 0 ? (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl">
                    <p className="text-sm text-gray-500 mb-1">Saldo Total</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(debtAnalysis.totalBalance)}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl">
                    <p className="text-sm text-gray-500 mb-1">Parcela Mensal</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(debtAnalysis.totalMonthlyPayment)}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl">
                    <p className="text-sm text-gray-500 mb-1">Juros Médio</p>
                    <p className="text-2xl font-bold text-gray-900">{(debtAnalysis.averageInterestRate || 0).toFixed(2)}% a.m.</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Simulação de Quitação</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Método Avalanche */}
                    <div className={`p-4 rounded-xl border-2 ${
                      debtAnalysis.recommendedMethod === 'AVALANCHE' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-900">Método Avalanche</h4>
                        {debtAnalysis.recommendedMethod === 'AVALANCHE' && (
                          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">Recomendado</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Prioriza dívidas com maior juros primeiro.</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Tempo para quitar:</span>
                          <span className="font-medium">{debtAnalysis.avalanchePlan?.monthsToPayoff || 0} meses</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total de juros:</span>
                          <span className="font-medium text-red-600">{formatCurrency(debtAnalysis.avalanchePlan?.totalInterestPaid || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Método Bola de Neve */}
                    <div className={`p-4 rounded-xl border-2 ${
                      debtAnalysis.recommendedMethod === 'BOLA_DE_NEVE' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-900">Método Bola de Neve</h4>
                        {debtAnalysis.recommendedMethod === 'BOLA_DE_NEVE' && (
                          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">Recomendado</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Prioriza dívidas com menor saldo primeiro.</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Tempo para quitar:</span>
                          <span className="font-medium">{debtAnalysis.snowballPlan?.monthsToPayoff || 0} meses</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total de juros:</span>
                          <span className="font-medium text-red-600">{formatCurrency(debtAnalysis.snowballPlan?.totalInterestPaid || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {debtAnalysis.potentialSavings > 0 && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-sm text-gray-600">Economia potencial com estratégia otimizada:</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(debtAnalysis.potentialSavings)}</p>
                    </div>
                  )}
                </div>

                {debtAnalysis.highestInterestDebt && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-gray-900">Prioridade de Pagamento</h4>
                        <p className="text-gray-700 mt-1">
                          A dívida "{debtAnalysis.highestInterestDebt.name}" possui os maiores juros 
                          ({debtAnalysis.highestInterestDebt.interestRate}% a.m.) e deve ser priorizada 
                          para pagamentos extras.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sem Dívidas!</h3>
                <p className="text-gray-500">Você não possui dívidas cadastradas. Continue assim!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
