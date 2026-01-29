const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixCategories() {
  console.log('Iniciando correção de categorias duplicadas...\n')
  
  // 1. Buscar todas as categorias globais
  const allCategories = await prisma.category.findMany({
    where: { isGlobal: true }
  })
  
  console.log(`Total de categorias encontradas: ${allCategories.length}`)
  
  // 2. Agrupar por nome
  const grouped = {}
  for (const cat of allCategories) {
    if (!grouped[cat.name]) {
      grouped[cat.name] = []
    }
    grouped[cat.name].push(cat)
  }
  
  // 3. Para cada nome duplicado, manter apenas um e remover os outros
  for (const [name, cats] of Object.entries(grouped)) {
    if (cats.length > 1) {
      console.log(`\nCategoria "${name}" tem ${cats.length} duplicatas`)
      
      // Manter o primeiro, deletar os outros
      const [keep, ...toDelete] = cats
      console.log(`  Mantendo ID: ${keep.id}`)
      
      for (const cat of toDelete) {
        // Primeiro, atualizar todas as despesas que usam essa categoria
        const updated = await prisma.expense.updateMany({
          where: { categoryId: cat.id },
          data: { categoryId: keep.id }
        })
        
        // Atualizar transações também
        const updatedTrans = await prisma.transaction.updateMany({
          where: { categoryId: cat.id },
          data: { categoryId: keep.id }
        })
        
        // Atualizar PlanCategory também
        try {
          await prisma.planCategory.deleteMany({
            where: { categoryId: cat.id }
          })
        } catch (e) {
          // Ignora se não existir
        }
        
        console.log(`  Removendo ID: ${cat.id} (${updated.count} despesas migradas, ${updatedTrans.count} transações migradas)`)
        
        // Agora deletar a categoria duplicada
        await prisma.category.delete({
          where: { id: cat.id }
        })
      }
    }
  }
  
  // 4. Verificar resultado final
  const finalCategories = await prisma.category.findMany({
    where: { isGlobal: true },
    orderBy: { name: 'asc' }
  })
  
  console.log(`\n✅ Correção concluída!`)
  console.log(`Total de categorias agora: ${finalCategories.length}`)
  console.log('\nCategorias disponíveis:')
  finalCategories.forEach(cat => {
    console.log(`  - ${cat.name} (${cat.type})`)
  })
}

fixCategories()
  .catch((e) => {
    console.error('Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
