import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { chatWithAI } from "@/lib/ai"
import { analyzeFinances } from "@/lib/analysis"

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

    const { message } = await request.json()

    // Buscar dados financeiros
    const [incomes, expenses, debts, transactions, goals, chatHistory] = await Promise.all([
      prisma.income.findMany({ where: { userId: user.id, isActive: true } }),
      prisma.expense.findMany({ where: { userId: user.id, isActive: true }, include: { category: true } }),
      prisma.debt.findMany({ where: { userId: user.id } }),
      prisma.transaction.findMany({ 
        where: { userId: user.id },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 50
      }),
      prisma.goal.findMany({ where: { userId: user.id, status: 'EM_ANDAMENTO' } }),
      prisma.chatMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ])

    const analysis = analyzeFinances({ incomes, expenses, debts })

    // Chamar IA
    const response = await chatWithAI(message, {
      userName: user.name,
      financialSummary: {
        totalIncome: analysis.totalIncome,
        totalExpenses: analysis.totalExpenses,
        monthlyBalance: analysis.monthlyBalance,
        savingsCapacity: analysis.savingsCapacity,
        riskLevel: analysis.riskLevel,
        debtTotal: analysis.totalDebtBalance
      },
      recentTransactions: transactions,
      goals,
      chatHistory: chatHistory.reverse().map(m => ({ role: m.role, content: m.content }))
    })

    // Salvar mensagens no histórico
    await prisma.chatMessage.createMany({
      data: [
        { userId: user.id, role: 'user', content: message },
        { userId: user.id, role: 'assistant', content: response.content }
      ]
    })

    return NextResponse.json({ 
      message: response.content,
      success: response.success 
    })
  } catch (error) {
    console.error("Erro no chat:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ messages: [] })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) {
      return NextResponse.json({ messages: [] })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      take: 100
    })

    return NextResponse.json({ messages })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
