import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { predictProblems } from "@/lib/ai"

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

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const daysRemaining = endOfMonth.getDate() - now.getDate()

    const [transactions, plan] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: startOfMonth, lte: now }
        },
        include: { category: true }
      }),
      prisma.plan.findUnique({
        where: { userId: user.id },
        include: { categories: { include: { category: true } } }
      })
    ])

    // Agrupar gastos por categoria
    const spendingByCategory: Record<string, number> = {}
    transactions.forEach(t => {
      const catName = t.category?.name || 'Outros'
      spendingByCategory[catName] = (spendingByCategory[catName] || 0) + t.amount
    })

    const planData = plan?.categories.map(pc => ({
      category: pc.category.name,
      budget: pc.monthlyBudget,
      spent: spendingByCategory[pc.category.name] || 0
    })) || []

    const response = await predictProblems(transactions, planData, daysRemaining)

    return NextResponse.json({
      success: response.success,
      predictions: response.data?.predictions || [],
      overallRisk: response.data?.overallRisk || 'BAIXO',
      alertMessage: response.data?.alertMessage || '',
      daysRemaining
    })
  } catch (error) {
    console.error("Erro na previsão:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
