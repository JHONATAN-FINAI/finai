import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { getCoachingSession } from "@/lib/ai"
import { analyzeFinances } from "@/lib/analysis"

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

    const [incomes, expenses, debts, challenges, lastChat] = await Promise.all([
      prisma.income.findMany({ where: { userId: user.id, isActive: true } }),
      prisma.expense.findMany({ where: { userId: user.id, isActive: true }, include: { category: true } }),
      prisma.debt.findMany({ where: { userId: user.id } }),
      prisma.challenge.findMany({ where: { userId: user.id, status: 'ATIVO' } }),
      prisma.chatMessage.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })
    ])

    const analysis = analyzeFinances({ incomes, expenses, debts })

    const response = await getCoachingSession(
      analysis,
      lastChat?.createdAt || null,
      challenges
    )

    return NextResponse.json({
      success: response.success,
      session: response.data,
      rawContent: response.content
    })
  } catch (error) {
    console.error("Erro no coaching:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
