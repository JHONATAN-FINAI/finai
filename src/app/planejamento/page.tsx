"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { Save, RefreshCw, PieChart, Wallet, Target, TrendingUp, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function PlanejamentoPage() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [totalIncome, setTotalIncome] = useState(0)
  const [plan, setPlan] = useState({ needsPercent: 50, wantsPercent: 30, savingsPercent: 20 })
  const [categories, setCategories] = useState<any[]>([])
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (status === "unauthenticated") router.push("/") }, [status, router])

  useEffect(() => {
    async function loadData() {
      try {
        const [diagRes, planRes, catRes] = await Promise.all([fetch("/api/diagnostico"), fetch("/api/plan"), fetch("/api/categories")])
        const [diagData, planData, catData] = await Promise.all([diagRes.json(), planRes.json(), catRes.json()])

        setTotalIncome(diagData.analysis?.totalIncome || 0)
        setCategories(catData.categories || [])

        if (planData.plan) {
          setPlan({ needsPercent: planData.plan.needsPercent, wantsPercent: planData.plan.wantsPercent, savingsPercent: planData.plan.savingsPercent })
          const newBudgets: Record<string, number> = {}
          planData.plan.categories?.forEach((pc: any) => { newBudgets[pc.categoryId] = pc.monthlyBudget })
          setBudgets(newBudgets)
        }
      } catch (error) { console.error("Erro:", error) }
      setLoading(false)
    }
    if (status === "authenticated") loadData()
  }, [status])

  const handlePercentChange = (field: string, value: number) => {
    const newPlan = { ...plan, [field]: value }
    const total = newPlan.needsPercent + newPlan.wantsPercent + newPlan.savingsPercent
    if (total !== 100) {
      const diff = 100 - total
      if (field === 'needsPercent') newPlan.savingsPercent = Math.max(0, newPlan.savingsPercent + diff)
      else if (field === 'wantsPercent') newPlan.savingsPercent = Math.max(0, newPlan.savingsPercent + diff)
      else newPlan.wantsPercent = Math.max(0, newPlan.wantsPercent + diff)
    }
    setPlan(newPlan)
    setSaved(false)
  }

  const handleBudgetChange = (categoryId: string, value: number) => {
    setBudgets({ ...budgets, [categoryId]: value })
    setSaved(false)
  }

  const savePlan = async () => {
    setSaving(true)
    try {
      const categoriesData = Object.entries(budgets).map(([categoryId, monthlyBudget]) => ({
        categoryId, monthlyBudget, weeklyBudget: monthlyBudget / 4, priority: 1
      }))

      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...plan, categories: categoriesData })
      })

      if (res.ok) setSaved(true)
    } catch (error) { console.error("Erro:", error) }
    setSaving(false)
  }

  const resetTo503020 = () => {
    setPlan({ needsPercent: 50, wantsPercent: 30, savingsPercent: 20 })
    const newBudgets: Record<string, number> = {}
    const needsCategories = ["Alimentação", "Moradia", "Transporte", "Saúde", "Educação"]
    const wantsCategories = ["Lazer", "Compras", "Assinaturas"]

    categories.forEach(cat => {
      if (needsCategories.includes(cat.name)) newBudgets[cat.id] = Math.round((totalIncome * 0.5) / needsCategories.length)
      else if (wantsCategories.includes(cat.name)) newBudgets[cat.id] = Math.round((totalIncome * 0.3) / wantsCategories.length)
      else newBudgets[cat.id] = 0
    })
    setBudgets(newBudgets)
    setSaved(false)
  }

  const needsAmount = (totalIncome * plan.needsPercent) / 100
  const wantsAmount = (totalIncome * plan.wantsPercent) / 100
  const savingsAmount = (totalIncome * plan.savingsPercent) / 100
  const totalBudgets = Object.values(budgets).reduce((sum, v) => sum + v, 0)
  const remaining = totalIncome - totalBudgets

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planejamento Financeiro</h1>
            <p className="text-gray-500">Configure seu orçamento mensal por categoria</p>
          </div>
          <div className="flex gap-3">
            <button onClick={resetTo503020} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors">
              <RefreshCw className="w-4 h-4" /> Regra 50/30/20
            </button>
            <button onClick={savePlan} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {/* Alerta de sucesso */}
        {saved && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-700 font-medium">Planejamento salvo com sucesso!</span>
          </div>
        )}

        {/* Receita Total */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-emerald-200" />
                <span className="text-emerald-100">Receita Mensal Total</span>
              </div>
              <p className="text-4xl font-bold">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-200 text-sm">Distribuído em categorias</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudgets)}</p>
              {remaining !== 0 && (
                <p className={`text-sm mt-1 ${remaining > 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                  {remaining > 0 ? `${formatCurrency(remaining)} disponível` : `${formatCurrency(Math.abs(remaining))} excedido`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Método 50/30/20 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Distribuição por Tipo</h2>
            <span className="ml-auto text-sm text-gray-500">Método 50/30/20</span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Necessidades */}
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900">Necessidades</span>
                <span className="text-2xl font-bold text-blue-600">{plan.needsPercent}%</span>
              </div>
              <input type="range" min="0" max="100" value={plan.needsPercent} onChange={(e) => handlePercentChange('needsPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              <p className="mt-3 text-lg font-semibold text-gray-900">{formatCurrency(needsAmount)}</p>
              <p className="text-xs text-gray-500">Moradia, alimentação, saúde...</p>
            </div>

            {/* Desejos */}
            <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900">Desejos</span>
                <span className="text-2xl font-bold text-purple-600">{plan.wantsPercent}%</span>
              </div>
              <input type="range" min="0" max="100" value={plan.wantsPercent} onChange={(e) => handlePercentChange('wantsPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
              <p className="mt-3 text-lg font-semibold text-gray-900">{formatCurrency(wantsAmount)}</p>
              <p className="text-xs text-gray-500">Lazer, compras, assinaturas...</p>
            </div>

            {/* Poupança */}
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900">Poupança</span>
                <span className="text-2xl font-bold text-emerald-600">{plan.savingsPercent}%</span>
              </div>
              <input type="range" min="0" max="100" value={plan.savingsPercent} onChange={(e) => handlePercentChange('savingsPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
              <p className="mt-3 text-lg font-semibold text-gray-900">{formatCurrency(savingsAmount)}</p>
              <p className="text-xs text-gray-500">Investimentos, reserva...</p>
            </div>
          </div>

          {/* Barra visual */}
          <div className="mt-6 h-4 rounded-full overflow-hidden flex">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${plan.needsPercent}%` }} />
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${plan.wantsPercent}%` }} />
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{ width: `${plan.savingsPercent}%` }} />
          </div>
        </div>

        {/* Orçamento por Categoria */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-orange-600" />
            <h2 className="font-semibold text-gray-900">Orçamento por Categoria</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {categories.map(category => {
              const budget = budgets[category.id] || 0
              const percent = totalIncome > 0 ? ((budget / totalIncome) * 100).toFixed(1) : "0"
              return (
                <div key={category.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <span className="text-sm text-gray-500">{percent}% da renda</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">R$</span>
                    <input
                      type="number"
                      value={budget || ""}
                      onChange={(e) => handleBudgetChange(category.id, parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  {budget > 0 && (
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all" 
                        style={{ width: `${Math.min((budget / (totalIncome * 0.5)) * 100, 100)}%` }} 
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Resumo */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Distribuído</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalBudgets)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Restante</p>
                <p className={`text-xl font-bold ${remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>
            {remaining < 0 && (
              <div className="flex items-center gap-2 mt-3 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Você distribuiu mais do que sua receita mensal</span>
              </div>
            )}
          </div>
        </div>

        {/* Dica */}
        <div className="p-5 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-100/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Dica do FinAI</h3>
              <p className="text-sm text-gray-600">
                A regra 50/30/20 é um ótimo ponto de partida: 50% para necessidades, 30% para desejos e 20% para poupança/investimentos. 
                Ajuste conforme sua realidade e objetivos financeiros.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
