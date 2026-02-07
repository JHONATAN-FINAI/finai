import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"

// Calcula o mês/ano da fatura baseado na data do gasto e dia de fechamento
function calculateBillingPeriod(transactionDate: Date, closingDay: number) {
  const day = transactionDate.getDate()
  const month = transactionDate.getMonth() + 1
  const year = transactionDate.getFullYear()

  // Se o gasto foi DEPOIS do fechamento, vai para a fatura do próximo mês
  if (day > closingDay) {
    if (month === 12) {
      return { billingMonth: 1, billingYear: year + 1 }
    }
    return { billingMonth: month + 1, billingYear: year }
  }
  
  // Se foi antes ou no dia do fechamento, vai para a fatura do mês atual
  return { billingMonth: month, billingYear: year }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ transactions: [] })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ transactions: [] })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const filterByBilling = searchParams.get('billing') === 'true'

    let whereClause: any = { userId: user.id }

    if (month && year) {
      if (filterByBilling) {
        // Filtrar por mês de fatura (para cartão de crédito)
        whereClause.billingMonth = parseInt(month)
        whereClause.billingYear = parseInt(year)
      } else {
        // Filtrar por mês real da transação
        whereClause.month = parseInt(month)
        whereClause.year = parseInt(year)
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: { category: true },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json({ 
      transactions, 
      closingDay: user.closingDay 
    })
  } catch (error) {
    console.error("Erro ao buscar transações:", error)
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
    const { categoryId, date, amount, description, paymentMethod } = body

    const transactionDate = new Date(date)
    const month = transactionDate.getMonth() + 1
    const year = transactionDate.getFullYear()

    // Calcular billingMonth/Year para cartão de crédito
    let billingMonth: number | null = null
    let billingYear: number | null = null

    if (paymentMethod === 'CARTAO_CREDITO' && user.closingDay) {
      const billing = calculateBillingPeriod(transactionDate, user.closingDay)
      billingMonth = billing.billingMonth
      billingYear = billing.billingYear
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId,
        date: transactionDate,
        month,
        year,
        billingMonth,
        billingYear,
        amount: parseFloat(amount),
        description,
        paymentMethod: paymentMethod || 'PIX'
      },
      include: { category: true }
    })

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error("Erro ao criar transação:", error)
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

    await prisma.transaction.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar transação:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
