"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { Plus, Trash2, AlertTriangle, X, Sparkles, Loader2, ChevronDown, ChevronUp, CreditCard } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function GastosPage() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [classifying, setClassifying] = useState(false)
  
  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [spending, setSpending] = useState<Record<string, number>>({})
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  
  const [form, setForm] = useState({
    description: "",
    amount: "",
    categoryId: "",
    categoryName: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "PIX",
    installments: 1,
    currentInstallment: 1
  })
  const [classified, setClassified] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function loadData() {
      try {
        const now = new Date()
        const month = now.getMonth() + 1
        const year = now.getFullYear()

        const [transRes, catRes, planRes] = await Promise.all([
          fetch(`/api/transactions?month=${month}&year=${year}`),
          fetch("/api/categories"),
          fetch("/api/plan")
        ])

        const transData = await transRes.json()
        const catData = await catRes.json()
        const planData = await planRes.json()

        setTransactions(transData.transactions || [])
        setCategories(catData.categories || [])

        // Carregar orçamentos
        const newBudgets: Record<string, number> = {}
        planData.plan?.categories?.forEach((pc: any) => {
          newBudgets[pc.categoryId] = pc.monthlyBudget
        })
        setBudgets(newBudgets)

        // Calcular gastos por categoria
        const newSpending: Record<string, number> = {}
        transData.transactions?.forEach((t: any) => {
          newSpending[t.categoryId] = (newSpending[t.categoryId] || 0) + t.amount
        })
        setSpending(newSpending)
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      }
      setLoading(false)
    }

    if (status === "authenticated") {
      loadData()
    }
  }, [status])

  // Classificação automática
  const classifyTransaction = async () => {
    if (!form.description || !form.amount) return
    
    setClassifying(true)
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          amount: parseFloat(form.amount),
          mode: "transaction"
        })
      })
      const data = await res.json()
      
      if (data.success && data.categoryId) {
        setForm({
          ...form,
          categoryId: data.categoryId,
          categoryName: data.categoryName
        })
        setClassified(true)
      }
    } catch (error) {
      console.error("Erro na classificação:", error)
    }
    setClassifying(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || !form.amount) return
    
    // Se não classificou, classifica primeiro
    if (!classified || !form.categoryId) {
      await classifyTransaction()
      return
    }

    setSaving(true)
    try {
      const isCredit = form.paymentMethod === "CARTAO_CREDITO"
      const installments = isCredit ? form.installments : 1
      const totalAmount = parseFloat(form.amount)
      const installmentAmount = totalAmount / installments
      
      // Se parcelado no cartão (mais de 1x), cria como DÍVIDA
      if (isCredit && installments > 1) {
        const transactionDate = new Date(form.date)
        
        const res = await fetch("/api/debts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.description,
            type: "CARTAO",
            totalBalance: totalAmount,
            monthlyPayment: installmentAmount,
            remainingInstallments: installments,
            startMonth: transactionDate.getMonth() + 1,
            startYear: transactionDate.getFullYear(),
            dueDay: transactionDate.getDate(),
            notes: `Categoria: ${form.categoryName || 'Não classificada'}`
          })
        })

        const data = await res.json()
        if (data.debt) {
          resetForm()
          setShowModal(false)
          alert(`Dívida criada com sucesso!\n\n${form.description}\n${installments}x de ${formatCurrency(installmentAmount)}\n\nVeja em: Diagnóstico > Dívidas`)
        }
      } else {
        // Pagamento à vista ou débito/pix/dinheiro - cria apenas transação
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: form.description,
            amount: totalAmount,
            categoryId: form.categoryId,
            date: form.date,
            paymentMethod: form.paymentMethod
          })
        })

        const data = await res.json()
        if (data.transaction) {
          setTransactions([data.transaction, ...transactions])
          setSpending({
            ...spending,
            [form.categoryId]: (spending[form.categoryId] || 0) + totalAmount
          })
          resetForm()
          setShowModal(false)
        }
      }
    } catch (error) {
      console.error("Erro ao salvar:", error)
    }
    setSaving(false)
  }

  const resetForm = () => {
    setForm({
      description: "",
      amount: "",
      categoryId: "",
      categoryName: "",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "PIX",
      installments: 1,
      currentInstallment: 1
    })
    setClassified(false)
  }

  const deleteTransaction = async (id: string, categoryId: string, amount: number) => {
    try {
      await fetch(`/api/transactions?id=${id}`, { method: "DELETE" })
      setTransactions(transactions.filter(t => t.id !== id))
      setSpending({
        ...spending,
        [categoryId]: (spending[categoryId] || 0) - amount
      })
    } catch (error) {
      console.error("Erro ao deletar:", error)
    }
  }

  // Filtrar transações por categoria
  const getTransactionsByCategory = (categoryId: string) => {
    return transactions.filter(t => t.categoryId === categoryId)
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId)
  }

  const totalSpent = Object.values(spending).reduce((sum, v) => sum + v, 0)
  const totalBudget = Object.values(budgets).reduce((sum, v) => sum + v, 0)

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Controle de Gastos</h1>
            <p className="text-gray-500">Registre e acompanhe seus gastos diários</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" /> Novo Gasto
          </button>
        </div>

        {/* Resumo do Mês */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">Gasto no Mês</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">Orçamento Total</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">Disponível</p>
            <p className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalBudget - totalSpent)}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">Transações</p>
            <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
          </div>
        </div>

        {/* Gastos por Categoria - Clicáveis */}
        <h2 className="text-lg font-bold text-gray-900 mb-4">Gastos por Categoria</h2>
        <p className="text-sm text-gray-500 mb-4">Clique em uma categoria para ver os gastos detalhados</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {categories.map(cat => {
            const budget = budgets[cat.id] || 0
            const spent = spending[cat.id] || 0
            const percent = budget > 0 ? (spent / budget) * 100 : 0
            const isOver = percent > 100
            const isWarning = percent >= 80 && percent <= 100
            const isExpanded = expandedCategory === cat.id
            const categoryTransactions = getTransactionsByCategory(cat.id)

            if (budget === 0 && spent === 0) return null

            return (
              <div key={cat.id} className={`rounded-xl overflow-hidden ${
                isOver ? 'bg-red-50 border border-red-200' :
                isWarning ? 'bg-yellow-50 border border-yellow-200' :
                'bg-white border border-gray-100'
              }`}>
                {/* Header da Categoria - Clicável */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full p-4 text-left hover:bg-black/5 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      {(isOver || isWarning) && (
                        <AlertTriangle className={`w-4 h-4 ${isOver ? 'text-red-500' : 'text-yellow-500'}`} />
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className={isOver ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                      {formatCurrency(spent)}
                    </span>
                    {budget > 0 && (
                      <span className="text-gray-400">/ {formatCurrency(budget)}</span>
                    )}
                  </div>
                  {budget > 0 && (
                    <>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{percent.toFixed(0)}% utilizado</p>
                    </>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{categoryTransactions.length} transação(ões)</p>
                </button>

                {/* Lista de Gastos da Categoria - Expandível */}
                {isExpanded && categoryTransactions.length > 0 && (
                  <div className="border-t border-gray-200 bg-white/50">
                    <div className="max-h-64 overflow-y-auto">
                      {categoryTransactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{t.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(t.date).toLocaleDateString('pt-BR')} • {t.paymentMethod === 'CARTAO_CREDITO' ? 'Crédito' : t.paymentMethod === 'CARTAO_DEBITO' ? 'Débito' : t.paymentMethod}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <p className="text-sm font-semibold text-red-600">{formatCurrency(t.amount)}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteTransaction(t.id, t.categoryId, t.amount)
                              }}
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isExpanded && categoryTransactions.length === 0 && (
                  <div className="border-t border-gray-200 p-4 text-center text-sm text-gray-500">
                    Nenhum gasto nesta categoria
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Lista de Transações Recentes */}
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Últimas Transações</h2>
          
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum gasto registrado este mês</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{t.description}</p>
                      <p className="text-sm text-gray-500">
                        {t.category?.name} • {new Date(t.date).toLocaleDateString('pt-BR')} • {
                          t.paymentMethod === 'CARTAO_CREDITO' ? 'Crédito' : 
                          t.paymentMethod === 'CARTAO_DEBITO' ? 'Débito' : 
                          t.paymentMethod
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-red-600">{formatCurrency(t.amount)}</p>
                    <button
                      onClick={() => deleteTransaction(t.id, t.categoryId, t.amount)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {transactions.length > 10 && (
                <p className="text-center text-sm text-gray-500 pt-2">
                  Mostrando 10 de {transactions.length} transações
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Novo Gasto */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Novo Gasto</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => { setForm({ ...form, description: e.target.value }); setClassified(false); }}
                    placeholder="Ex: Almoço, Uber, Supermercado"
                    className="w-full px-4 py-3 border rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Total
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => { setForm({ ...form, amount: e.target.value }); setClassified(false); }}
                    onBlur={() => {
                      if (form.description && form.amount && !classified) {
                        classifyTransaction()
                      }
                    }}
                    placeholder="0,00"
                    className="w-full px-4 py-3 border rounded-xl"
                    required
                  />
                </div>

                {/* Classificação automática */}
                {!classified ? (
                  <button
                    type="button"
                    onClick={classifyTransaction}
                    disabled={classifying || !form.description || !form.amount}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
                  >
                    {classifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Classificando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Classificar Categoria
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-600">Categoria sugerida:</span>
                    </div>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Você pode ajustar se necessário</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pagamento
                    </label>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value, installments: e.target.value === 'CARTAO_CREDITO' ? form.installments : 1 })}
                      className="w-full px-4 py-3 border rounded-xl"
                    >
                      <option value="PIX">Pix</option>
                      <option value="CARTAO_CREDITO">Cartão Crédito</option>
                      <option value="CARTAO_DEBITO">Cartão Débito</option>
                      <option value="DINHEIRO">Dinheiro</option>
                    </select>
                  </div>
                </div>

                {/* Parcelamento - Aparece apenas quando Cartão de Crédito */}
                {form.paymentMethod === "CARTAO_CREDITO" && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Parcelamento</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Parcelas</label>
                        <select
                          value={form.installments}
                          onChange={(e) => setForm({ ...form, installments: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                            <option key={n} value={n}>{n}x</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Valor da Parcela</label>
                        <div className="px-3 py-2 bg-white border rounded-lg text-sm font-medium text-gray-900">
                          {form.amount ? formatCurrency(parseFloat(form.amount) / form.installments) : 'R$ 0,00'}
                        </div>
                      </div>
                    </div>
                    {form.installments > 1 && (
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700">
                          <strong>Será criada uma dívida</strong> de {form.installments}x de {form.amount ? formatCurrency(parseFloat(form.amount) / form.installments) : 'R$ 0,00'} na aba Dívidas, e a primeira parcela será lançada como gasto deste mês.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="flex-1 px-4 py-3 border rounded-xl hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !form.description || !form.amount}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : classified ? "Salvar Gasto" : "Classificar e Salvar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
