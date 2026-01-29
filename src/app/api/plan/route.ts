import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ plan: null })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ plan: null })
    }

    const plan = await prisma.plan.findUnique({
      where: { userId: user.id },
      include: {
        categories: {
          include: { category: true }
        }
      }
    })

    return NextResponse.json({ plan })
  } catch (error) {
    console.error("Erro ao buscar plano:", error)
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
    const { needsPercent, wantsPercent, savingsPercent, totalIncome, categories } = body

    // Criar ou atualizar plano
    const plan = await prisma.plan.upsert({
      where: { userId: user.id },
      update: {
        needsPercent: parseFloat(needsPercent) || 50,
        wantsPercent: parseFloat(wantsPercent) || 30,
        savingsPercent: parseFloat(savingsPercent) || 20,
        totalIncome: parseFloat(totalIncome) || 0
      },
      create: {
        userId: user.id,
        needsPercent: parseFloat(needsPercent) || 50,
        wantsPercent: parseFloat(wantsPercent) || 30,
        savingsPercent: parseFloat(savingsPercent) || 20,
        totalIncome: parseFloat(totalIncome) || 0
      }
    })

    // Atualizar categorias do plano se fornecidas
    if (categories && Array.isArray(categories)) {
      for (const cat of categories) {
        await prisma.planCategory.upsert({
          where: {
            planId_categoryId: {
              planId: plan.id,
              categoryId: cat.categoryId
            }
          },
          update: {
            monthlyBudget: parseFloat(cat.monthlyBudget) || 0,
            weeklyBudget: cat.weeklyBudget ? parseFloat(cat.weeklyBudget) : null,
            dailyBudget: cat.dailyBudget ? parseFloat(cat.dailyBudget) : null
          },
          create: {
            planId: plan.id,
            categoryId: cat.categoryId,
            monthlyBudget: parseFloat(cat.monthlyBudget) || 0,
            weeklyBudget: cat.weeklyBudget ? parseFloat(cat.weeklyBudget) : null,
            dailyBudget: cat.dailyBudget ? parseFloat(cat.dailyBudget) : null
          }
        })
      }
    }

    const updatedPlan = await prisma.plan.findUnique({
      where: { id: plan.id },
      include: {
        categories: {
          include: { category: true }
        }
      }
    })

    return NextResponse.json({ plan: updatedPlan })
  } catch (error) {
    console.error("Erro ao salvar plano:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
