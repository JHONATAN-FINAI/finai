import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { runSimulation } from "@/lib/ai"
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

    const { scenario } = await request.json()

    const [incomes, expenses, debts] = await Promise.all([
      prisma.income.findMany({ where: { userId: user.id, isActive: true } }),
      prisma.expense.findMany({ where: { userId: user.id, isActive: true }, include: { category: true } }),
      prisma.debt.findMany({ where: { userId: user.id } })
    ])

    const analysis = analyzeFinances({ incomes, expenses, debts })

    const response = await runSimulation(scenario, analysis)

    return NextResponse.json({
      success: response.success,
      simulation: response.data,
      rawContent: response.content
    })
  } catch (error) {
    console.error("Erro na simulação:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
