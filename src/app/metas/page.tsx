"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  Target, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check,
  X,
  Trophy,
  Loader2
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Goal {
  id: string
  title: string
  description: string | null
  targetAmount: number
  currentAmount: number
  deadline: string | null
  priority: string
  status: string
  aiPlan: any
}

export default function MetasPage() {
  const { status } = useSession()
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [goalInput, setGoalInput] = useState("")
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      loadGoals()
    }
  }, [status])

  const loadGoals = async () => {
    try {
      const res = await fetch("/api/ai/goals")
      const data = await res.json()
      setGoals(data.goals || [])
    } catch (error) {
      console.error("Erro ao carregar metas:", error)
    }
    setLoading(false)
  }

  const createGoal = async (useAI: boolean) => {
    if (!goalInput.trim()) return
    setSaving(true)
    setAiSuggestions(null)

    try {
      const res = await fetch("/api/ai/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: goalInput, useAI })
      })
      const data = await res.json()

      if (data.aiSuggestions) {
        setAiSuggestions(data.aiSuggestions)
      }

      if (data.goal) {
        setGoals([data.goal, ...goals])
        if (!useAI) {
          setShowModal(false)
          setGoalInput("")
        }
      }
    } catch (error) {
      console.error("Erro ao criar meta:", error)
    }
    setSaving(false)
  }

  const updateGoalProgress = async (id: string, currentAmount: number) => {
    try {
      await fetch("/api/ai/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, currentAmount })
      })
      setGoals(goals.map(g => g.id === id ? { ...g, currentAmount } : g))
    } catch (error) {
      console.error("Erro ao atualizar:", error)
    }
  }

  const completeGoal = async (id: string) => {
    try {
      await fetch("/api/ai/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: 'CONCLUIDA' })
      })
      setGoals(goals.map(g => g.id === id ? { ...g, status: 'CONCLUIDA' } : g))
    } catch (error) {
      console.error("Erro ao completar:", error)
    }
  }

  const deleteGoal = async (id: string) => {
    try {
      await fetch(`/api/ai/goals?id=${id}`, { method: "DELETE" })
      setGoals(goals.filter(g => g.id !== id))
    } catch (error) {
      console.error("Erro ao deletar:", error)
    }
  }

  const activeGoals = goals.filter(g => g.status === 'EM_ANDAMENTO')
  const completedGoals = goals.filter(g => g.status === 'CONCLUIDA')

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Metas Financeiras</h1>
            <p className="text-gray-500">Defina e acompanhe seus objetivos</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" /> Nova Meta
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Metas Ativas */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Em Andamento ({activeGoals.length})</h2>
              
              {activeGoals.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center">
                  <Target className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma meta ativa. Crie sua primeira meta!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {activeGoals.map(goal => {
                    const progress = goal.targetAmount > 0 
                      ? (goal.currentAmount / goal.targetAmount) * 100 
                      : 0

                    return (
                      <div key={goal.id} className="bg-white rounded-2xl p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-gray-900">{goal.title}</h3>
                            {goal.description && (
                              <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            goal.priority === 'ALTA' ? 'bg-red-100 text-red-600' :
                            goal.priority === 'MEDIA' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {goal.priority}
                          </span>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{formatCurrency(goal.currentAmount)}</span>
                            <span className="text-gray-500">{formatCurrency(goal.targetAmount)}</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{progress.toFixed(0)}% concluído</p>
                        </div>

                        {goal.deadline && (
                          <p className="text-sm text-gray-500 mb-4">
                            Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedGoal(goal)}
                            className="flex-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                          >
                            Atualizar Progresso
                          </button>
                          {progress >= 100 && (
                            <button
                              onClick={() => completeGoal(goal.id)}
                              className="px-3 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {goal.aiPlan && (
                          <button
                            onClick={() => setSelectedGoal(goal)}
                            className="w-full mt-3 text-sm text-purple-600 hover:underline flex items-center justify-center gap-1"
                          >
                            <Sparkles className="w-4 h-4" /> Ver plano da IA
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Metas Concluídas */}
            {completedGoals.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  <Trophy className="w-5 h-5 inline mr-2 text-yellow-500" />
                  Concluídas ({completedGoals.length})
                </h2>
                <div className="space-y-2">
                  {completedGoals.map(goal => (
                    <div key={goal.id} className="bg-green-50 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{goal.title}</p>
                        <p className="text-sm text-green-600">{formatCurrency(goal.targetAmount)} alcançado!</p>
                      </div>
                      <Check className="w-6 h-6 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal Nova Meta */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-lg bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Nova Meta</h2>
                <button onClick={() => { setShowModal(false); setAiSuggestions(null); setGoalInput(""); }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descreva sua meta
                </label>
                <textarea
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="Ex: Quero viajar para Europa no final do ano"
                  className="w-full px-4 py-3 border rounded-xl resize-none h-24"
                />
              </div>

              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => createGoal(true)}
                  disabled={saving || !goalInput.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Criar com IA
                </button>
                <button
                  onClick={() => createGoal(false)}
                  disabled={saving || !goalInput.trim()}
                  className="flex-1 px-4 py-3 border rounded-xl hover:bg-gray-50 disabled:opacity-50"
                >
                  Criar Manual
                </button>
              </div>

              {aiSuggestions && (
                <div className="border-t pt-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Sugestões da IA
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <p className="font-medium text-gray-900">{aiSuggestions.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{aiSuggestions.smartGoal?.specific}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Valor Necessário</p>
                        <p className="font-bold text-gray-900">{formatCurrency(aiSuggestions.targetAmount || 0)}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Contribuição Mensal</p>
                        <p className="font-bold text-gray-900">{formatCurrency(aiSuggestions.monthlyContribution || 0)}</p>
                      </div>
                    </div>

                    {!aiSuggestions.isRealistic && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <p className="text-sm text-yellow-800">{aiSuggestions.realismNote}</p>
                      </div>
                    )}

                    {aiSuggestions.strategies?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Estratégias:</p>
                        <ul className="space-y-1">
                          {aiSuggestions.strategies.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-purple-500">•</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { setShowModal(false); setAiSuggestions(null); setGoalInput(""); }}
                    className="w-full mt-6 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700"
                  >
                    Meta Criada! Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Atualizar Progresso */}
        {selectedGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-md bg-white rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">{selectedGoal.title}</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor atual
                </label>
                <input
                  type="number"
                  value={selectedGoal.currentAmount}
                  onChange={(e) => setSelectedGoal({ ...selectedGoal, currentAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border rounded-xl"
                />
              </div>

              {selectedGoal.aiPlan && (
                <div className="mb-4 p-4 bg-purple-50 rounded-xl">
                  <h4 className="font-medium text-gray-900 mb-2">Plano da IA</h4>
                  {selectedGoal.aiPlan.strategies?.map((s: string, i: number) => (
                    <p key={i} className="text-sm text-gray-600">• {s}</p>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedGoal(null)}
                  className="flex-1 px-4 py-3 border rounded-xl hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    updateGoalProgress(selectedGoal.id, selectedGoal.currentAmount)
                    setSelectedGoal(null)
                  }}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
