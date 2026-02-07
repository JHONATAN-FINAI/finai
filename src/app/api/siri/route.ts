import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

// Chave simples para autenticação do atalho Siri
const SIRI_SECRET = process.env.FINAI_SIRI_SECRET || "finai-siri-2026"

export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${SIRI_SECRET}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { texto, email } = body

    if (!email) {
      return NextResponse.json({ error: "Email obrigatório" }, { status: 400 })
    }

    if (!texto || !texto.trim()) {
      return NextResponse.json({ error: "Diga o valor e onde gastou" }, { status: 400 })
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
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

    const categoryNames = categories.map(c => c.name).join(", ")

    // Usar IA para extrair valor, descrição e categoria do texto falado
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Extraia informações deste gasto falado por voz.

Texto: "${texto}"

Categorias disponíveis: ${categoryNames}

Responda APENAS em JSON válido, nada mais:
{"valor": 123.45, "descricao": "Nome do estabelecimento", "categoria": "Nome da Categoria"}

Regras:
- valor: número decimal (ex: 50.00, 228.01)
- descricao: nome do estabelecimento ou descrição curta
- categoria: escolha a mais adequada das categorias disponíveis

Exemplos:
"50 reais no mercado" → {"valor": 50.00, "descricao": "Mercado", "categoria": "Alimentação"}
"gastei 30 de uber" → {"valor": 30.00, "descricao": "Uber", "categoria": "Transporte"}
"228 posto petrobrás" → {"valor": 228.00, "descricao": "Posto Petrobrás", "categoria": "Transporte"}`
      }]
    })

    const aiText = (response.content[0] as any).text?.trim()
    
    let parsed
    try {
      // Limpar possíveis caracteres extras
      const jsonStr = aiText.replace(/```json\n?|\n?```/g, "").trim()
      parsed = JSON.parse(jsonStr)
    } catch (e) {
      return NextResponse.json({ 
        error: "Não entendi. Tente: '50 reais no mercado' ou '30 de uber'",
        debug: aiText
      }, { status: 400 })
    }

    if (!parsed.valor || parsed.valor <= 0) {
      return NextResponse.json({ error: "Não consegui identificar o valor" }, { status: 400 })
    }

    // Encontrar categoria
    const foundCategory = categories.find(
      c => c.name.toLowerCase() === parsed.categoria?.toLowerCase()
    )
    const categoryId = foundCategory?.id || categories.find(c => c.name === "Outros")?.id || categories[0]?.id

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
        amount: parsed.valor,
        description: parsed.descricao || "Gasto via Siri",
        paymentMethod: "CARTAO_CREDITO"
      },
      include: { category: true }
    })

    // Resposta curta para Siri falar
    const faturaInfo = billingMonth ? `, fatura ${billingMonth}/${billingYear}` : ""
    
    return NextResponse.json({
      success: true,
      resposta: `Registrado: ${parsed.descricao}, ${parsed.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, categoria ${transaction.category.name}${faturaInfo}`,
      transaction: {
        id: transaction.id,
        descricao: transaction.description,
        valor: transaction.amount,
        categoria: transaction.category.name
      }
    })

  } catch (error) {
    console.error("Erro no webhook Siri:", error)
    return NextResponse.json({ error: "Erro ao registrar. Tente novamente." }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    endpoint: "FinAI Siri Webhook",
    exemplo: "POST com Authorization: Bearer {secret} e body: {texto: '50 reais mercado', email: 'seu@email.com'}"
  })
}
