"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  Plus, Trash2, Edit2, X, Loader2, ChevronDown, ChevronUp,
  Home, Wifi, Tv, Dumbbell, Car, Shield, CreditCard, Sparkles,
  Building, Smartphone, Heart, Zap
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

  if (status === "loading" || loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div></AppLayout>

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8"><h1 className="text-2xl font-bold text-gray-900">Compromissos Fixos</h1><p className="text-gray-500">Despesas fixas e dívidas que se repetem todo mês</p></div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl"><p className="text-sm text-gray-500">Despesas Fixas</p><p className="text-xl font-bold text-blue-600">{formatCurrency(totalFixas)}</p></div>
          <div className="bg-white p-4 rounded-xl"><p className="text-sm text-gray-500">Dívidas/Parcelas</p><p className="text-xl font-bold text-red-600">{formatCurrency(totalDividas)}</p></div>
          <div className="bg-white p-4 rounded-xl"><p className="text-sm text-gray-500">Total Mensal</p><p className="text-xl font-bold text-gray-900">{formatCurrency(totalFixas + totalDividas)}</p></div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" /><span className="font-medium text-gray-900">Dicas de Economia</span></div>
            <button onClick={generateTips} disabled={loadingTips} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {loadingTips ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Gerar Dicas
            </button>
          </div>
          {tips.length > 0 ? <ul className="space-y-2">{tips.map((tip, i) => <li key={i} className="text-sm text-gray-700 pl-4 border-l-2 border-purple-300">{tip}</li>)}</ul> : <p className="text-sm text-gray-500">Clique em "Gerar Dicas" para receber sugestões de economia.</p>}
        </div>
        <div className="bg-white rounded-xl mb-4">
          <button onClick={() => setExpandedSection(expandedSection === "expenses" ? null : "expenses")} className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><Home className="w-5 h-5 text-blue-600" /></div><div className="text-left"><p className="font-medium text-gray-900">Despesas Fixas</p><p className="text-sm text-gray-500">{expenses.length} itens</p></div></div>
            <div className="flex items-center gap-3"><span className="font-bold text-blue-600">{formatCurrency(totalFixas)}</span>{expandedSection === "expenses" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}</div>
          </button>
          {expandedSection === "expenses" && (
            <div className="px-4 pb-4"><div className="border-t pt-4 space-y-3">
              {expenses.map(expense => { const Icon = categoryIcons[expense.category?.name] || categoryIcons.default; return (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3"><Icon className="w-5 h-5 text-gray-500" /><div><p className="font-medium text-gray-900">{expense.name}</p><p className="text-xs text-gray-500">{expense.category?.name}{expense.dueDay && ` • Vence dia ${expense.dueDay}`}</p></div></div>
                  <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{formatCurrency(expense.amount)}</span><button onClick={() => openEditExpense(expense)} className="p-1 hover:bg-gray-200 rounded"><Edit2 className="w-4 h-4 text-gray-500" /></button><button onClick={() => deleteExpense(expense.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button></div>
                </div>
              )})}
              <button onClick={() => { setEditingExpense(null); setExpenseForm({ name: "", amount: "", categoryId: "", dueDay: "", notes: "" }); setShowExpenseModal(true) }} className="w-full p-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Adicionar Despesa Fixa</button>
            </div></div>
          )}
        </div>
        <div className="bg-white rounded-xl">
          <button onClick={() => setExpandedSection(expandedSection === "debts" ? null : "debts")} className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5 text-red-600" /></div><div className="text-left"><p className="font-medium text-gray-900">Dívidas e Parcelas</p><p className="text-sm text-gray-500">{debts.length} itens</p></div></div>
            <div className="flex items-center gap-3"><span className="font-bold text-red-600">{formatCurrency(totalDividas)}</span>{expandedSection === "debts" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}</div>
          </button>
          {expandedSection === "debts" && (
            <div className="px-4 pb-4"><div className="border-t pt-4 space-y-3">
              {debts.map(debt => (
                <div key={debt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-gray-500" /><div><p className="font-medium text-gray-900">{debt.name}</p><p className="text-xs text-gray-500">{debt.type === "CARTAO" ? "Cartão" : debt.type === "EMPRESTIMO" ? "Empréstimo" : debt.type === "FINANCIAMENTO" ? "Financiamento" : debt.type}{debt.remainingInstallments && ` • ${debt.remainingInstallments}x restantes`}{debt.dueDay && ` • Vence dia ${debt.dueDay}`}</p></div></div>
                  <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{formatCurrency(debt.monthlyPayment)}</span><button onClick={() => openEditDebt(debt)} className="p-1 hover:bg-gray-200 rounded"><Edit2 className="w-4 h-4 text-gray-500" /></button><button onClick={() => deleteDebt(debt.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button></div>
                </div>
              ))}
              <button onClick={() => { setEditingDebt(null); setDebtForm({ name: "", type: "CARTAO", totalBalance: "", monthlyPayment: "", remainingInstallments: "", dueDay: "", notes: "" }); setShowDebtModal(true) }} className="w-full p-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-red-300 hover:text-red-600 flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Adicionar Dívida/Parcela</button>
            </div></div>
          )}
        </div>
      </div>
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">{editingExpense ? "Editar" : "Nova"} Despesa Fixa</h2><button onClick={() => setShowExpenseModal(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome</label><input type="text" value={expenseForm.name} onChange={e => setExpenseForm({...expenseForm, name: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Ex: Aluguel, Internet..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Valor Mensal</label><input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="0,00" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label><select value={expenseForm.categoryId} onChange={e => setExpenseForm({...expenseForm, categoryId: e.target.value})} className="w-full p-3 border rounded-xl"><option value="">Selecione...</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dia do Vencimento</label><input type="number" min="1" max="31" value={expenseForm.dueDay} onChange={e => setExpenseForm({...expenseForm, dueDay: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="1-31" /></div>
              <button onClick={saveExpense} disabled={saving || !expenseForm.name || !expenseForm.amount} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
      {showDebtModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">{editingDebt ? "Editar" : "Nova"} Dívida</h2><button onClick={() => setShowDebtModal(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome</label><input type="text" value={debtForm.name} onChange={e => setDebtForm({...debtForm, name: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Ex: Cartão Nubank..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label><select value={debtForm.type} onChange={e => setDebtForm({...debtForm, type: e.target.value})} className="w-full p-3 border rounded-xl"><option value="CARTAO">Cartão de Crédito</option><option value="EMPRESTIMO">Empréstimo</option><option value="FINANCIAMENTO">Financiamento</option><option value="CHEQUE_ESPECIAL">Cheque Especial</option><option value="OUTROS">Outros</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Valor Total</label><input type="number" value={debtForm.totalBalance} onChange={e => setDebtForm({...debtForm, totalBalance: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="0,00" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Parcela Mensal</label><input type="number" value={debtForm.monthlyPayment} onChange={e => setDebtForm({...debtForm, monthlyPayment: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="0,00" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Parcelas Restantes</label><input type="number" value={debtForm.remainingInstallments} onChange={e => setDebtForm({...debtForm, remainingInstallments: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Ex: 12" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dia do Vencimento</label><input type="number" min="1" max="31" value={debtForm.dueDay} onChange={e => setDebtForm({...debtForm, dueDay: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="1-31" /></div>
              <button onClick={saveDebt} disabled={saving || !debtForm.name || !debtForm.monthlyPayment} className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
