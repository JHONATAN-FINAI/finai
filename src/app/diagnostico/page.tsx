"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Trash2,
  Check,
  Wallet,
  CreditCard,
  Receipt,
  Sparkles,
  Loader2,
  Calendar
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const steps = [
  { id: 1, name: "Mês Inicial", icon: Calendar },
  { id: 2, name: "Receitas", icon: Wallet },
  { id: 3, name: "Despesas", icon: Receipt },
  { id: 4, name: "Dívidas", icon: CreditCard },
  { id: 5, name: "Revisão", icon: Check },
]

const months = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
]

interface Income {
  id?: string
  name: string
  amount: string
  type: string
  recurrenceType: string
}

interface Expense {
  id?: string
  name: string
  amount: string
  categoryId: string
  categoryName?: string
  type: string
  recurrenceType: string
}

interface Debt {
  id?: string
  name: string
  type: string
  totalBalance: string
  interestRate: string
  monthlyPayment: string
  remainingInstallments: string
}

export default function DiagnosticoPage() {
  const { status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  
  // Mês de referência
  const now = new Date()
  const [referenceMonth, setReferenceMonth] = useState(now.getMonth() + 1)
  const [referenceYear, setReferenceYear] = useState(now.getFullYear())
  
  const [incomes, setIncomes] = useState<Income[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [debts, setDebts] = useState<Debt[]>([])

  const [newIncome, setNewIncome] = useState<Income>({ name: "", amount: "", type: "FIXA", recurrenceType: "MENSAL" })
  const [newExpense, setNewExpense] = useState<Expense>({ name: "", amount: "", categoryId: "", type: "FIXA", recurrenceType: "MENSAL" })
  const [newDebt, setNewDebt] = useState<Debt>({ name: "", type: "CARTAO", totalBalance: "", interestRate: "", monthlyPayment: "", remainingInstallments: "" })
  
  const [expenseClassified, setExpenseClassified] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, incRes, expRes, debtRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/incomes"),
          fetch("/api/expenses"),
          fetch("/api/debts")
        ])

        const catData = await catRes.json()
        const incData = await incRes.json()
        const expData = await expRes.json()
        const debtData = await debtRes.json()

        setCategories(catData.categories || [])
        setIncomes(incData.incomes?.map((i: any) => ({ 
          id: i.id, 
          name: i.name, 
          amount: i.amount.toString(),
          type: i.type || "FIXA",
          recurrenceType: i.recurrenceType 
        })) || [])
        setExpenses(expData.expenses?.map((e: any) => ({ 
          id: e.id, 
          name: e.name, 
          amount: e.amount.toString(), 
          categoryId: e.categoryId,
          categoryName: e.category?.name,
          type: e.type,
          recurrenceType: e.recurrenceType 
        })) || [])
        setDebts(debtData.debts?.map((d: any) => ({ 
          id: d.id, 
          name: d.name, 
          type: d.type,
          totalBalance: d.totalBalance.toString(), 
          interestRate: d.interestRate?.toString() || "",
          monthlyPayment: d.monthlyPayment.toString(),
          remainingInstallments: d.remainingInstallments?.toString() || ""
        })) || [])
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      }
    }
    loadData()
  }, [])

  const classifyExpense = async () => {
    if (!newExpense.name || !newExpense.amount) return
    
    setClassifying(true)
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          description: newExpense.name,
          amount: parseFloat(newExpense.amount),
          mode: "expense"
        })
      })
      const data = await res.json()
      
      if (data.categoryId) {
        setNewExpense({
          ...newExpense,
          categoryId: data.categoryId,
          categoryName: data.categoryName,
          type: data.expenseType || "VARIAVEL",
          recurrenceType: data.recurrenceType || "MENSAL"
        })
        setExpenseClassified(true)
      }
    } catch (error) {
      console.error("Erro na classificação:", error)
    }
    setClassifying(false)
  }

  const addIncome = async () => {
    if (!newIncome.name || !newIncome.amount) return

    try {
      const res = await fetch("/api/incomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newIncome,
          startMonth: referenceMonth,
          startYear: referenceYear
        })
      })
      const data = await res.json()
      
      if (data.income) {
        setIncomes([...incomes, { 
          id: data.income.id, 
          ...newIncome 
        }])
        setNewIncome({ name: "", amount: "", type: "FIXA", recurrenceType: "MENSAL" })
      }
    } catch (error) {
      console.error("Erro ao adicionar receita:", error)
    }
  }

  const removeIncome = async (index: number) => {
    const income = incomes[index]
    if (income.id) {
      await fetch(`/api/incomes?id=${income.id}`, { method: "DELETE" })
    }
    setIncomes(incomes.filter((_, i) => i !== index))
  }

  const addExpense = async () => {
    if (!newExpense.name || !newExpense.amount || !newExpense.categoryId) return

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newExpense,
          startMonth: referenceMonth,
          startYear: referenceYear
        })
      })
      const data = await res.json()
      
      if (data.expense) {
        setExpenses([...expenses, { 
          id: data.expense.id, 
          ...newExpense 
        }])
        setNewExpense({ name: "", amount: "", categoryId: "", type: "FIXA", recurrenceType: "MENSAL" })
        setExpenseClassified(false)
      }
    } catch (error) {
      console.error("Erro ao adicionar despesa:", error)
    }
  }

  const removeExpense = async (index: number) => {
    const expense = expenses[index]
    if (expense.id) {
      await fetch(`/api/expenses?id=${expense.id}`, { method: "DELETE" })
    }
    setExpenses(expenses.filter((_, i) => i !== index))
  }

  const addDebt = async () => {
    if (!newDebt.name || !newDebt.totalBalance || !newDebt.monthlyPayment) return

    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDebt,
          startMonth: referenceMonth,
          startYear: referenceYear
        })
      })
      const data = await res.json()
      
      if (data.debt) {
        setDebts([...debts, { 
          id: data.debt.id, 
          ...newDebt 
        }])
        setNewDebt({ name: "", type: "CARTAO", totalBalance: "", interestRate: "", monthlyPayment: "", remainingInstallments: "" })
      }
    } catch (error) {
      console.error("Erro ao adicionar dívida:", error)
    }
  }

  const removeDebt = async (index: number) => {
    const debt = debts[index]
    if (debt.id) {
      await fetch(`/api/debts?id=${debt.id}`, { method: "DELETE" })
    }
    setDebts(debts.filter((_, i) => i !== index))
  }

  const finalizeDiagnostic = async () => {
    if (incomes.length === 0) return
    
    setLoading(true)
    try {
      // Iniciar o mês no sistema
      const monthRes = await fetch("/api/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "start",
          month: referenceMonth,
          year: referenceYear
        })
      })

      const diagRes = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complete: true })
      })
      const data = await diagRes.json()
      
      if (data.success) {
        router.push("/relatorio")
      }
    } catch (error) {
      console.error("Erro ao finalizar diagnóstico:", error)
    }
    setLoading(false)
  }

  const totalIncome = incomes.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0)
  const totalDebtPayment = debts.reduce((sum, d) => sum + parseFloat(d.monthlyPayment || "0"), 0)
  const fixedIncomes = incomes.filter(i => i.type === "FIXA")
  const variableIncomes = incomes.filter(i => i.type === "VARIAVEL")
  const fixedExpenses = expenses.filter(e => e.type === "FIXA")
  const variableExpenses = expenses.filter(e => e.type === "VARIAVEL")

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || ""
  }

  const getMonthName = (month: number) => {
    return months.find(m => m.value === month)?.label || ""
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
          {steps.map((s, index) => {
            const Icon = s.icon
            return (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= s.id ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`ml-2 text-sm font-medium hidden sm:block ${
                  step >= s.id ? "text-blue-600" : "text-gray-500"
                }`}>
                  {s.name}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-8 sm:w-16 h-1 mx-2 ${
                    step > s.id ? "bg-blue-600" : "bg-gray-200"
                  }`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          
          {/* Step 1: Mês de Referência */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Mês de Referência</h2>
              <p className="text-gray-500 mb-6">
                Selecione o mês a partir do qual você deseja iniciar o controle financeiro.
                Esse será o primeiro mês do seu diagnóstico.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mês</label>
                  <select
                    value={referenceMonth}
                    onChange={(e) => setReferenceMonth(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border rounded-xl text-lg"
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ano</label>
                  <select
                    value={referenceYear}
                    onChange={(e) => setReferenceYear(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border rounded-xl text-lg"
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-800">
                  <strong>Mês selecionado:</strong> {getMonthName(referenceMonth)} de {referenceYear}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  As receitas e despesas fixas que você cadastrar serão consideradas a partir deste mês.
                  As dívidas parceladas serão calculadas a partir daqui.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Receitas */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Suas Receitas</h2>
              <p className="text-gray-500 mb-6">
                Cadastre suas receitas de {getMonthName(referenceMonth)}/{referenceYear}. 
                Marque como <strong>Fixa</strong> as que se repetem todo mês, e <strong>Variável</strong> as que mudam.
              </p>

              {/* Lista de Receitas Fixas */}
              {fixedIncomes.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Receitas Fixas (repetem todo mês)</h3>
                  <div className="space-y-2">
                    {fixedIncomes.map((income, index) => {
                      const realIndex = incomes.findIndex(i => i.id === income.id)
                      return (
                        <div key={income.id || index} className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                          <div>
                            <p className="font-medium">{income.name}</p>
                            <p className="text-sm text-gray-500">{income.recurrenceType}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-bold text-green-600">{formatCurrency(parseFloat(income.amount))}</p>
                            <button onClick={() => removeIncome(realIndex)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Lista de Receitas Variáveis */}
              {variableIncomes.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Receitas Variáveis (só este mês)</h3>
                  <div className="space-y-2">
                    {variableIncomes.map((income, index) => {
                      const realIndex = incomes.findIndex(i => i.id === income.id)
                      return (
                        <div key={income.id || index} className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                          <div>
                            <p className="font-medium">{income.name}</p>
                            <p className="text-sm text-gray-500">Variável</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-bold text-yellow-600">{formatCurrency(parseFloat(income.amount))}</p>
                            <button onClick={() => removeIncome(realIndex)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Adicionar Receita</h3>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Descrição (ex: Salário)"
                    value={newIncome.name}
                    onChange={(e) => setNewIncome({ ...newIncome, name: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  />
                  <input
                    type="number"
                    placeholder="Valor"
                    value={newIncome.amount}
                    onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <select
                    value={newIncome.type}
                    onChange={(e) => setNewIncome({ ...newIncome, type: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  >
                    <option value="FIXA">Fixa (repete todo mês)</option>
                    <option value="VARIAVEL">Variável (só este mês)</option>
                  </select>
                  <select
                    value={newIncome.recurrenceType}
                    onChange={(e) => setNewIncome({ ...newIncome, recurrenceType: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  >
                    <option value="MENSAL">Mensal</option>
                    <option value="QUINZENAL">Quinzenal</option>
                    <option value="SEMANAL">Semanal</option>
                  </select>
                </div>
                <button
                  onClick={addIncome}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-gray-600">Total de Receitas:</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
          )}

          {/* Step 3: Despesas */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Suas Despesas</h2>
              <p className="text-gray-500 mb-6">
                Cadastre suas despesas de {getMonthName(referenceMonth)}/{referenceYear}.
                Marque como <strong>Fixa</strong> as que se repetem, e <strong>Variável</strong> as eventuais.
              </p>

              {/* Lista de Despesas Fixas */}
              {fixedExpenses.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Despesas Fixas (repetem todo mês)</h3>
                  <div className="space-y-2">
                    {fixedExpenses.map((expense, index) => {
                      const realIndex = expenses.findIndex(e => e.id === expense.id)
                      return (
                        <div key={expense.id || index} className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                          <div>
                            <p className="font-medium">{expense.name}</p>
                            <p className="text-sm text-gray-500">{expense.categoryName || getCategoryName(expense.categoryId)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-bold text-red-600">{formatCurrency(parseFloat(expense.amount))}</p>
                            <button onClick={() => removeExpense(realIndex)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Lista de Despesas Variáveis */}
              {variableExpenses.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Despesas Variáveis (só este mês)</h3>
                  <div className="space-y-2">
                    {variableExpenses.map((expense, index) => {
                      const realIndex = expenses.findIndex(e => e.id === expense.id)
                      return (
                        <div key={expense.id || index} className="flex items-center justify-between p-4 bg-orange-50 rounded-xl">
                          <div>
                            <p className="font-medium">{expense.name}</p>
                            <p className="text-sm text-gray-500">{expense.categoryName || getCategoryName(expense.categoryId)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-bold text-orange-600">{formatCurrency(parseFloat(expense.amount))}</p>
                            <button onClick={() => removeExpense(realIndex)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Adicionar Despesa</h3>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Descrição (ex: Aluguel)"
                    value={newExpense.name}
                    onChange={(e) => {
                      setNewExpense({ ...newExpense, name: e.target.value })
                      setExpenseClassified(false)
                    }}
                    onBlur={() => {
                      if (newExpense.name && newExpense.amount && !expenseClassified) {
                        classifyExpense()
                      }
                    }}
                    className="px-4 py-3 border rounded-xl"
                  />
                  <input
                    type="number"
                    placeholder="Valor"
                    value={newExpense.amount}
                    onChange={(e) => {
                      setNewExpense({ ...newExpense, amount: e.target.value })
                      setExpenseClassified(false)
                    }}
                    onBlur={() => {
                      if (newExpense.name && newExpense.amount && !expenseClassified) {
                        classifyExpense()
                      }
                    }}
                    className="px-4 py-3 border rounded-xl"
                  />
                </div>
                
                {classifying && (
                  <div className="flex items-center gap-2 text-purple-600 mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Classificando automaticamente...</span>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <select
                    value={newExpense.categoryId}
                    onChange={(e) => setNewExpense({ ...newExpense, categoryId: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  >
                    <option value="">Selecione a categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <select
                    value={newExpense.type}
                    onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  >
                    <option value="FIXA">Fixa (repete todo mês)</option>
                    <option value="VARIAVEL">Variável (só este mês)</option>
                  </select>
                </div>

                {!expenseClassified && newExpense.name && newExpense.amount && (
                  <button
                    onClick={classifyExpense}
                    disabled={classifying}
                    className="mb-4 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    Classificar Automaticamente
                  </button>
                )}

                <button
                  onClick={addExpense}
                  disabled={!newExpense.categoryId}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>

              <div className="mt-6 p-4 bg-red-50 rounded-xl">
                <p className="text-sm text-gray-600">Total de Despesas:</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          )}

          {/* Step 4: Dívidas */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Suas Dívidas</h2>
              <p className="text-gray-500 mb-6">
                Informe suas dívidas atuais (se houver). O sistema irá calcular quando cada uma será quitada.
              </p>

              <div className="space-y-4 mb-6">
                {debts.map((debt, index) => {
                  // Calcular mês de quitação
                  let endInfo = ""
                  if (debt.remainingInstallments) {
                    const parcelas = parseInt(debt.remainingInstallments)
                    const endMonth = ((referenceMonth - 1 + parcelas) % 12) + 1
                    const endYear = referenceYear + Math.floor((referenceMonth - 1 + parcelas) / 12)
                    endInfo = ` • Quita em ${getMonthName(endMonth)}/${endYear}`
                  }
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium">{debt.name}</p>
                        <p className="text-sm text-gray-500">
                          {debt.type} • Parcela: {formatCurrency(parseFloat(debt.monthlyPayment))}
                          {debt.remainingInstallments && ` • ${debt.remainingInstallments}x restantes`}
                          {endInfo}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-orange-600">{formatCurrency(parseFloat(debt.totalBalance))}</p>
                        <button onClick={() => removeDebt(index)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Adicionar Dívida</h3>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Nome (ex: Cartão Nubank)"
                    value={newDebt.name}
                    onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  />
                  <select
                    value={newDebt.type}
                    onChange={(e) => setNewDebt({ ...newDebt, type: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  >
                    <option value="CARTAO">Cartão de Crédito</option>
                    <option value="EMPRESTIMO">Empréstimo</option>
                    <option value="FINANCIAMENTO">Financiamento</option>
                    <option value="CHEQUE_ESPECIAL">Cheque Especial</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Saldo Total"
                    value={newDebt.totalBalance}
                    onChange={(e) => setNewDebt({ ...newDebt, totalBalance: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  />
                  <input
                    type="number"
                    placeholder="Parcela Mensal"
                    value={newDebt.monthlyPayment}
                    onChange={(e) => setNewDebt({ ...newDebt, monthlyPayment: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <input
                    type="number"
                    placeholder="Parcelas Restantes"
                    value={newDebt.remainingInstallments}
                    onChange={(e) => setNewDebt({ ...newDebt, remainingInstallments: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  />
                  <input
                    type="number"
                    placeholder="Juros % ao mês (opcional)"
                    value={newDebt.interestRate}
                    onChange={(e) => setNewDebt({ ...newDebt, interestRate: e.target.value })}
                    className="px-4 py-3 border rounded-xl"
                  />
                </div>
                <button
                  onClick={addDebt}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>

              <div className="mt-6 p-4 bg-orange-50 rounded-xl">
                <p className="text-sm text-gray-600">Total em Dívidas:</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(debts.reduce((sum, d) => sum + parseFloat(d.totalBalance || "0"), 0))}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Parcelas mensais: {formatCurrency(totalDebtPayment)}
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Revisão */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Revisão</h2>
              <p className="text-gray-500 mb-6">
                Confira os dados de {getMonthName(referenceMonth)}/{referenceYear} antes de gerar seu diagnóstico.
              </p>

              <div className="p-4 bg-blue-50 rounded-xl mb-6">
                <p className="text-sm text-blue-800 font-medium">Mês de Referência</p>
                <p className="text-lg font-bold text-blue-600">{getMonthName(referenceMonth)} de {referenceYear}</p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-gray-600">Receitas</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                  <p className="text-xs text-gray-500">{fixedIncomes.length} fixa(s), {variableIncomes.length} variável(is)</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl">
                  <p className="text-sm text-gray-600">Despesas</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                  <p className="text-xs text-gray-500">{fixedExpenses.length} fixa(s), {variableExpenses.length} variável(is)</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl">
                  <p className="text-sm text-gray-600">Dívidas (parcela)</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(totalDebtPayment)}</p>
                  <p className="text-xs text-gray-500">{debts.length} dívida(s)</p>
                </div>
              </div>

              <div className={`p-6 rounded-xl mb-6 ${
                totalIncome - totalExpenses - totalDebtPayment >= 0 ? "bg-blue-50" : "bg-red-50"
              }`}>
                <p className="text-sm text-gray-600">Saldo Mensal Previsto</p>
                <p className={`text-3xl font-bold ${
                  totalIncome - totalExpenses - totalDebtPayment >= 0 ? "text-blue-600" : "text-red-600"
                }`}>
                  {formatCurrency(totalIncome - totalExpenses - totalDebtPayment)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Este é o valor que sobra antes dos gastos do dia a dia.
                </p>
              </div>

              {incomes.length === 0 && (
                <div className="p-4 bg-yellow-50 rounded-xl mb-6">
                  <p className="text-yellow-800">
                    Você precisa adicionar pelo menos uma receita para continuar.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                Próximo <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finalizeDiagnostic}
                disabled={loading || incomes.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Finalizar Diagnóstico
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
