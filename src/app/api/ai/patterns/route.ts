import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { detectPatterns } from "@/lib/ai"

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

    // Buscar dados
    const [transactions, expenses, incomes] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: user.id },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 100
      }),
      prisma.expense.findMany({ 
        where: { userId: user.id, isActive: true },
        include: { category: true }
      }),
      prisma.income.findMany({ where: { userId: user.id, isActive: true } })
    ])

    const response = await detectPatterns(transactions, expenses, incomes)

    // Salvar padrões detectados
    if (response.success && response.data?.patterns) {
      for (const pattern of response.data.patterns) {
        await prisma.pattern.create({
          data: {
            userId: user.id,
            type: pattern.type,
            description: pattern.description,
            data: pattern,
            importance: pattern.importance
          }
        })
      }
    }

    return NextResponse.json({
      success: response.success,
      patterns: response.data?.patterns || [],
      summary: response.data?.summary || ''
    })
  } catch (error) {
    console.error("Erro ao detectar padrões:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
