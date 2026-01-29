import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { analyzeInvestments } from "@/lib/ai"
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

    const { amount, riskProfile } = await request.json()

    const [incomes, expenses, debts, goals] = await Promise.all([
      prisma.income.findMany({ where: { userId: user.id, isActive: true } }),
      prisma.expense.findMany({ where: { userId: user.id, isActive: true }, include: { category: true } }),
      prisma.debt.findMany({ where: { userId: user.id } }),
      prisma.goal.findMany({ where: { userId: user.id, status: 'EM_ANDAMENTO' } })
    ])

    const analysis = analyzeFinances({ incomes, expenses, debts })

    const response = await analyzeInvestments(
      amount || analysis.monthlyBalance,
      analysis,
      riskProfile || 'CONSERVADOR',
      goals
    )

    return NextResponse.json({
      success: response.success,
      analysis: response.data,
      rawContent: response.content
    })
  } catch (error) {
    console.error("Erro na análise de investimentos:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
