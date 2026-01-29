import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { analyzeFinances, generatePlan } from "@/lib/analysis"

export async function GET() {
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

    // Buscar dados do usuário
    const [incomes, expenses, debts] = await Promise.all([
      prisma.income.findMany({ where: { userId: user.id, isActive: true } }),
      prisma.expense.findMany({ 
        where: { userId: user.id, isActive: true },
        include: { category: true }
      }),
      prisma.debt.findMany({ where: { userId: user.id } })
    ])

    // Gerar análise
    const analysis = analyzeFinances({ incomes, expenses, debts })
    
    // Gerar sugestão de plano
    const suggestedPlan = generatePlan(analysis.totalIncome, expenses)

    return NextResponse.json({ 
      analysis,
      suggestedPlan,
      data: { incomes, expenses, debts }
    })
  } catch (error) {
    console.error("Erro ao gerar diagnóstico:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

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

    // Marcar diagnóstico como completo
    await prisma.user.update({
      where: { id: user.id },
      data: { diagnosticoCompleto: true }
    })

    // Buscar dados atualizados
    const [incomes, expenses, debts] = await Promise.all([
      prisma.income.findMany({ where: { userId: user.id, isActive: true } }),
      prisma.expense.findMany({ 
        where: { userId: user.id, isActive: true },
        include: { category: true }
      }),
      prisma.debt.findMany({ where: { userId: user.id } })
    ])

    // Gerar análise
    const analysis = analyzeFinances({ incomes, expenses, debts })

    // Criar plano inicial 50/30/20
    const plan = await prisma.plan.upsert({
      where: { userId: user.id },
      update: {
        totalIncome: analysis.totalIncome,
        needsPercent: 50,
        wantsPercent: 30,
        savingsPercent: 20
      },
      create: {
        userId: user.id,
        totalIncome: analysis.totalIncome,
        needsPercent: 50,
        wantsPercent: 30,
        savingsPercent: 20
      }
    })

    // Criar orçamentos por categoria
    const categories = await prisma.category.findMany({
      where: { isGlobal: true }
    })

    for (const cat of categories) {
      const categoryExpenses = expenses.filter(e => e.categoryId === cat.id)
      const totalForCategory = categoryExpenses.reduce((sum, e) => sum + e.amount, 0)
      
      if (totalForCategory > 0) {
        await prisma.planCategory.upsert({
          where: {
            planId_categoryId: {
              planId: plan.id,
              categoryId: cat.id
            }
          },
          update: {
            monthlyBudget: totalForCategory,
            weeklyBudget: totalForCategory / 4,
            dailyBudget: totalForCategory / 30
          },
          create: {
            planId: plan.id,
            categoryId: cat.id,
            monthlyBudget: totalForCategory,
            weeklyBudget: totalForCategory / 4,
            dailyBudget: totalForCategory / 30
          }
        })
      }
    }

    // Salvar snapshot do relatório
    const now = new Date()
    await prisma.monthlyClose.upsert({
      where: {
        userId_month_year: {
          userId: user.id,
          month: now.getMonth() + 1,
          year: now.getFullYear()
        }
      },
      update: {
        totalIncome: analysis.totalIncome,
        totalExpenses: analysis.totalExpenses,
        totalDebts: analysis.totalDebtBalance,
        totalTransactions: 0,
        balance: analysis.monthlyBalance,
        incomeDetails: analysis as any
      },
      create: {
        userId: user.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalIncome: analysis.totalIncome,
        totalExpenses: analysis.totalExpenses,
        totalDebts: analysis.totalDebtBalance,
        totalTransactions: 0,
        balance: analysis.monthlyBalance,
        incomeDetails: analysis as any
      }
    })

    return NextResponse.json({ 
      success: true, 
      analysis,
      message: "Diagnóstico concluído com sucesso!"
    })
  } catch (error) {
    console.error("Erro ao finalizar diagnóstico:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
