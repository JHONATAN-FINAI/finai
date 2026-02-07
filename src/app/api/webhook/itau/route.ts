import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

// Chave de API simples para autenticação do webhook
const WEBHOOK_SECRET = process.env.FINAI_WEBHOOK_SECRET || "finai-itau-2026"

export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { texto, estabelecimento, valor, userId, email } = body

    // Precisa de userId ou email para identificar o usuário
    if (!userId && !email) {
      return NextResponse.json({ error: "userId ou email obrigatório" }, { status: 400 })
    }

    // Buscar usuário
    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Extrair dados da notificação
    let descricao = estabelecimento || ""
    let valorNum = 0

    if (texto) {
      // Formato Itaú: "Estabelecimento\nR$ 123,45" ou "Estabelecimento R$ 123,45"
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
    } else if (estabelecimento && valor) {
      descricao = estabelecimento
      valorNum = typeof valor === "string" 
        ? parseFloat(valor.replace(/[^\d,.-]/g, "").replace(",", "."))
        : valor
    }

    if (!descricao || valorNum <= 0) {
      return NextResponse.json({ 
        error: "Não foi possível extrair dados da notificação",
        recebido: { texto, estabelecimento, valor }
      }, { status: 400 })
    }

    // Buscar categorias do usuário
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { userId: user.id }
        ]
      }
    })

    // Usar IA para classificar a transação
    let categoryId = categories.find(c => c.name === "Outros")?.id || categories[0]?.id

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
      }
    } catch (aiError) {
      console.error("Erro na classificação IA:", aiError)
      // Continua com categoria padrão
    }

    // Criar a transação
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    // Calcular billing period se tiver dia de fechamento
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
        categoria: transaction.category.name,
        fatura: billingMonth ? `${billingMonth}/${billingYear}` : null
      }
    })

  } catch (error) {
    console.error("Erro no webhook Itaú:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// GET para testar se o endpoint está funcionando
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    endpoint: "FinAI Webhook Itaú",
    usage: "POST com Authorization: Bearer {secret} e body: {texto, email} ou {estabelecimento, valor, email}"
  })
}
