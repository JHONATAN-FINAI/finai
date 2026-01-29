import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { categorizeTransaction, classifyExpense, getFallbackCategorization, getFallbackExpenseType } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { description, amount, mode } = await request.json()

    const categories = await prisma.category.findMany({
      where: { isGlobal: true },
      select: { id: true, name: true, type: true }
    })

    // Modo "expense" = classificar despesa completa (tipo + categoria)
    // Modo "transaction" ou padrão = apenas categoria
    if (mode === 'expense') {
      const response = await classifyExpense(description, amount, categories)

      if (response.success && response.data) {
        return NextResponse.json({
          success: true,
          categoryId: response.data.categoryId,
          categoryName: response.data.categoryName,
          expenseType: response.data.expenseType,
          recurrenceType: response.data.recurrenceType || 'MENSAL',
          confidence: response.data.confidence,
          reasoning: response.data.reasoning
        })
      }

      // Fallback sem IA
      const fallbackCategory = getFallbackCategorization(description)
      const fallbackType = getFallbackExpenseType(description)
      const category = categories.find(c => c.name === fallbackCategory) || categories.find(c => c.name === 'Outros')

      return NextResponse.json({
        success: true,
        categoryId: category?.id,
        categoryName: category?.name || 'Outros',
        expenseType: fallbackType,
        recurrenceType: 'MENSAL',
        confidence: 0.6,
        reasoning: 'Classificado por palavras-chave'
      })
    }

    // Modo padrão: apenas categorizar transação
    const response = await categorizeTransaction(description, amount, categories)

    if (response.success && response.data?.categoryId) {
      return NextResponse.json({
        success: true,
        categoryId: response.data.categoryId,
        categoryName: response.data.categoryName,
        confidence: response.data.confidence,
        reasoning: response.data.reasoning
      })
    }

    // Fallback
    const fallbackName = getFallbackCategorization(description)
    const fallbackCategory = categories.find(c => c.name === fallbackName) || categories.find(c => c.name === 'Outros')

    return NextResponse.json({
      success: true,
      categoryId: fallbackCategory?.id,
      categoryName: fallbackCategory?.name || 'Outros',
      confidence: 0.6,
      reasoning: 'Categorizado por palavras-chave'
    })
  } catch (error) {
    console.error("Erro na categorização:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
