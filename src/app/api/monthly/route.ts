import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"

// GET - Buscar mês atual e histórico
export async function GET(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Buscar histórico de fechamentos
    if (action === 'history') {
      const history = await prisma.monthlyClose.findMany({
        where: { userId: user.id },
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
      })
      return NextResponse.json({ history })
    }

    // Buscar dados de um mês específico do histórico
    if (action === 'month') {
      const month = parseInt(searchParams.get('month') || '')
      const year = parseInt(searchParams.get('year') || '')
      
      if (!month || !year) {
        return NextResponse.json({ error: "Mês e ano obrigatórios" }, { status: 400 })
      }

      const monthlyClose = await prisma.monthlyClose.findUnique({
        where: { userId_month_year: { userId: user.id, month, year } }
      })

      // Buscar transações daquele mês (para histórico detalhado)
      const transactions = await prisma.transaction.findMany({
        where: { userId: user.id, month, year },
        include: { category: true },
        orderBy: { date: 'desc' }
      })

      return NextResponse.json({ monthlyClose, transactions })
    }

    // Retornar mês atual do usuário (SEM verificação automática de virada de mês)
    const now = new Date()
    const currentMonth = user.currentMonth || now.getMonth() + 1
    const currentYear = user.currentYear || now.getFullYear()

    return NextResponse.json({ 
      currentMonth, 
      currentYear,
      closingDay: user.closingDay,
      diagnosticoCompleto: user.diagnosticoCompleto
    })
  } catch (error) {
    console.error("Erro ao buscar mês:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Fechar mês ou iniciar novo
export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const { action, month, year, closingDay } = body

    // Atualizar dia de fechamento do cartão
    if (action === 'setClosingDay') {
      if (!closingDay || closingDay < 1 || closingDay > 31) {
        return NextResponse.json({ error: "Dia de fechamento inválido (1-31)" }, { status: 400 })
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { closingDay }
      })

      return NextResponse.json({ success: true, closingDay })
    }

    // Fechar mês atual e iniciar novo
    if (action === 'close') {
      const closeMonth = month || user.currentMonth
      const closeYear = year || user.currentYear

      if (!closeMonth || !closeYear) {
        return NextResponse.json({ error: "Mês não definido" }, { status: 400 })
      }

      // Buscar dados do mês
      const [incomes, expenses, debts, transactions] = await Promise.all([
        prisma.income.findMany({
          where: {
            userId: user.id,
            isActive: true,
            OR: [
              { startMonth: null },
              { startYear: { lte: closeYear }, startMonth: { lte: closeMonth } }
            ]
          }
        }),
        prisma.expense.findMany({
          where: {
            userId: user.id,
            isActive: true,
            OR: [
              { startMonth: null },
              { startYear: { lte: closeYear }, startMonth: { lte: closeMonth } }
            ]
          },
          include: { category: true }
        }),
        prisma.debt.findMany({
          where: {
            userId: user.id,
            status: { not: 'QUITADO' }
          }
        }),
        prisma.transaction.findMany({
          where: {
            userId: user.id,
            month: closeMonth,
            year: closeYear
          },
          include: { category: true }
        })
      ])

      // Calcular totais
      const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
      const totalDebts = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)
      const totalTransactions = transactions.reduce((sum, t) => sum + t.amount, 0)
      const balance = totalIncome - totalExpenses - totalDebts - totalTransactions
      const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0

      // Criar resumo por categoria
      const transactionsByCategory: Record<string, { name: string, total: number, count: number }> = {}
      transactions.forEach(t => {
        if (!transactionsByCategory[t.categoryId]) {
          transactionsByCategory[t.categoryId] = { name: t.category.name, total: 0, count: 0 }
        }
        transactionsByCategory[t.categoryId].total += t.amount
        transactionsByCategory[t.categoryId].count += 1
      })

      // Criar ou atualizar fechamento
      const monthlyClose = await prisma.monthlyClose.upsert({
        where: { userId_month_year: { userId: user.id, month: closeMonth, year: closeYear } },
        update: {
          totalIncome,
          totalExpenses,
          totalDebts,
          totalTransactions,
          balance,
          savingsRate,
          status: 'FECHADO',
          incomeDetails: incomes,
          expenseDetails: expenses,
          debtDetails: debts,
          transactionDetails: transactionsByCategory,
          closedAt: new Date()
        },
        create: {
          userId: user.id,
          month: closeMonth,
          year: closeYear,
          totalIncome,
          totalExpenses,
          totalDebts,
          totalTransactions,
          balance,
          savingsRate,
          status: 'FECHADO',
          incomeDetails: incomes,
          expenseDetails: expenses,
          debtDetails: debts,
          transactionDetails: transactionsByCategory
        }
      })

      // Atualizar parcelas das dívidas
      for (const debt of debts) {
        if (debt.remainingInstallments && debt.remainingInstallments > 0) {
          const newRemaining = debt.remainingInstallments - 1
          await prisma.debt.update({
            where: { id: debt.id },
            data: {
              remainingInstallments: newRemaining,
              status: newRemaining === 0 ? 'QUITADO' : debt.status
            }
          })
        }
      }

      return NextResponse.json({ success: true, monthlyClose })
    }

    // Iniciar novo mês (após fechar o anterior)
    if (action === 'new') {
      const newMonth = month
      const newYear = year

      if (!newMonth || !newYear) {
        return NextResponse.json({ error: "Mês e ano obrigatórios" }, { status: 400 })
      }

      // Atualizar mês atual do usuário
      await prisma.user.update({
        where: { id: user.id },
        data: { currentMonth: newMonth, currentYear: newYear }
      })

      return NextResponse.json({ success: true, currentMonth: newMonth, currentYear: newYear })
    }

    // Iniciar primeiro mês (diagnóstico)
    if (action === 'start') {
      const startMonth = month
      const startYear = year

      if (!startMonth || !startYear) {
        return NextResponse.json({ error: "Mês e ano obrigatórios" }, { status: 400 })
      }

      // Atualizar mês atual e marcar diagnóstico completo
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          currentMonth: startMonth, 
          currentYear: startYear,
          diagnosticoCompleto: true
        }
      })

      // Atualizar receitas, despesas e dívidas com mês de início
      await Promise.all([
        prisma.income.updateMany({
          where: { userId: user.id, startMonth: null },
          data: { startMonth, startYear }
        }),
        prisma.expense.updateMany({
          where: { userId: user.id, startMonth: null },
          data: { startMonth, startYear }
        }),
        prisma.debt.updateMany({
          where: { userId: user.id, startMonth: null },
          data: { startMonth, startYear }
        })
      ])

      return NextResponse.json({ success: true, currentMonth: startMonth, currentYear: startYear })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    console.error("Erro na operação mensal:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
