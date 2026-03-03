"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { Save, RefreshCw, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function PlanejamentoPage() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [totalIncome, setTotalIncome] = useState(0)
  const [plan, setPlan] = useState({
    needsPercent: 50,
    wantsPercent: 30,
    savingsPercent: 20
  })
  const [categories, setCategories] = useState<any[]>([])
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [actualSpending, setActualSpending] = useState<Record<string, number>>({})
  const [currentMonth, setCurrentMonth] = useState(0)
  const [currentYear, setCurrentYear] = useState(0)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function loadData() {
      try {
        // Buscar mês atual primeiro
        const monthRes = await fetch("/api/monthly")
        const monthData = await monthRes.json()
        
        const now = new Date()
        const month = monthData.currentMonth || (now.getMonth() + 1)
        const year = monthData.currentYear || now.getFullYear()
        
        setCurrentMonth(month)
        setCurrentYear(year)

        // Buscar dados
        const [diagRes, planRes, catRes, transRes] = await Promise.all([
          fetch("/api/diagnostico"),
          fetch("/api/plan"),
          fetch("/api/categories"),
          fetch(`/api/transactions?month=${month}&year=${year}`)
        ])

        const diagData = await diagRes.json()
        const planData = await planRes.json()
        const catData = await catRes.json()
        const transData = await transRes.json()

        setTotalIncome(diagData.analysis?.totalIncome || 0)
        setCategories(catData.categories || [])

        // Calcular gastos reais por categoria
        const spending: Record<string, number> = {}
        transData.transactions?.forEach((t: any) => {
          if (!spending[t.categoryId]) {
            spending[t.categoryId] = 0
          }
          spending[t.categoryId] += t.amount
        })
        setActualSpending(spending)

        if (planData.plan) {
          setPlan({
            needsPercent: planData.plan.needsPercent,
            wantsPercent: planData.plan.wantsPercent,
            savingsPercent: planData.plan.savingsPercent
          })

          const newBudgets: Record<string, number> = {}
          planData.plan.categories?.forEach((pc: any) => {
            newBudgets[pc.categoryId] = pc.monthlyBudget
          })
          setBudgets(newBudgets)
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      }
      setLoading(false)
    }

    if (status === "authenticated") {
      loadData()
    }
  }, [status])

  const handlePercentChange = (field: string, value: number) => {
    const newPlan = { ...plan, [field]: value }
    
    // Ajustar automaticamente para somar 100%
    const total = newPlan.needsPercent + newPlan.wantsPercent + newPlan.savingsPercent
    if (total !== 100) {
      // Distribuir a diferença
      const diff = 100 - total
      if (field === 'needsPercent') {
        newPlan.savingsPercent = Math.max(0, newPlan.savingsPercent + diff)
      } else if (field === 'wantsPercent') {
        newPlan.savingsPercent = Math.max(0, newPlan.savingsPercent + diff)
      } else {
        newPlan.wantsPercent = Math.max(0, newPlan.wantsPercent + diff)
      }
    }

    setPlan(newPlan)
  }

  const handleBudgetChange = (categoryId: string, value: number) => {
    setBudgets({ ...budgets, [categoryId]: value })
  }

  const savePlan = async () => {
    setSaving(true)
    try {
      const categoriesData = Object.entries(budgets).map(([categoryId, monthlyBudget]) => ({
        categoryId,
        monthlyBudget,
        weeklyBudget: monthlyBudget / 4,
        dailyBudget: monthlyBudget / 30
      }))

      await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...plan,
          totalIncome,
          categories: categoriesData
        })
      })

      alert("Planejamento salvo com sucesso!")
    } catch (error) {
      console.error("Erro ao salvar plano:", error)
      alert("Erro ao salvar planejamento")
    }
    setSaving(false)
  }

  const resetToIdeal = () => {
    setPlan({ needsPercent: 50, wantsPercent: 30, savingsPercent: 20 })
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

  const needsAmount = totalIncome * (plan.needsPercent / 100)
  const wantsAmount = totalIncome * (plan.wantsPercent / 100)
  const savingsAmount = totalIncome * (plan.savingsPercent / 100)

  // Identificar categoria com maior gasto
  const highestSpending = categories
    .map(cat => ({
      ...cat,
      actual: actualSpending[cat.id] || 0,
      budget: budgets[cat.id] || 0
    }))
    .filter(cat => cat.actual > 0)
    .sort((a, b) => b.actual - a.actual)[0]

  // Identificar categorias acima do orçamento
  const overBudget = categories
    .map(cat => ({
      ...cat,
      actual: actualSpending[cat.id] || 0,
      budget: budgets[cat.id] || 0,
      diff: (actualSpending[cat.id] || 0) - (budgets[cat.id] || 0)
    }))
    .filter(cat => cat.budget > 0 && cat.diff > 0)
    .sort((a, b) => b.diff - a.diff)

  const totalActual = Object.values(actualSpending).reduce((sum, v) => sum + v, 0)
  const totalBudgeted = Object.values(budgets).reduce((sum, v) => sum + v, 0)

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planejamento Financeiro</h1>
            <p className="text-gray-500">Configure seu orçamento baseado na regra 50/30/20</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetToIdeal}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              <RefreshCw className="w-4 h-4" /> Resetar
            </button>
            <button
              onClick={savePlan}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {/* Alertas e Sugestões */}
        {(highestSpending || overBudget.length > 0) && (
          <div className="space-y-4 mb-6">
            {highestSpending && highestSpending.actual > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Categoria com maior gasto</p>
                    <p className="text-sm text-blue-700 mt-1">
                      <strong>{highestSpending.name}</strong> está com {formatCurrency(highestSpending.actual)} gasto neste mês.
                      {highestSpending.budget > 0 && highestSpending.actual > highestSpending.budget && 
                        ` Você ultrapassou o orçamento planejado de ${formatCurrency(highestSpending.budget)} em ${formatCurrency(highestSpending.actual - highestSpending.budget)}.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {overBudget.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Categorias acima do orçamento</p>
                    <ul className="text-sm text-red-700 mt-2 space-y-1">
                      {overBudget.slice(0, 3).map(cat => (
                        <li key={cat.id}>
                          <strong>{cat.name}:</strong> gastou {formatCurrency(cat.actual)} de {formatCurrency(cat.budget)} 
                          (excedeu {formatCurrency(cat.diff)})
                        </li>
                      ))}
                    </ul>
                    {overBudget.length > 0 && (
                      <p className="text-sm text-red-700 mt-2">
                        💡 Sugestão: Reduza gastos em <strong>{overBudget[0].name}</strong> para equilibrar seu orçamento.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Renda Total */}
        <div className="bg-white p-6 rounded-2xl mb-6">
          <p className="text-sm text-gray-500 mb-1">Renda Mensal Total</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalIncome)}</p>
        </div>

        {/* Distribuição 50/30/20 */}
        <div className="bg-white p-6 rounded-2xl mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Distribuição</h2>
          
          <div className="space-y-6">
            {/* Necessidades */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">Necessidades</p>
                  <p className="text-sm text-gray-500">Moradia, alimentação, transporte, saúde</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{formatCurrency(needsAmount)}</p>
                  <p className="text-sm text-gray-500">{plan.needsPercent}%</p>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={plan.needsPercent}
                onChange={(e) => handlePercentChange('needsPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Desejos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">Desejos</p>
                  <p className="text-sm text-gray-500">Lazer, entretenimento, compras não essenciais</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-purple-600">{formatCurrency(wantsAmount)}</p>
                  <p className="text-sm text-gray-500">{plan.wantsPercent}%</p>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={plan.wantsPercent}
                onChange={(e) => handlePercentChange('wantsPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>

            {/* Poupança */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">Poupança / Investimentos / Dívidas</p>
                  <p className="text-sm text-gray-500">Reserva de emergência, investimentos, quitação de dívidas</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(savingsAmount)}</p>
                  <p className="text-sm text-gray-500">{plan.savingsPercent}%</p>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={plan.savingsPercent}
                onChange={(e) => handlePercentChange('savingsPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
            </div>
          </div>

          {/* Barra Visual */}
          <div className="mt-6 h-4 rounded-full overflow-hidden flex">
            <div 
              className="bg-blue-500 transition-all"
              style={{ width: `${plan.needsPercent}%` }}
            />
            <div 
              className="bg-purple-500 transition-all"
              style={{ width: `${plan.wantsPercent}%` }}
            />
            <div 
              className="bg-green-500 transition-all"
              style={{ width: `${plan.savingsPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Necessidades ({plan.needsPercent}%)</span>
            <span>Desejos ({plan.wantsPercent}%)</span>
            <span>Poupança ({plan.savingsPercent}%)</span>
          </div>
        </div>

        {/* Orçamento por Categoria */}
        <div className="bg-white p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Orçamento por Categoria</h2>
          
          <div className="space-y-4">
            {categories.map((category) => {
              const actual = actualSpending[category.id] || 0
              const budget = budgets[category.id] || 0
              const diff = actual - budget
              const percentUsed = budget > 0 ? (actual / budget) * 100 : 0
              
              return (
                <div key={category.id} className={`p-4 rounded-xl ${actual > budget && budget > 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{category.name}</p>
                        {actual > 0 && (
                          <span className="text-xs text-gray-500">
                            (Gasto: {formatCurrency(actual)})
                          </span>
                        )}
                      </div>
                      {budget > 0 && actual > 0 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${percentUsed > 100 ? 'bg-red-600' : percentUsed > 80 ? 'bg-yellow-600' : 'bg-green-600'}`}
                              style={{ width: `${Math.min(percentUsed, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {percentUsed.toFixed(0)}% utilizado
                            {diff > 0 && <span className="text-red-600 font-medium"> (excedeu {formatCurrency(diff)})</span>}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Semanal: {formatCurrency((budget) / 4)} | Diário: {formatCurrency((budget) / 30)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">R$</span>
                      <input
                        type="number"
                        value={budget || ""}
                        onChange={(e) => handleBudgetChange(category.id, parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className="w-32 px-3 py-2 border rounded-lg text-right"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 space-y-3">
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">Total Orçado</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(totalBudgeted)}</p>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">Total Gasto (mês atual)</p>
                <p className={`text-xl font-bold ${totalActual > totalBudgeted ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totalActual)}
                </p>
              </div>
            </div>

            {totalBudgeted > 0 && (
              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">Saldo do Orçamento</p>
                  <p className={`text-xl font-bold ${totalActual > totalBudgeted ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(totalBudgeted - totalActual)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
