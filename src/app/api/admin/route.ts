import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// API temporária para limpeza - REMOVER DEPOIS
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const secret = searchParams.get('secret')
  
  // Proteção simples
  if (secret !== 'finai-admin-2026') {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  
  if (action === 'delete-feb-after-22') {
    // Deletar transações após 22/02 que estão com month=2
    const deleted = await prisma.transaction.deleteMany({
      where: {
        month: 2,
        year: 2026,
        date: {
          gt: new Date('2026-02-22')
        }
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      message: `Deletadas ${deleted.count} transações após 22/02 com month=2` 
    })
  }
  
  if (action === 'list-feb-after-22') {
    const transactions = await prisma.transaction.findMany({
      where: {
        month: 2,
        year: 2026,
        date: {
          gt: new Date('2026-02-22')
        }
      },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        billingMonth: true
      },
      orderBy: { date: 'desc' }
    })
    
    return NextResponse.json({ transactions, count: transactions.length })
  }
  
  return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
}
