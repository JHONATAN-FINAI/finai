import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

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
    const { expenses, debts } = body

    if (!expenses?.length && !debts?.length) {
      return NextResponse.json({ tips: ["Cadastre suas despesas fixas e dívidas para receber dicas personalizadas."] })
    }

    const expensesList = expenses?.map((e: any) => `- ${e.name}: R$ ${e.amount.toFixed(2)}/mês (${e.category?.name || 'Sem categoria'})`).join('\n') || ''
    const debtsList = debts?.map((d: any) => `- ${d.name}: R$ ${d.monthlyPayment.toFixed(2)}/mês (${d.remainingInstallments || '?'} parcelas restantes)`).join('\n') || ''

    const prompt = `Analise os compromissos financeiros fixos abaixo e sugira 3-5 dicas práticas e específicas de economia.

DESPESAS FIXAS:
${expensesList || 'Nenhuma cadastrada'}

DÍVIDAS/PARCELAS:
${debtsList || 'Nenhuma cadastrada'}

Para cada dica:
1. Seja específico sobre qual despesa reduzir
2. Sugira alternativas mais baratas quando possível
3. Mencione valores aproximados de economia
4. Considere renegociação, portabilidade, cancelamento de serviços não essenciais

Responda APENAS com um JSON no formato:
{"tips": ["dica 1", "dica 2", "dica 3"]}`

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ tips: ["Erro ao gerar dicas."] })
    }

    try {
      const parsed = JSON.parse(content.text)
      return NextResponse.json({ tips: parsed.tips || [] })
    } catch {
      const tips = content.text.split('\n').filter(line => line.trim().length > 10).slice(0, 5)
      return NextResponse.json({ tips })
    }
  } catch (error) {
    console.error("Erro ao gerar dicas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
