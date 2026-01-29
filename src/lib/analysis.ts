// Módulo de análise financeira completo
// Inclui: DRE pessoal, fluxo de caixa, indicadores, simulação de dívidas, projeções

import { calculateMonthlyAmount } from './utils'

// ============================================
// TIPOS
// ============================================

interface Income {
  id?: string
  name: string
  amount: number
  recurrenceType: string
}

interface Expense {
  id?: string
  name: string
  amount: number
  type: string
  recurrenceType: string
  category: { id?: string; name: string; type: string }
}

interface Debt {
  id?: string
  name: string
  totalBalance: number
  monthlyPayment: number
  interestRate: number | null
  type: string
  remainingInstallments?: number | null
}

interface FinancialData {
  incomes: Income[]
  expenses: Expense[]
  debts: Debt[]
}

// ============================================
// INDICADORES FINANCEIROS
// ============================================

export interface FinancialIndicators {
  // Liquidez
  liquidezCorrente: number
  liquidezImediata: number
  
  // Endividamento
  endividamentoTotal: number
  comprometimentoRenda: number
  
  // Rentabilidade/Poupança
  margemLiquida: number
  taxaPoupanca: number
  
  // Cobertura
  coberturaDespesas: number
  coberturaEmergencia: number
  
  // Score (0-100)
  scoreGeral: number
}

export interface FinancialAnalysis {
  totalIncome: number
  totalFixedExpenses: number
  totalVariableExpenses: number
  totalExpenses: number
  totalDebtBalance: number
  totalDebtPayment: number
  monthlyBalance: number
  annualBalance: number
  
  indicators: FinancialIndicators
  expenseRatio: number
  debtRatio: number
  savingsCapacity: number
  riskLevel: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  
  currentDistribution: { needs: number; wants: number; savings: number }
  idealDistribution: { needs: number; wants: number; savings: number }
  
  dre: DREPessoal
  cashFlow: CashFlowProjection[]
  debtAnalysis: DebtAnalysis
  
  criticalPoints: string[]
  recommendations: { shortTerm: string[]; mediumTerm: string[]; longTerm: string[] }
  summary: string
}

// ============================================
// DRE PESSOAL
// ============================================

export interface DREPessoal {
  receitaBruta: number
  deducoes: number
  receitaLiquida: number
  despesasOperacionais: { fixas: number; variaveis: number; total: number }
  resultadoOperacional: number
  despesasFinanceiras: { juros: number; amortizacao: number; total: number }
  resultadoAntesIR: number
  impostos: number
  resultadoLiquido: number
  margemOperacional: number
  margemLiquida: number
}

function calculateDRE(data: FinancialData): DREPessoal {
  const receitaBruta = data.incomes.reduce((sum, inc) => 
    sum + calculateMonthlyAmount(inc.amount, inc.recurrenceType), 0)
  
  const deducoes = 0
  const receitaLiquida = receitaBruta - deducoes
  
  const despesasFixas = data.expenses
    .filter(exp => exp.type === 'FIXA')
    .reduce((sum, exp) => sum + calculateMonthlyAmount(exp.amount, exp.recurrenceType), 0)
  
  const despesasVariaveis = data.expenses
    .filter(exp => exp.type === 'VARIAVEL')
    .reduce((sum, exp) => sum + calculateMonthlyAmount(exp.amount, exp.recurrenceType), 0)
  
  const despesasOperacionais = {
    fixas: despesasFixas,
    variaveis: despesasVariaveis,
    total: despesasFixas + despesasVariaveis
  }
  
  const resultadoOperacional = receitaLiquida - despesasOperacionais.total
  
  const jurosEstimados = data.debts.reduce((sum, debt) => {
    if (debt.interestRate && debt.totalBalance > 0) {
      return sum + (debt.totalBalance * (debt.interestRate / 100))
    }
    return sum
  }, 0)
  
  const amortizacao = data.debts.reduce((sum, debt) => {
    const jurosMensal = debt.interestRate ? (debt.totalBalance * (debt.interestRate / 100)) : 0
    return sum + Math.max(0, debt.monthlyPayment - jurosMensal)
  }, 0)
  
  const despesasFinanceiras = {
    juros: jurosEstimados,
    amortizacao: amortizacao,
    total: data.debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0)
  }
  
  const resultadoAntesIR = resultadoOperacional - despesasFinanceiras.total
  const impostos = 0
  const resultadoLiquido = resultadoAntesIR - impostos
  
  return {
    receitaBruta,
    deducoes,
    receitaLiquida,
    despesasOperacionais,
    resultadoOperacional,
    despesasFinanceiras,
    resultadoAntesIR,
    impostos,
    resultadoLiquido,
    margemOperacional: receitaLiquida > 0 ? (resultadoOperacional / receitaLiquida) * 100 : 0,
    margemLiquida: receitaLiquida > 0 ? (resultadoLiquido / receitaLiquida) * 100 : 0
  }
}

// ============================================
// FLUXO DE CAIXA PROJETADO
// ============================================

export interface CashFlowProjection {
  month: number
  year: number
  label: string
  entradas: number
  saidas: number
  saldo: number
  saldoAcumulado: number
}

function projectCashFlow(data: FinancialData, months: number = 12): CashFlowProjection[] {
  const projections: CashFlowProjection[] = []
  
  const monthlyIncome = data.incomes.reduce((sum, inc) => 
    sum + calculateMonthlyAmount(inc.amount, inc.recurrenceType), 0)
  
  const monthlyExpenses = data.expenses.reduce((sum, exp) => 
    sum + calculateMonthlyAmount(exp.amount, exp.recurrenceType), 0)
  
  const monthlyDebtPayment = data.debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0)
  
  const now = new Date()
  let saldoAcumulado = 0
  
  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const entradas = monthlyIncome
    const saidas = monthlyExpenses + monthlyDebtPayment
    const saldo = entradas - saidas
    saldoAcumulado += saldo
    
    projections.push({
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      entradas,
      saidas,
      saldo,
      saldoAcumulado
    })
  }
  
  return projections
}

// ============================================
// ANÁLISE DE DÍVIDAS
// ============================================

export interface DebtPayoffPlan {
  method: 'AVALANCHE' | 'BOLA_DE_NEVE'
  totalInterestPaid: number
  monthsToPayoff: number
  monthlyPayment: number
}

export interface DebtAnalysis {
  totalBalance: number
  totalMonthlyPayment: number
  averageInterestRate: number
  highestInterestDebt: Debt | null
  lowestBalanceDebt: Debt | null
  monthsToPayoffCurrent: number
  totalInterestIfCurrent: number
  avalanchePlan: DebtPayoffPlan | null
  snowballPlan: DebtPayoffPlan | null
  recommendedMethod: 'AVALANCHE' | 'BOLA_DE_NEVE' | null
  potentialSavings: number
}

function analyzeDebts(debts: Debt[], availableExtra: number = 0): DebtAnalysis {
  if (debts.length === 0) {
    return {
      totalBalance: 0,
      totalMonthlyPayment: 0,
      averageInterestRate: 0,
      highestInterestDebt: null,
      lowestBalanceDebt: null,
      monthsToPayoffCurrent: 0,
      totalInterestIfCurrent: 0,
      avalanchePlan: null,
      snowballPlan: null,
      recommendedMethod: null,
      potentialSavings: 0
    }
  }
  
  const totalBalance = debts.reduce((sum, d) => sum + d.totalBalance, 0)
  const totalMonthlyPayment = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)
  
  const debtsWithRate = debts.filter(d => d.interestRate && d.interestRate > 0)
  const averageInterestRate = debtsWithRate.length > 0
    ? debtsWithRate.reduce((sum, d) => sum + (d.interestRate || 0), 0) / debtsWithRate.length
    : 0
  
  const highestInterestDebt = debtsWithRate.length > 0
    ? debtsWithRate.reduce((max, d) => (d.interestRate || 0) > (max.interestRate || 0) ? d : max)
    : null
  
  const lowestBalanceDebt = debts.reduce((min, d) => d.totalBalance < min.totalBalance ? d : min)
  
  // Calcular meses para quitar no ritmo atual
  let monthsToPayoff = 0
  let totalInterest = 0
  const debtsCopy = debts.map(d => ({ ...d, balance: d.totalBalance }))
  
  while (debtsCopy.some(d => d.balance > 0) && monthsToPayoff < 360) {
    monthsToPayoff++
    for (const debt of debtsCopy) {
      if (debt.balance <= 0) continue
      const interest = debt.interestRate ? debt.balance * (debt.interestRate / 100) : 0
      totalInterest += interest
      debt.balance = debt.balance + interest - debt.monthlyPayment
      if (debt.balance < 0) debt.balance = 0
    }
  }
  
  const avalanchePlan = simulatePayoff(debts, availableExtra, 'AVALANCHE')
  const snowballPlan = simulatePayoff(debts, availableExtra, 'BOLA_DE_NEVE')
  
  const recommendedMethod = avalanchePlan && snowballPlan
    ? (avalanchePlan.totalInterestPaid < snowballPlan.totalInterestPaid ? 'AVALANCHE' : 'BOLA_DE_NEVE')
    : null
  
  const potentialSavings = avalanchePlan ? totalInterest - avalanchePlan.totalInterestPaid : 0
  
  return {
    totalBalance,
    totalMonthlyPayment,
    averageInterestRate,
    highestInterestDebt,
    lowestBalanceDebt,
    monthsToPayoffCurrent: monthsToPayoff,
    totalInterestIfCurrent: totalInterest,
    avalanchePlan,
    snowballPlan,
    recommendedMethod,
    potentialSavings
  }
}

function simulatePayoff(debts: Debt[], extraPayment: number, method: 'AVALANCHE' | 'BOLA_DE_NEVE'): DebtPayoffPlan | null {
  if (debts.length === 0) return null
  
  let sortedDebts = [...debts].map(d => ({ 
    ...d, 
    balance: d.totalBalance,
    minPayment: d.monthlyPayment
  }))
  
  if (method === 'AVALANCHE') {
    sortedDebts.sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))
  } else {
    sortedDebts.sort((a, b) => a.balance - b.balance)
  }
  
  const totalMinPayment = sortedDebts.reduce((sum, d) => sum + d.minPayment, 0)
  const monthlyBudget = totalMinPayment + extraPayment
  
  let month = 0
  let totalInterestPaid = 0
  
  while (sortedDebts.some(d => d.balance > 0) && month < 360) {
    month++
    let remaining = monthlyBudget
    
    for (const debt of sortedDebts) {
      if (debt.balance <= 0) continue
      
      const interest = debt.interestRate ? debt.balance * (debt.interestRate / 100) : 0
      totalInterestPaid += interest
      debt.balance += interest
      
      const payment = Math.min(debt.minPayment, debt.balance)
      debt.balance -= payment
      remaining -= payment
    }
    
    for (const debt of sortedDebts) {
      if (debt.balance <= 0 || remaining <= 0) continue
      const extraPay = Math.min(remaining, debt.balance)
      debt.balance -= extraPay
      remaining -= extraPay
      break
    }
  }
  
  return { method, totalInterestPaid, monthsToPayoff: month, monthlyPayment: monthlyBudget }
}

// ============================================
// INDICADORES
// ============================================

function calculateIndicators(data: FinancialData, dre: DREPessoal): FinancialIndicators {
  const receitaMensal = dre.receitaLiquida
  const despesasMensais = dre.despesasOperacionais.total + dre.despesasFinanceiras.total
  const saldoMensal = dre.resultadoLiquido
  
  const liquidezCorrente = despesasMensais > 0 ? receitaMensal / despesasMensais : 0
  const liquidezImediata = dre.despesasOperacionais.variaveis > 0
    ? (receitaMensal - dre.despesasOperacionais.fixas) / dre.despesasOperacionais.variaveis
    : 0
  
  const totalDebt = data.debts.reduce((sum, d) => sum + d.totalBalance, 0)
  const endividamentoTotal = receitaMensal > 0 ? totalDebt / (receitaMensal * 12) : 0
  const comprometimentoRenda = receitaMensal > 0 
    ? (dre.despesasFinanceiras.total / receitaMensal) * 100 
    : 0
  
  const margemLiquida = receitaMensal > 0 ? (saldoMensal / receitaMensal) * 100 : 0
  const taxaPoupanca = margemLiquida > 0 ? margemLiquida : 0
  
  const coberturaDespesas = saldoMensal > 0 && despesasMensais > 0 ? saldoMensal / despesasMensais * 30 : 0
  const coberturaEmergencia = 6
  
  // Score
  let score = 50
  if (liquidezCorrente >= 1.5) score += 15
  else if (liquidezCorrente >= 1.2) score += 10
  else if (liquidezCorrente >= 1.0) score += 5
  else if (liquidezCorrente >= 0.8) score -= 5
  else score -= 15
  
  if (comprometimentoRenda <= 15) score += 15
  else if (comprometimentoRenda <= 25) score += 10
  else if (comprometimentoRenda <= 35) score += 0
  else if (comprometimentoRenda <= 50) score -= 10
  else score -= 15
  
  if (taxaPoupanca >= 30) score += 20
  else if (taxaPoupanca >= 20) score += 15
  else if (taxaPoupanca >= 10) score += 5
  else if (taxaPoupanca >= 0) score -= 5
  else score -= 20
  
  score = Math.max(0, Math.min(100, score))
  
  return {
    liquidezCorrente,
    liquidezImediata,
    endividamentoTotal,
    comprometimentoRenda,
    margemLiquida,
    taxaPoupanca,
    coberturaDespesas,
    coberturaEmergencia,
    scoreGeral: score
  }
}

// ============================================
// ANÁLISE PRINCIPAL
// ============================================

export function analyzeFinances(data: FinancialData): FinancialAnalysis {
  const dre = calculateDRE(data)
  const indicators = calculateIndicators(data, dre)
  
  const totalIncome = dre.receitaLiquida
  const totalFixedExpenses = dre.despesasOperacionais.fixas
  const totalVariableExpenses = dre.despesasOperacionais.variaveis
  const totalExpenses = dre.despesasOperacionais.total
  const totalDebtBalance = data.debts.reduce((sum, d) => sum + d.totalBalance, 0)
  const totalDebtPayment = dre.despesasFinanceiras.total
  const monthlyBalance = dre.resultadoLiquido
  const annualBalance = monthlyBalance * 12
  
  const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
  const debtRatio = totalIncome > 0 ? (totalDebtPayment / totalIncome) * 100 : 0
  const savingsCapacity = indicators.taxaPoupanca
  
  const needsExpenses = data.expenses
    .filter(exp => exp.category?.type === 'NECESSIDADE')
    .reduce((sum, exp) => sum + calculateMonthlyAmount(exp.amount, exp.recurrenceType), 0)
  
  const wantsExpenses = data.expenses
    .filter(exp => exp.category?.type === 'DESEJO')
    .reduce((sum, exp) => sum + calculateMonthlyAmount(exp.amount, exp.recurrenceType), 0)
  
  const currentDistribution = {
    needs: totalIncome > 0 ? (needsExpenses / totalIncome) * 100 : 0,
    wants: totalIncome > 0 ? (wantsExpenses / totalIncome) * 100 : 0,
    savings: savingsCapacity > 0 ? savingsCapacity : 0
  }
  
  let riskLevel: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  if (indicators.scoreGeral >= 70) riskLevel = 'BAIXO'
  else if (indicators.scoreGeral >= 50) riskLevel = 'MEDIO'
  else if (indicators.scoreGeral >= 30) riskLevel = 'ALTO'
  else riskLevel = 'CRITICO'
  
  const cashFlow = projectCashFlow(data, 12)
  const extraForDebt = monthlyBalance > 0 ? monthlyBalance * 0.5 : 0
  const debtAnalysis = analyzeDebts(data.debts, extraForDebt)
  
  const criticalPoints = generateCriticalPoints(data, dre, indicators, debtAnalysis)
  const recommendations = generateRecommendations(data, dre, indicators, debtAnalysis)
  const summary = generateSummary(indicators, riskLevel, monthlyBalance)
  
  return {
    totalIncome,
    totalFixedExpenses,
    totalVariableExpenses,
    totalExpenses,
    totalDebtBalance,
    totalDebtPayment,
    monthlyBalance,
    annualBalance,
    indicators,
    expenseRatio,
    debtRatio,
    savingsCapacity,
    riskLevel,
    currentDistribution,
    idealDistribution: { needs: 50, wants: 30, savings: 20 },
    dre,
    cashFlow,
    debtAnalysis,
    criticalPoints,
    recommendations,
    summary
  }
}

// ============================================
// PONTOS CRÍTICOS
// ============================================

function generateCriticalPoints(
  data: FinancialData,
  dre: DREPessoal,
  indicators: FinancialIndicators,
  debtAnalysis: DebtAnalysis
): string[] {
  const points: string[] = []
  
  if (dre.resultadoLiquido < 0) {
    points.push(`URGENTE: Déficit mensal de R$ ${Math.abs(dre.resultadoLiquido).toFixed(2)}. Gastos excedem receita.`)
  }
  
  if (indicators.liquidezCorrente < 1) {
    points.push(`Liquidez crítica (${indicators.liquidezCorrente.toFixed(2)}). Receita não cobre despesas.`)
  }
  
  if (indicators.comprometimentoRenda > 30) {
    points.push(`Comprometimento com dívidas alto: ${indicators.comprometimentoRenda.toFixed(1)}% da renda (limite: 30%).`)
  }
  
  if (debtAnalysis.highestInterestDebt && (debtAnalysis.highestInterestDebt.interestRate || 0) > 5) {
    points.push(`Dívida "${debtAnalysis.highestInterestDebt.name}" com juros de ${debtAnalysis.highestInterestDebt.interestRate}% ao mês deve ser prioridade.`)
  }
  
  if (indicators.taxaPoupanca < 10 && dre.resultadoLiquido >= 0) {
    points.push(`Taxa de poupança muito baixa: ${indicators.taxaPoupanca.toFixed(1)}% (ideal: mínimo 20%).`)
  }
  
  if (dre.despesasOperacionais.fixas > dre.receitaLiquida * 0.5) {
    const percent = (dre.despesasOperacionais.fixas / dre.receitaLiquida * 100).toFixed(1)
    points.push(`Despesas fixas comprometem ${percent}% da renda (ideal: máximo 50%).`)
  }
  
  if (indicators.scoreGeral < 40) {
    points.push(`Score de saúde financeira crítico: ${indicators.scoreGeral}/100.`)
  }
  
  if (debtAnalysis.monthsToPayoffCurrent > 60) {
    points.push(`No ritmo atual, levará ${Math.ceil(debtAnalysis.monthsToPayoffCurrent / 12)} anos para quitar dívidas.`)
  }
  
  return points
}

// ============================================
// RECOMENDAÇÕES
// ============================================

function generateRecommendations(
  data: FinancialData,
  dre: DREPessoal,
  indicators: FinancialIndicators,
  debtAnalysis: DebtAnalysis
): { shortTerm: string[]; mediumTerm: string[]; longTerm: string[] } {
  const shortTerm: string[] = []
  const mediumTerm: string[] = []
  const longTerm: string[] = []
  
  if (dre.resultadoLiquido < 0) {
    shortTerm.push('URGENTE: Corte despesas variáveis imediatamente até equilibrar o orçamento.')
    shortTerm.push('Liste todos os gastos e elimine tudo que não for essencial.')
  }
  
  shortTerm.push('Registre todos os gastos diariamente para identificar vazamentos.')
  
  if (debtAnalysis.highestInterestDebt) {
    shortTerm.push(`Priorize pagamento extra na dívida "${debtAnalysis.highestInterestDebt.name}" (maior juros).`)
  }
  
  if (data.expenses.filter(e => e.type === 'VARIAVEL').length > 5) {
    shortTerm.push('Estabeleça limites semanais para cada categoria de gasto variável.')
  }
  
  if (indicators.taxaPoupanca < 20) {
    mediumTerm.push('Meta: aumentar taxa de poupança para pelo menos 20% da renda.')
  }
  
  if (debtAnalysis.totalBalance > 0) {
    const method = debtAnalysis.recommendedMethod === 'AVALANCHE' 
      ? 'método avalanche (priorizar maior juros)'
      : 'método bola de neve (priorizar menor saldo)'
    mediumTerm.push(`Adote o ${method} para quitar dívidas mais rápido.`)
    
    if (debtAnalysis.potentialSavings > 0) {
      mediumTerm.push(`Potencial economia de R$ ${debtAnalysis.potentialSavings.toFixed(2)} em juros com estratégia otimizada.`)
    }
  }
  
  mediumTerm.push('Monte reserva de emergência equivalente a 3 meses de despesas essenciais.')
  mediumTerm.push('Automatize transferências para poupança no dia do pagamento.')
  
  if (indicators.comprometimentoRenda > 20) {
    mediumTerm.push('Renegocie dívidas para reduzir juros ou consolidar em parcela menor.')
  }
  
  longTerm.push('Expanda reserva de emergência para 6 meses de despesas.')
  
  if (debtAnalysis.totalBalance > 0) {
    longTerm.push('Trabalhe para quitar 100% das dívidas e nunca mais pagar juros.')
  }
  
  longTerm.push('Após reserva completa, inicie investimentos (mínimo 10% da renda).')
  longTerm.push('Diversifique: renda fixa para segurança, renda variável para crescimento.')
  longTerm.push('Defina metas financeiras claras com prazos: viagem, imóvel, aposentadoria.')
  longTerm.push('Revise planejamento a cada 6 meses e ajuste conforme mudanças de vida.')
  
  return { shortTerm, mediumTerm, longTerm }
}

// ============================================
// RESUMO
// ============================================

function generateSummary(
  indicators: FinancialIndicators,
  riskLevel: string,
  monthlyBalance: number
): string {
  const score = indicators.scoreGeral
  
  if (riskLevel === 'CRITICO') {
    return `Situação financeira crítica (Score: ${score}/100). ` +
      `${monthlyBalance < 0 ? `Déficit de R$ ${Math.abs(monthlyBalance).toFixed(2)}/mês. ` : ''}` +
      `Ação imediata necessária para evitar endividamento crescente.`
  }
  
  if (riskLevel === 'ALTO') {
    return `Situação financeira em risco (Score: ${score}/100). ` +
      `Saldo de R$ ${monthlyBalance.toFixed(2)}/mês é insuficiente. ` +
      `Priorize reduzir despesas e acelerar quitação de dívidas.`
  }
  
  if (riskLevel === 'MEDIO') {
    return `Situação financeira razoável (Score: ${score}/100). ` +
      `Saldo mensal de R$ ${monthlyBalance.toFixed(2)} permite alguma margem. ` +
      `Continue controlando gastos e aumente investimentos gradualmente.`
  }
  
  return `Parabéns! Situação financeira saudável (Score: ${score}/100). ` +
    `Saldo de R$ ${monthlyBalance.toFixed(2)}/mês e taxa de poupança de ${indicators.taxaPoupanca.toFixed(1)}%.`
}

// ============================================
// PLANO 50/30/20
// ============================================

export function generatePlan(totalIncome: number, expenses: Expense[]) {
  const needsBudget = totalIncome * 0.5
  const wantsBudget = totalIncome * 0.3
  const savingsBudget = totalIncome * 0.2
  
  const categoryTotals = new Map<string, { name: string; type: string; total: number }>()
  
  for (const exp of expenses) {
    const catName = exp.category?.name || 'Outros'
    const catType = exp.category?.type || 'NECESSIDADE'
    const existing = categoryTotals.get(catName)
    const amount = calculateMonthlyAmount(exp.amount, exp.recurrenceType)
    
    if (existing) {
      existing.total += amount
    } else {
      categoryTotals.set(catName, { name: catName, type: catType, total: amount })
    }
  }
  
  return {
    totalIncome,
    distribution: {
      needs: { percent: 50, amount: needsBudget },
      wants: { percent: 30, amount: wantsBudget },
      savings: { percent: 20, amount: savingsBudget }
    },
    categoryTotals: Array.from(categoryTotals.values())
  }
}
