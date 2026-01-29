import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"

export async function GET() {
  try {
    // Buscar categorias globais
    const categories = await prisma.category.findMany({
      where: { isGlobal: true },
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json({ categories })
  } catch (error) {
    console.error("Erro ao buscar categorias:", error)
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
    const { name, type } = body

    const category = await prisma.category.create({
      data: {
        name,
        type: type || 'NECESSIDADE',
        userId: user.id,
        isGlobal: false
      }
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error("Erro ao criar categoria:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
