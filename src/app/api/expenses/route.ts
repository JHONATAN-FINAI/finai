import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ expenses: [] })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ expenses: [] })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const expenses = await prisma.expense.findMany({
      where: { 
        userId: user.id, 
        isActive: true,
        ...(type && { type })
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ expenses })
  } catch (error) {
    console.error("Erro ao buscar despesas:", error)
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
    const { name, amount, categoryId, type, recurrenceType, startMonth, startYear, endMonth, endYear, dueDay, notes } = body

    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        categoryId,
        name,
        amount: parseFloat(amount),
        type: type || 'VARIAVEL',
        recurrenceType: recurrenceType || 'MENSAL',
        startMonth: startMonth || null,
        startYear: startYear || null,
        endMonth: type === 'VARIAVEL' ? (endMonth || startMonth) : null,
        endYear: type === 'VARIAVEL' ? (endYear || startYear) : null,
        dueDay: dueDay ? parseInt(dueDay) : null,
        notes
      },
      include: { category: true }
    })

    return NextResponse.json({ expense })
  } catch (error) {
    console.error("Erro ao criar despesa:", error)
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

    await prisma.expense.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar despesa:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
