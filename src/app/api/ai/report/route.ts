import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { generateMonthlyReport } from "@/lib/ai"
import { analyzeFinances } from "@/lib/analysis"

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
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const [incomes, expenses, debts, transactions, plan] = await Promise.all([
      prisma.income.findMany({ where: { userId: user.id, isActive: true } }),
      prisma.expense.findMany({ where: { userId: user.id, isActive: true }, include: { category: true } }),
      prisma.debt.findMany({ where: { userId: user.id } }),
      prisma.transaction.findMany({
        where: { userId: user.id, date: { gte: startDate, lte: endDate } },
        include: { category: true },
        orderBy: { date: 'desc' }
      }),
      prisma.plan.findUnique({
        where: { userId: user.id },
        include: { categories: { include: { category: true } } }
      })
    ])

    const analysis = analyzeFinances({ incomes, expenses, debts })

    // Buscar mês anterior para comparação
    const prevStartDate = new Date(year, month - 2, 1)
    const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59)
    const prevSnapshot = await prisma.monthlyClose.findUnique({
      where: { userId_month_year: { userId: user.id, month: month - 1 || 12, year: month === 1 ? year - 1 : year } }
    })

    const monthName = startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    // Calcular gastos por categoria
    const spendingByCategory: Record<string, number> = {}
    transactions.forEach(t => {
      const catName = t.category?.name || 'Outros'
      spendingByCategory[catName] = (spendingByCategory[catName] || 0) + t.amount
    })

    const financialData = {
      ...analysis,
      totalSpent: transactions.reduce((sum, t) => sum + t.amount, 0),
      transactionCount: transactions.length,
      spendingByCategory,
      budgets: plan?.categories.reduce((acc, pc) => {
        acc[pc.category.name] = pc.monthlyBudget
        return acc
      }, {} as Record<string, number>) || {}
    }

    const response = await generateMonthlyReport(
      monthName,
      financialData,
      transactions,
      prevSnapshot?.incomeDetails as any
    )

    return NextResponse.json({
      success: response.success,
      report: response.data,
      month: monthName,
      rawContent: response.content
    })
  } catch (error) {
    console.error("Erro ao gerar relatório:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
