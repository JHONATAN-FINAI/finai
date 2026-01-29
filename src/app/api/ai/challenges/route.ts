import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { generateChallenge } from "@/lib/ai"
import { analyzeFinances } from "@/lib/analysis"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ challenges: [] })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) {
      return NextResponse.json({ challenges: [] })
    }

    const challenges = await prisma.challenge.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ challenges })
  } catch (error) {
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

    const { difficulty, focus } = await request.json()

    const [incomes, expenses, debts, previousChallenges] = await Promise.all([
      prisma.income.findMany({ where: { userId: user.id, isActive: true } }),
      prisma.expense.findMany({ where: { userId: user.id, isActive: true }, include: { category: true } }),
      prisma.debt.findMany({ where: { userId: user.id } }),
      prisma.challenge.findMany({ where: { userId: user.id }, take: 10, orderBy: { createdAt: 'desc' } })
    ])

    const analysis = analyzeFinances({ incomes, expenses, debts })

    const response = await generateChallenge(analysis, previousChallenges, {
      difficulty: difficulty || 'MEDIO',
      focus: focus || 'ECONOMIA'
    })

    if (response.success && response.data?.challenge) {
      const c = response.data.challenge
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + (c.duration || 7))

      const challenge = await prisma.challenge.create({
        data: {
          userId: user.id,
          title: c.title,
          description: c.description,
          type: c.type,
          targetValue: c.targetValue,
          endDate,
          reward: c.reward
        }
      })

      return NextResponse.json({ 
        challenge, 
        aiData: response.data 
      })
    }

    return NextResponse.json({ 
      error: "Não foi possível gerar desafio",
      content: response.content 
    }, { status: 400 })
  } catch (error) {
    console.error("Erro ao criar desafio:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id, currentValue, status } = await request.json()

    const challenge = await prisma.challenge.update({
      where: { id },
      data: {
        ...(currentValue !== undefined && { currentValue }),
        ...(status && { status })
      }
    })

    return NextResponse.json({ challenge })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
