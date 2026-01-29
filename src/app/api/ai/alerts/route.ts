import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { generateSmartAlerts } from "@/lib/ai"
import { analyzeFinances } from "@/lib/analysis"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ alerts: [] })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) {
      return NextResponse.json({ alerts: [] })
    }

    const alerts = await prisma.alert.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ alerts })
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

    const body = await request.json()

    // Se for para gerar alertas com IA
    if (body.generate) {
      const [incomes, expenses, debts, transactions, existingAlerts] = await Promise.all([
        prisma.income.findMany({ where: { userId: user.id, isActive: true } }),
        prisma.expense.findMany({ where: { userId: user.id, isActive: true }, include: { category: true } }),
        prisma.debt.findMany({ where: { userId: user.id } }),
        prisma.transaction.findMany({
          where: { userId: user.id },
          include: { category: true },
          orderBy: { date: 'desc' },
          take: 50
        }),
        prisma.alert.findMany({ where: { userId: user.id } })
      ])

      const analysis = analyzeFinances({ incomes, expenses, debts })

      const response = await generateSmartAlerts(analysis, transactions, existingAlerts)

      return NextResponse.json({
        success: response.success,
        immediateAlerts: response.data?.immediateAlerts || [],
        suggestedAlerts: response.data?.suggestedRecurringAlerts || [],
        insights: response.data?.insights || []
      })
    }

    // Criar alerta manual
    const { type, title, message, threshold, categoryId, channel } = body

    const alert = await prisma.alert.create({
      data: {
        userId: user.id,
        type,
        title,
        message,
        threshold,
        categoryId,
        channel: channel || 'APP'
      }
    })

    return NextResponse.json({ alert })
  } catch (error) {
    console.error("Erro nos alertas:", error)
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

    await prisma.alert.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
