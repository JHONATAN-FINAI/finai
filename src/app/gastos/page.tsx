"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { Plus, Trash2, AlertTriangle, X, Sparkles, Loader2, ChevronDown, ChevronUp, CreditCard, Receipt, TrendingDown, Wallet } from "lucide-react"
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
    if (status === "unauthenticated") router.push("/")
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

        const newBudgets: Record<string, number> = {}
        planData.plan?.categories?.forEach((pc: any) => {
          newBudgets[pc.categoryId] = pc.monthlyBudget
        })
        setBudgets(newBudgets)

        const newSpending: Record<string, number> = {}
        transData.transactions?.forEach((t: any) => {
          newSpending[t.categoryId] = (newSpending[t.categoryId] || 0) + t.amount
        })
        setSpending(newSpending)
      } catch (error) { console.error("Erro ao carregar dados:", error) }
      setLoading(false)
    }
    if (status === "authenticated") loadData()
  }, [status])

  const classifyTransaction = async () => {
    if (!form.description || !form.amount) return
    setClassifying(true)
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: form.description, amount: parseFloat(form.amount), mode: "transaction" })
      })
      const data = await res.json()
      if (data.success && data.categoryId) {
        setForm({ ...form, categoryId: data.categoryId, categoryName: data.categoryName })
        setClassified(true)
      }
    } catch (error) { console.error("Erro na classificação:", error) }
    setClassifying(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || !form.amount) return
    if (!classified || !form.categoryId) { await classifyTransaction(); return }

    setSaving(true)
    try {
      const isCredit = form.paymentMethod === "CARTAO_CREDITO"
      const installments = isCredit ? form.installments : 1
      const totalAmount = parseFloat(form.amount)
      const installmentAmount = totalAmount / installments
      
      if (isCredit && installments > 1) {
        const transactionDate = new Date(form.date)
        const res = await fetch("/api/debts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.description, type: "CARTAO", totalBalance: totalAmount,
            monthlyPayment: installmentAmount, remainingInstallments: installments,
            startMonth: transactionDate.getMonth() + 1, startYear: transactionDate.getFullYear(),
            dueDay: transactionDate.getDate(), notes: `Categoria: ${form.categoryName || 'Não classificada'}`
          })
        })
        const data = await res.json()
        if (data.debt) {
          resetForm(); setShowModal(false)
          alert(`Dívida criada!\n\n${form.description}\n${installments}x de ${formatCurrency(installmentAmount)}`)
        }
      } else {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: form.description, amount: totalAmount, categoryId: form.categoryId, date: form.date, paymentMethod: form.paymentMethod })
        })
        const data = await res.json()
        if (data.transaction) {
          setTransactions([data.transaction, ...transactions])
          setSpending({ ...spending, [form.categoryId]: (spending[form.categoryId] || 0) + totalAmount })
          resetForm(); setShowModal(false)
        }
      }
    } catch (error) { console.error("Erro ao salvar:", error) }
    setSaving(false)
  }

  const resetForm = () => {
    setForm({ description: "", amount: "", categoryId: "", categoryName: "", date: new Date().toISOString().split("T")[0], paymentMethod: "PIX", installments: 1, currentInstallment: 1 })
    setClassified(false)
  }

  const deleteTransaction = async (id: string, categoryId: string, amount: number) => {
    try {
      await fetch(`/api/transactions?id=${id}`, { method: "DELETE" })
      setTransactions(transactions.filter(t => t.id !== id))
      setSpending({ ...spending, [categoryId]: (spending[categoryId] || 0) - amount })
    } catch (error) { console.error("Erro ao deletar:", error) }
  }

  const getTransactionsByCategory = (categoryId: string) => transactions.filter(t => t.categoryId === categoryId)
  const toggleCategory = (categoryId: string) => setExpandedCategory(expandedCategory === categoryId ? null : categoryId)

  const totalSpent = Object.values(spending).reduce((sum, v) => sum + v, 0)
  const totalBudget = Object.values(budgets).reduce((sum, v) => sum + v, 0)

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
            <h1 className="text-2xl font-bold text-gray-900">Controle de Gastos</h1>
            <p className="text-gray-500">Registre e acompanhe seus gastos diários</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" /> Novo Gasto
          </button>
        </div>

        {/* Cards Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-red-500 to-rose-600 p-5 rounded-2xl text-white shadow-lg shadow-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-200" />
              <span className="text-red-100 text-sm">Gasto no Mês</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 text-sm">Orçamento Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
          </div>
          
          <div className={`p-5 rounded-2xl shadow-sm border ${totalBudget - totalSpent >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm ${totalBudget - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>Disponível</span>
            </div>
            <p className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalBudget - totalSpent)}
            </p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 text-sm">Transações</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
          </div>
        </div>

        {/* Gastos por Categoria */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Gastos por Categoria</h2>
          <p className="text-sm text-gray-500 mb-4">Clique para ver detalhes</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div key={cat.id} className={`rounded-2xl overflow-hidden transition-all ${
                  isOver ? 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200' :
                  isWarning ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200' :
                  'bg-white border border-gray-100 shadow-sm'
                }`}>
                  <button onClick={() => toggleCategory(cat.id)} className="w-full p-4 text-left hover:bg-black/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        {(isOver || isWarning) && <AlertTriangle className={`w-4 h-4 ${isOver ? 'text-red-500' : 'text-amber-500'}`} />}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className={isOver ? 'text-red-600 font-semibold' : 'text-gray-600'}>{formatCurrency(spent)}</span>
                      {budget > 0 && <span className="text-gray-400">/ {formatCurrency(budget)}</span>}
                    </div>
                    {budget > 0 && (
                      <>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? 'bg-gradient-to-r from-red-500 to-rose-500' : 
                            isWarning ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 
                            'bg-gradient-to-r from-emerald-400 to-green-500'
                          }`} style={{ width: `${Math.min(percent, 100)}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{percent.toFixed(0)}% utilizado • {categoryTransactions.length} gasto(s)</p>
                      </>
                    )}
                  </button>

                  {isExpanded && categoryTransactions.length > 0 && (
                    <div className="border-t border-gray-100 bg-white/80 max-h-64 overflow-y-auto">
                      {categoryTransactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{t.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(t.date).toLocaleDateString("pt-BR")} • {
                                t.paymentMethod === 'PIX' ? 'Pix' : t.paymentMethod === 'CARTAO_CREDITO' ? 'Crédito' : t.paymentMethod === 'CARTAO_DEBITO' ? 'Débito' : t.paymentMethod
                              }
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-2">
                            <span className="text-sm font-semibold text-red-500">{formatCurrency(t.amount)}</span>
                            <button onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id, t.categoryId, t.amount); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && categoryTransactions.length === 0 && (
                    <div className="border-t border-gray-100 p-4 text-center text-sm text-gray-500 bg-white/50">
                      Nenhum gasto nesta categoria
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Últimos Gastos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimos Gastos</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500">Nenhum gasto registrado ainda.</p>
              <button onClick={() => setShowModal(true)} className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                + Registrar primeiro gasto
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t.description}</p>
                      <p className="text-sm text-gray-500">{t.category?.name} • {new Date(t.date).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-red-500">{formatCurrency(t.amount)}</p>
                    <button onClick={() => deleteTransaction(t.id, t.categoryId, t.amount)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {transactions.length > 10 && <p className="text-center text-sm text-gray-500 pt-2">Mostrando 10 de {transactions.length}</p>}
            </div>
          )}
        </div>

        {/* Modal Novo Gasto */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Novo Gasto</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <input type="text" value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setClassified(false); }}
                    placeholder="Ex: Almoço, Uber, Supermercado" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor Total</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => { setForm({ ...form, amount: e.target.value }); setClassified(false); }}
                    onBlur={() => { if (form.description && form.amount && !classified) classifyTransaction() }}
                    placeholder="0,00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" required />
                </div>

                {!classified ? (
                  <button type="button" onClick={classifyTransaction} disabled={classifying || !form.description || !form.amount}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50">
                    {classifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Classificando...</> : <><Sparkles className="w-4 h-4" /> Classificar Categoria</>}
                  </button>
                ) : (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Categoria sugerida:</span>
                    </div>
                    <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500/20">
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pagamento</label>
                    <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value, installments: e.target.value === 'CARTAO_CREDITO' ? form.installments : 1 })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                      <option value="PIX">Pix</option>
                      <option value="CARTAO_CREDITO">Cartão Crédito</option>
                      <option value="CARTAO_DEBITO">Cartão Débito</option>
                      <option value="DINHEIRO">Dinheiro</option>
                    </select>
                  </div>
                </div>

                {form.paymentMethod === "CARTAO_CREDITO" && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Parcelamento</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Parcelas</label>
                        <select value={form.installments} onChange={(e) => setForm({ ...form, installments: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n}>{n}x</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Valor da Parcela</label>
                        <div className="px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-gray-900">
                          {form.amount ? formatCurrency(parseFloat(form.amount) / form.installments) : 'R$ 0,00'}
                        </div>
                      </div>
                    </div>
                    {form.installments > 1 && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700">Será criada uma dívida de {form.installments}x de {form.amount ? formatCurrency(parseFloat(form.amount) / form.installments) : 'R$ 0,00'}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-gray-700 transition-colors">Cancelar</button>
                  <button type="submit" disabled={saving || !form.description || !form.amount}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 font-medium transition-all disabled:opacity-50">
                    {saving ? "Salvando..." : classified ? "Salvar Gasto" : "Classificar"}
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
