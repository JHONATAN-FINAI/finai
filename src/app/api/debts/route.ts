import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ debts: [] })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ debts: [] })
    }

    const debts = await prisma.debt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ debts })
  } catch (error) {
    console.error("Erro ao buscar dívidas:", error)
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
    const { name, type, totalBalance, interestRate, monthlyPayment, remainingInstallments, startMonth, startYear, dueDay, notes } = body

    const debt = await prisma.debt.create({
      data: {
        userId: user.id,
        name,
        type: type || 'OUTROS',
        totalBalance: parseFloat(totalBalance),
        interestRate: interestRate ? parseFloat(interestRate) : null,
        monthlyPayment: parseFloat(monthlyPayment),
        remainingInstallments: remainingInstallments ? parseInt(remainingInstallments) : null,
        startMonth: startMonth ? parseInt(startMonth) : null,
        startYear: startYear ? parseInt(startYear) : null,
        dueDay: dueDay ? parseInt(dueDay) : null,
        notes
      }
    })

    return NextResponse.json({ debt })
  } catch (error) {
    console.error("Erro ao criar dívida:", error)
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

    await prisma.debt.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar dívida:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
