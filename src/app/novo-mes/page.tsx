"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  Calendar,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  Wallet,
  Receipt,
  Sparkles,
  Loader2,
  Lock,
  AlertCircle
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

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
}

interface Expense {
  id?: string
  name: string
  amount: string
  categoryId: string
  categoryName?: string
  type: string
}

export default function NovoMesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: fechar mês, 2: receitas variáveis, 3: despesas variáveis, 4: revisão
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  
  const [currentMonth, setCurrentMonth] = useState(0)
  const [currentYear, setCurrentYear] = useState(0)
  const [newMonth, setNewMonth] = useState(0)
  const [newYear, setNewYear] = useState(0)
  
  // Dados fixos que continuam
  const [fixedIncomes, setFixedIncomes] = useState<any[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<any[]>([])
  const [debts, setDebts] = useState<any[]>([])
  
  // Novas receitas/despesas variáveis
  const [variableIncomes, setVariableIncomes] = useState<Income[]>([])
  const [variableExpenses, setVariableExpenses] = useState<Expense[]>([])
  
  const [newIncome, setNewIncome] = useState<Income>({ name: "", amount: "", type: "VARIAVEL" })
  const [newExpense, setNewExpense] = useState<Expense>({ name: "", amount: "", categoryId: "", type: "VARIAVEL" })
  const [classifying, setClassifying] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function loadData() {
      try {
        const [monthRes, catRes, incRes, expRes, debtRes] = await Promise.all([
          fetch("/api/monthly"),
          fetch("/api/categories"),
          fetch("/api/incomes"),
          fetch("/api/expenses"),
          fetch("/api/debts")
        ])

        const monthData = await monthRes.json()
        const catData = await catRes.json()
        const incData = await incRes.json()
        const expData = await expRes.json()
        const debtData = await debtRes.json()

        setCurrentMonth(monthData.currentMonth || new Date().getMonth() + 1)
        setCurrentYear(monthData.currentYear || new Date().getFullYear())
        
        // Calcular próximo mês
        let nextMonth = (monthData.currentMonth || new Date().getMonth() + 1) + 1
        let nextYear = monthData.currentYear || new Date().getFullYear()
        if (nextMonth > 12) {
          nextMonth = 1
          nextYear++
        }
        setNewMonth(nextMonth)
        setNewYear(nextYear)

        setCategories(catData.categories || [])
        
        // Separar fixos de variáveis
        const allIncomes = incData.incomes || []
        const allExpenses = expData.expenses || []
        
        setFixedIncomes(allIncomes.filter((i: any) => i.type === 'FIXA'))
        setFixedExpenses(allExpenses.filter((e: any) => e.type === 'FIXA'))
        setDebts(debtData.debts?.filter((d: any) => d.status !== 'QUITADO') || [])
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      }
      setLoading(false)
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
          categoryName: data.categoryName
        })
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
          type: "VARIAVEL",
          startMonth: newMonth,
          startYear: newYear,
          endMonth: newMonth,
          endYear: newYear
        })
      })
      const data = await res.json()
      
      if (data.income) {
        setVariableIncomes([...variableIncomes, { id: data.income.id, ...newIncome }])
        setNewIncome({ name: "", amount: "", type: "VARIAVEL" })
      }
    } catch (error) {
      console.error("Erro ao adicionar receita:", error)
    }
  }

  const removeIncome = async (index: number) => {
    const income = variableIncomes[index]
    if (income.id) {
      await fetch(`/api/incomes?id=${income.id}`, { method: "DELETE" })
    }
    setVariableIncomes(variableIncomes.filter((_, i) => i !== index))
  }

  const addExpense = async () => {
    if (!newExpense.name || !newExpense.amount || !newExpense.categoryId) return

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newExpense,
          type: "VARIAVEL",
          startMonth: newMonth,
          startYear: newYear,
          endMonth: newMonth,
          endYear: newYear
        })
      })
      const data = await res.json()
      
      if (data.expense) {
        setVariableExpenses([...variableExpenses, { id: data.expense.id, ...newExpense }])
        setNewExpense({ name: "", amount: "", categoryId: "", type: "VARIAVEL" })
      }
    } catch (error) {
      console.error("Erro ao adicionar despesa:", error)
    }
  }

  const removeExpense = async (index: number) => {
    const expense = variableExpenses[index]
    if (expense.id) {
      await fetch(`/api/expenses?id=${expense.id}`, { method: "DELETE" })
    }
    setVariableExpenses(variableExpenses.filter((_, i) => i !== index))
  }

  const closeMonthAndStart = async () => {
    setProcessing(true)
    try {
      // Fechar mês anterior
      await fetch("/api/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "close",
          month: currentMonth,
          year: currentYear
        })
      })

      // Iniciar novo mês
      await fetch("/api/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "new",
          month: newMonth,
          year: newYear
        })
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Erro ao processar mês:", error)
    }
    setProcessing(false)
  }

  const getMonthName = (month: number) => {
    return months.find(m => m.value === month)?.label || ""
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || ""
  }

  const totalFixedIncome = fixedIncomes.reduce((sum, i) => sum + i.amount, 0)
  const totalVariableIncome = variableIncomes.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0)
  const totalFixedExpense = fixedExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalVariableExpense = variableExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0)
  const totalDebtPayment = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Iniciar Novo Mês</h1>
          <p className="text-gray-500">
            Fechar {getMonthName(currentMonth)}/{currentYear} e iniciar {getMonthName(newMonth)}/{newYear}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          
          {/* Step 1: Fechamento */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Fechar {getMonthName(currentMonth)}/{currentYear}</h2>
                  <p className="text-sm text-gray-500">Este mês será arquivado no histórico</p>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-xl mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800">
                      Ao fechar o mês, todos os dados serão consolidados em um relatório.
                      As parcelas das dívidas serão decrementadas automaticamente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Receitas Fixas</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(totalFixedIncome)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Despesas Fixas</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(totalFixedExpense)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Parcelas de Dívidas</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(totalDebtPayment)}</p>
                  <p className="text-xs text-gray-500 mt-1">{debts.length} dívida(s) ativa(s)</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Receitas Variáveis */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Receitas de {getMonthName(newMonth)}</h2>
                  <p className="text-sm text-gray-500">Adicione receitas extras deste mês (se houver)</p>
                </div>
              </div>

              {/* Receitas fixas que continuam */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Receitas Fixas (continuam automaticamente)</h3>
                <div className="space-y-2">
                  {fixedIncomes.map((income, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-xl opacity-75">
                      <p className="font-medium text-gray-700">{income.name}</p>
                      <p className="font-bold text-green-600">{formatCurrency(income.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receitas variáveis novas */}
              {variableIncomes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Receitas Variáveis (só este mês)</h3>
                  <div className="space-y-2">
                    {variableIncomes.map((income, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                        <p className="font-medium">{income.name}</p>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-yellow-600">{formatCurrency(parseFloat(income.amount))}</p>
                          <button onClick={() => removeIncome(index)} className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Adicionar Receita Extra</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Descrição (ex: Bônus)"
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
                <button
                  onClick={addIncome}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-gray-600">Total de Receitas do Mês</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalFixedIncome + totalVariableIncome)}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Despesas Variáveis */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Despesas de {getMonthName(newMonth)}</h2>
                  <p className="text-sm text-gray-500">Adicione despesas extras deste mês (se houver)</p>
                </div>
              </div>

              {/* Despesas fixas que continuam */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Despesas Fixas (continuam automaticamente)</h3>
                <div className="space-y-2">
                  {fixedExpenses.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-xl opacity-75">
                      <div>
                        <p className="font-medium text-gray-700">{expense.name}</p>
                        <p className="text-xs text-gray-500">{expense.category?.name}</p>
                      </div>
                      <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Despesas variáveis novas */}
              {variableExpenses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Despesas Variáveis (só este mês)</h3>
                  <div className="space-y-2">
                    {variableExpenses.map((expense, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                        <div>
                          <p className="font-medium">{expense.name}</p>
                          <p className="text-xs text-gray-500">{expense.categoryName || getCategoryName(expense.categoryId)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-orange-600">{formatCurrency(parseFloat(expense.amount))}</p>
                          <button onClick={() => removeExpense(index)} className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Adicionar Despesa Extra</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Descrição (ex: IPVA)"
                    value={newExpense.name}
                    onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                    onBlur={() => {
                      if (newExpense.name && newExpense.amount && !newExpense.categoryId) {
                        classifyExpense()
                      }
                    }}
                    className="px-4 py-3 border rounded-xl"
                  />
                  <input
                    type="number"
                    placeholder="Valor"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    onBlur={() => {
                      if (newExpense.name && newExpense.amount && !newExpense.categoryId) {
                        classifyExpense()
                      }
                    }}
                    className="px-4 py-3 border rounded-xl"
                  />
                </div>
                
                {classifying && (
                  <div className="flex items-center gap-2 text-purple-600 mb-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Classificando...</span>
                  </div>
                )}

                <select
                  value={newExpense.categoryId}
                  onChange={(e) => setNewExpense({ ...newExpense, categoryId: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl mb-3"
                >
                  <option value="">Selecione a categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                <button
                  onClick={addExpense}
                  disabled={!newExpense.categoryId}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>

              <div className="mt-6 p-4 bg-red-50 rounded-xl">
                <p className="text-sm text-gray-600">Total de Despesas do Mês</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalFixedExpense + totalVariableExpense)}
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Revisão */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Revisão - {getMonthName(newMonth)}/{newYear}</h2>
                  <p className="text-sm text-gray-500">Confira os dados antes de iniciar o mês</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-gray-600">Receitas</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(totalFixedIncome + totalVariableIncome)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {fixedIncomes.length} fixa(s) + {variableIncomes.length} variável(is)
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl">
                  <p className="text-sm text-gray-600">Despesas</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(totalFixedExpense + totalVariableExpense)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {fixedExpenses.length} fixa(s) + {variableExpenses.length} variável(is)
                  </p>
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-xl mb-6">
                <p className="text-sm text-gray-600">Parcelas de Dívidas</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(totalDebtPayment)}</p>
                <p className="text-xs text-gray-500">{debts.length} dívida(s) ativa(s)</p>
              </div>

              <div className={`p-6 rounded-xl ${
                (totalFixedIncome + totalVariableIncome - totalFixedExpense - totalVariableExpense - totalDebtPayment) >= 0 
                  ? "bg-blue-50" 
                  : "bg-red-50"
              }`}>
                <p className="text-sm text-gray-600">Saldo Previsto</p>
                <p className={`text-3xl font-bold ${
                  (totalFixedIncome + totalVariableIncome - totalFixedExpense - totalVariableExpense - totalDebtPayment) >= 0 
                    ? "text-blue-600" 
                    : "text-red-600"
                }`}>
                  {formatCurrency(totalFixedIncome + totalVariableIncome - totalFixedExpense - totalVariableExpense - totalDebtPayment)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Antes dos gastos do dia a dia
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Voltar
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                Próximo <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={closeMonthAndStart}
                disabled={processing}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Iniciar {getMonthName(newMonth)}
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
