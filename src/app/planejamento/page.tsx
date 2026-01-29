"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { Save, RefreshCw } from "lucide-react"
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function loadData() {
      try {
        const [diagRes, planRes, catRes] = await Promise.all([
          fetch("/api/diagnostico"),
          fetch("/api/plan"),
          fetch("/api/categories")
        ])

        const diagData = await diagRes.json()
        const planData = await planRes.json()
        const catData = await catRes.json()

        setTotalIncome(diagData.analysis?.totalIncome || 0)
        setCategories(catData.categories || [])

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
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">{category.name}</p>
                  <p className="text-xs text-gray-500">
                    Semanal: {formatCurrency((budgets[category.id] || 0) / 4)} | 
                    Diário: {formatCurrency((budgets[category.id] || 0) / 30)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">R$</span>
                  <input
                    type="number"
                    value={budgets[category.id] || ""}
                    onChange={(e) => handleBudgetChange(category.id, parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-32 px-3 py-2 border rounded-lg text-right"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">Total Orçado</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(Object.values(budgets).reduce((sum, v) => sum + v, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
