import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ incomes: [] })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ incomes: [] })
    }

    const incomes = await prisma.income.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ incomes })
  } catch (error) {
    console.error("Erro ao buscar receitas:", error)
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
    const { name, amount, recurrenceType, type, startMonth, startYear, endMonth, endYear, notes } = body

    const income = await prisma.income.create({
      data: {
        userId: user.id,
        name,
        amount: parseFloat(amount),
        recurrenceType: recurrenceType || 'MENSAL',
        type: type || 'FIXA',
        startMonth: startMonth || null,
        startYear: startYear || null,
        endMonth: type === 'VARIAVEL' ? (endMonth || startMonth) : null,
        endYear: type === 'VARIAVEL' ? (endYear || startYear) : null,
        notes
      }
    })

    return NextResponse.json({ income })
  } catch (error) {
    console.error("Erro ao criar receita:", error)
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

    await prisma.income.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar receita:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
