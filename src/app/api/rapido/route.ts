import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

export async function POST(request: Request) {
  try {
    // Autenticação via sessão (para uso interno pelo app)
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
    const { texto } = body

    if (!texto || !texto.trim()) {
      return NextResponse.json({ error: "Texto da notificação obrigatório" }, { status: 400 })
    }

    // Extrair dados da notificação Itaú
    // Formato: "Estabelecimento\nR$ 123,45" ou "Estabelecimento R$ 123,45"
    let descricao = ""
    let valorNum = 0

    const linhas = texto.trim().split(/[\n\r]+/)
    
    if (linhas.length >= 2) {
      descricao = linhas[0].trim()
      const valorMatch = linhas[1].match(/R\$\s*([\d.,]+)/)
      if (valorMatch) {
        valorNum = parseFloat(valorMatch[1].replace(".", "").replace(",", "."))
      }
    } else {
      // Tentar extrair de uma única linha
      const match = texto.match(/(.+?)\s*R\$\s*([\d.,]+)/)
      if (match) {
        descricao = match[1].trim()
        valorNum = parseFloat(match[2].replace(".", "").replace(",", "."))
      }
    }

    if (!descricao || valorNum <= 0) {
      return NextResponse.json({ 
        error: "Não foi possível extrair dados. Formato esperado:\nEstabelecimento\nR$ valor",
        recebido: texto
      }, { status: 400 })
    }

    // Buscar categorias
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { userId: user.id }
        ]
      }
    })

    // Classificar com IA
    let categoryId = categories.find(c => c.name === "Outros")?.id || categories[0]?.id
    let categoryName = "Outros"

    try {
      const categoryNames = categories.map(c => c.name).join(", ")
      
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: `Classifique este gasto em UMA das categorias disponíveis.

Gasto: "${descricao}" - R$ ${valorNum.toFixed(2)}

Categorias disponíveis: ${categoryNames}

Responda APENAS com o nome exato da categoria, nada mais.`
        }]
      })

      const suggestedCategory = (response.content[0] as any).text?.trim()
      const foundCategory = categories.find(
        c => c.name.toLowerCase() === suggestedCategory?.toLowerCase()
      )
      
      if (foundCategory) {
        categoryId = foundCategory.id
        categoryName = foundCategory.name
      }
    } catch (aiError) {
      console.error("Erro na classificação IA:", aiError)
    }

    // Criar transação
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    // Calcular billing period
    let billingMonth: number | null = null
    let billingYear: number | null = null

    if (user.closingDay) {
      const day = now.getDate()
      if (day > user.closingDay) {
        billingMonth = month === 12 ? 1 : month + 1
        billingYear = month === 12 ? year + 1 : year
      } else {
        billingMonth = month
        billingYear = year
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId,
        date: now,
        month,
        year,
        billingMonth,
        billingYear,
        amount: valorNum,
        description: descricao,
        paymentMethod: "CARTAO_CREDITO"
      },
      include: { category: true }
    })

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        descricao: transaction.description,
        valor: transaction.amount,
        categoria: categoryName,
        fatura: billingMonth ? `${billingMonth}/${billingYear}` : null
      }
    })

  } catch (error) {
    console.error("Erro no registro rápido:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
