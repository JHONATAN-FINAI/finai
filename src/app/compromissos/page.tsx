"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  Plus, Trash2, Edit2, X, Loader2, ChevronDown, ChevronUp,
  Home, Wifi, Tv, Dumbbell, Car, Shield, CreditCard, Sparkles,
  Building, Smartphone, Heart, Zap, Calendar, TrendingDown
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const categoryIcons: Record<string, any> = {
  "Moradia": Home, "Internet": Wifi, "Streaming": Tv, "Academia": Dumbbell,
  "Transporte": Car, "Seguro": Shield, "Cartão": CreditCard, "Financiamento": Building,
  "Celular": Smartphone, "Saúde": Heart, "Energia": Zap, "default": CreditCard
}

export default function CompromissosPage() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expenses, setExpenses] = useState<any[]>([])
  const [debts, setDebts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [expandedSection, setExpandedSection] = useState<string | null>("expenses")
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [editingDebt, setEditingDebt] = useState<any>(null)
  const [tips, setTips] = useState<string[]>([])
  const [loadingTips, setLoadingTips] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ name: "", amount: "", categoryId: "", dueDay: "", notes: "" })
  const [debtForm, setDebtForm] = useState({ name: "", type: "CARTAO", totalBalance: "", monthlyPayment: "", remainingInstallments: "", dueDay: "", notes: "" })

  useEffect(() => { if (status === "unauthenticated") router.push("/") }, [status, router])

  useEffect(() => {
    async function loadData() {
      try {
        const [expRes, debtRes, catRes] = await Promise.all([
          fetch("/api/expenses?type=FIXA"), fetch("/api/debts"), fetch("/api/categories")
        ])
        const [expData, debtData, catData] = await Promise.all([expRes.json(), debtRes.json(), catRes.json()])
        setExpenses(expData.expenses || [])
        setDebts(debtData.debts || [])
        setCategories(catData.categories || [])
      } catch (error) { console.error("Erro:", error) }
      setLoading(false)
    }
    if (status === "authenticated") loadData()
  }, [status])

  const totalFixas = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalDividas = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)

  const generateTips = async () => {
    setLoadingTips(true)
    try {
      const res = await fetch("/api/ai/tips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expenses, debts }) })
      const data = await res.json()
      setTips(data.tips || [])
    } catch (error) { console.error("Erro:", error) }
    setLoadingTips(false)
  }

  const saveExpense = async () => {
    setSaving(true)
    try {
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses"
      const res = await fetch(url, { method: editingExpense ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...expenseForm, type: "FIXA", recurrenceType: "MENSAL" }) })
      if (res.ok) {
        const expRes = await fetch("/api/expenses?type=FIXA")
        setExpenses((await expRes.json()).expenses || [])
        setShowExpenseModal(false)
        setEditingExpense(null)
        setExpenseForm({ name: "", amount: "", categoryId: "", dueDay: "", notes: "" })
      }
    } catch (error) { console.error("Erro:", error) }
    setSaving(false)
  }

  const deleteExpense = async (id: string) => {
    if (!confirm("Excluir esta despesa fixa?")) return
    try { await fetch(`/api/expenses/${id}`, { method: "DELETE" }); setExpenses(expenses.filter(e => e.id !== id)) } catch (error) { console.error("Erro:", error) }
  }

  const saveDebt = async () => {
    setSaving(true)
    try {
      const url = editingDebt ? `/api/debts/${editingDebt.id}` : "/api/debts"
      const res = await fetch(url, { method: editingDebt ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(debtForm) })
      if (res.ok) {
        const debtRes = await fetch("/api/debts")
        setDebts((await debtRes.json()).debts || [])
        setShowDebtModal(false)
        setEditingDebt(null)
        setDebtForm({ name: "", type: "CARTAO", totalBalance: "", monthlyPayment: "", remainingInstallments: "", dueDay: "", notes: "" })
      }
    } catch (error) { console.error("Erro:", error) }
    setSaving(false)
  }

  const deleteDebt = async (id: string) => {
    if (!confirm("Excluir esta dívida?")) return
    try { await fetch(`/api/debts/${id}`, { method: "DELETE" }); setDebts(debts.filter(d => d.id !== id)) } catch (error) { console.error("Erro:", error) }
  }

  const openEditExpense = (expense: any) => {
    setEditingExpense(expense)
    setExpenseForm({ name: expense.name, amount: expense.amount.toString(), categoryId: expense.categoryId, dueDay: expense.dueDay?.toString() || "", notes: expense.notes || "" })
    setShowExpenseModal(true)
  }

  const openEditDebt = (debt: any) => {
    setEditingDebt(debt)
    setDebtForm({ name: debt.name, type: debt.type, totalBalance: debt.totalBalance.toString(), monthlyPayment: debt.monthlyPayment.toString(), remainingInstallments: debt.remainingInstallments?.toString() || "", dueDay: debt.dueDay?.toString() || "", notes: debt.notes || "" })
    setShowDebtModal(true)
  }

  if (status === "loading" || loading) {
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compromissos Fixos</h1>
          <p className="text-gray-500">Despesas e dívidas que se repetem todo mês</p>
        </div>

        {/* Cards Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-blue-200" />
              <span className="text-blue-100 text-sm">Despesas Fixas</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalFixas)}</p>
            <p className="text-blue-200 text-xs mt-1">{expenses.length} compromisso(s)</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-500 to-rose-600 p-5 rounded-2xl text-white shadow-lg shadow-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-red-200" />
              <span className="text-red-100 text-sm">Dívidas/Parcelas</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalDividas)}</p>
            <p className="text-red-200 text-xs mt-1">{debts.length} dívida(s)</p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 text-sm">Total Mensal</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFixas + totalDividas)}</p>
            <p className="text-gray-400 text-xs mt-1">Saída fixa todo mês</p>
          </div>
        </div>

        {/* Dicas IA */}
        <div className="bg-gradient-to-r from-purple-50 via-fuchsia-50 to-pink-50 p-5 rounded-2xl border border-purple-100/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Dicas de Economia</span>
            </div>
            <button 
              onClick={generateTips} 
              disabled={loadingTips} 
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
            >
              {loadingTips ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Gerar Dicas
            </button>
          </div>
          {tips.length > 0 ? (
            <div className="space-y-2">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white/60 rounded-xl">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-600 text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Clique em "Gerar Dicas" para receber sugestões personalizadas de economia baseadas nos seus compromissos.</p>
          )}
        </div>

        {/* Despesas Fixas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setExpandedSection(expandedSection === "expenses" ? null : "expenses")} 
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Despesas Fixas</p>
                <p className="text-sm text-gray-500">{expenses.length} compromisso(s) cadastrado(s)</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-blue-600">{formatCurrency(totalFixas)}</span>
              {expandedSection === "expenses" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </button>
          
          {expandedSection === "expenses" && (
            <div className="px-5 pb-5 border-t border-gray-100">
              <div className="pt-4 space-y-3">
                {expenses.map(expense => {
                  const Icon = categoryIcons[expense.category?.name] || categoryIcons.default
                  return (
                    <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Icon className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{expense.name}</p>
                          <p className="text-xs text-gray-500">
                            {expense.category?.name}
                            {expense.dueDay && (
                              <span className="inline-flex items-center gap-1 ml-2">
                                <Calendar className="w-3 h-3" /> Dia {expense.dueDay}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{formatCurrency(expense.amount)}</span>
                        <button onClick={() => openEditExpense(expense)} className="p-2 hover:bg-white rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                        </button>
                        <button onClick={() => deleteExpense(expense.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  )
                })}
                <button 
                  onClick={() => { setEditingExpense(null); setExpenseForm({ name: "", amount: "", categoryId: "", dueDay: "", notes: "" }); setShowExpenseModal(true) }} 
                  className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-5 h-5" /> Adicionar Despesa Fixa
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dívidas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setExpandedSection(expandedSection === "debts" ? null : "debts")} 
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-rose-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Dívidas e Parcelas</p>
                <p className="text-sm text-gray-500">{debts.length} dívida(s) cadastrada(s)</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-red-600">{formatCurrency(totalDividas)}</span>
              {expandedSection === "debts" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </button>
          
          {expandedSection === "debts" && (
            <div className="px-5 pb-5 border-t border-gray-100">
              <div className="pt-4 space-y-3">
                {debts.map(debt => (
                  <div key={debt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <CreditCard className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{debt.name}</p>
                        <p className="text-xs text-gray-500">
                          {debt.type === "CARTAO" ? "Cartão" : debt.type === "EMPRESTIMO" ? "Empréstimo" : debt.type === "FINANCIAMENTO" ? "Financiamento" : debt.type}
                          {debt.remainingInstallments && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">{debt.remainingInstallments}x restantes</span>}
                          {debt.dueDay && <span className="ml-2">• Dia {debt.dueDay}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{formatCurrency(debt.monthlyPayment)}</span>
                      <button onClick={() => openEditDebt(debt)} className="p-2 hover:bg-white rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                      </button>
                      <button onClick={() => deleteDebt(debt.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => { setEditingDebt(null); setDebtForm({ name: "", type: "CARTAO", totalBalance: "", monthlyPayment: "", remainingInstallments: "", dueDay: "", notes: "" }); setShowDebtModal(true) }} 
                  className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-red-300 hover:text-red-600 hover:bg-red-50/50 flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-5 h-5" /> Adicionar Dívida/Parcela
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Despesa Fixa */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{editingExpense ? "Editar" : "Nova"} Despesa Fixa</h2>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input type="text" value={expenseForm.name} onChange={e => setExpenseForm({...expenseForm, name: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Ex: Aluguel, Internet..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Mensal</label>
                <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="0,00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select value={expenseForm.categoryId} onChange={e => setExpenseForm({...expenseForm, categoryId: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                  <option value="">Selecione...</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dia do Vencimento</label>
                <input type="number" min="1" max="31" value={expenseForm.dueDay} onChange={e => setExpenseForm({...expenseForm, dueDay: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="1-31" />
              </div>
              <button onClick={saveExpense} disabled={saving || !expenseForm.name || !expenseForm.amount} 
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dívida */}
      {showDebtModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{editingDebt ? "Editar" : "Nova"} Dívida</h2>
              <button onClick={() => setShowDebtModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input type="text" value={debtForm.name} onChange={e => setDebtForm({...debtForm, name: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" placeholder="Ex: Cartão Nubank..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select value={debtForm.type} onChange={e => setDebtForm({...debtForm, type: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all">
                  <option value="CARTAO">Cartão de Crédito</option>
                  <option value="EMPRESTIMO">Empréstimo</option>
                  <option value="FINANCIAMENTO">Financiamento</option>
                  <option value="CHEQUE_ESPECIAL">Cheque Especial</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor Total</label>
                  <input type="number" value={debtForm.totalBalance} onChange={e => setDebtForm({...debtForm, totalBalance: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parcela Mensal</label>
                  <input type="number" value={debtForm.monthlyPayment} onChange={e => setDebtForm({...debtForm, monthlyPayment: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" placeholder="0,00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parcelas Restantes</label>
                  <input type="number" value={debtForm.remainingInstallments} onChange={e => setDebtForm({...debtForm, remainingInstallments: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" placeholder="Ex: 12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dia Vencimento</label>
                  <input type="number" min="1" max="31" value={debtForm.dueDay} onChange={e => setDebtForm({...debtForm, dueDay: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" placeholder="1-31" />
                </div>
              </div>
              <button onClick={saveDebt} disabled={saving || !debtForm.name || !debtForm.monthlyPayment} 
                className="w-full py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
