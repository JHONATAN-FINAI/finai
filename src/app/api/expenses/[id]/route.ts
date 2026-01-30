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

    const expense = await prisma.expense.findFirst({
      where: { id: params.id, userId: user.id }
    })

    if (!expense) {
      return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const { name, amount, categoryId, type, recurrenceType, dueDay, notes } = body

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data: {
        name: name ?? expense.name,
        amount: amount !== undefined ? parseFloat(amount) : expense.amount,
        categoryId: categoryId ?? expense.categoryId,
        type: type ?? expense.type,
        recurrenceType: recurrenceType ?? expense.recurrenceType,
        dueDay: dueDay !== undefined ? (dueDay ? parseInt(dueDay) : null) : expense.dueDay,
        notes: notes !== undefined ? notes : expense.notes
      },
      include: { category: true }
    })

    return NextResponse.json({ expense: updated })
  } catch (error) {
    console.error("Erro ao atualizar despesa:", error)
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

    const expense = await prisma.expense.findFirst({
      where: { id: params.id, userId: user.id }
    })

    if (!expense) {
      return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 })
    }

    await prisma.expense.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar despesa:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
