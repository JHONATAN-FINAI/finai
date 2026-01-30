import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const debt = await prisma.debt.findFirst({
      where: { id: params.id, userId: user.id }
    })

    if (!debt) {
      return NextResponse.json({ error: "Dívida não encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const { name, type, totalBalance, monthlyPayment, remainingInstallments, dueDay, status, notes } = body

    const updated = await prisma.debt.update({
      where: { id: params.id },
      data: {
        name: name ?? debt.name,
        type: type ?? debt.type,
        totalBalance: totalBalance !== undefined ? parseFloat(totalBalance) : debt.totalBalance,
        monthlyPayment: monthlyPayment !== undefined ? parseFloat(monthlyPayment) : debt.monthlyPayment,
        remainingInstallments: remainingInstallments !== undefined ? parseInt(remainingInstallments) : debt.remainingInstallments,
        dueDay: dueDay !== undefined ? (dueDay ? parseInt(dueDay) : null) : debt.dueDay,
        status: status ?? debt.status,
        notes: notes !== undefined ? notes : debt.notes
      }
    })

    return NextResponse.json({ debt: updated })
  } catch (error) {
    console.error("Erro ao atualizar dívida:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const debt = await prisma.debt.findFirst({
      where: { id: params.id, userId: user.id }
    })

    if (!debt) {
      return NextResponse.json({ error: "Dívida não encontrada" }, { status: 404 })
    }

    await prisma.debt.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar dívida:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
