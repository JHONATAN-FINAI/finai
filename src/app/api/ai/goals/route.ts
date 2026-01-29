import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { defineGoalWithAI, generateActionPlan } from "@/lib/ai"
import { analyzeFinances } from "@/lib/analysis"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ goals: [] })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) {
      return NextResponse.json({ goals: [] })
    }

    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ goals })
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

    const { description, useAI } = await request.json()

    const [incomes, expenses, debts] = await Promise.all([
      prisma.income.findMany({ where: { userId: user.id, isActive: true } }),
      prisma.expense.findMany({ where: { userId: user.id, isActive: true }, include: { category: true } }),
      prisma.debt.findMany({ where: { userId: user.id } })
    ])

    const analysis = analyzeFinances({ incomes, expenses, debts })

    if (useAI) {
      const aiResponse = await defineGoalWithAI(description, analysis)

      if (aiResponse.success && aiResponse.data) {
        const data = aiResponse.data

        const goal = await prisma.goal.create({
          data: {
            userId: user.id,
            title: data.title,
            description: data.smartGoal?.specific || description,
            targetAmount: data.targetAmount || 0,
            deadline: data.suggestedDeadline ? new Date(data.suggestedDeadline) : null,
            priority: data.priority || 'MEDIA',
            aiPlan: data
          }
        })

        return NextResponse.json({ goal, aiSuggestions: data })
      }
    }

    // Criar meta sem IA
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: description,
        description,
        targetAmount: 0,
        priority: 'MEDIA'
      }
    })

    return NextResponse.json({ goal })
  } catch (error) {
    console.error("Erro ao criar meta:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id, currentAmount, status } = await request.json()

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...(currentAmount !== undefined && { currentAmount }),
        ...(status && { status })
      }
    })

    return NextResponse.json({ goal })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "ID não informado" }, { status: 400 })
    }

    await prisma.goal.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
