const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const categories = [
  { name: 'Moradia', type: 'NECESSIDADE' },
  { name: 'Alimentação', type: 'NECESSIDADE' },
  { name: 'Transporte', type: 'NECESSIDADE' },
  { name: 'Saúde', type: 'NECESSIDADE' },
  { name: 'Educação', type: 'NECESSIDADE' },
  { name: 'Serviços Essenciais', type: 'NECESSIDADE' },
  { name: 'Lazer', type: 'DESEJO' },
  { name: 'Compras', type: 'DESEJO' },
  { name: 'Assinaturas', type: 'DESEJO' },
  { name: 'Restaurantes', type: 'DESEJO' },
  { name: 'Investimentos', type: 'POUPANCA' },
  { name: 'Reserva de Emergência', type: 'POUPANCA' },
  { name: 'Outros', type: 'NECESSIDADE' },
]

async function main() {
  console.log('Limpando categorias duplicadas...')
  
  // Remove todas as categorias globais existentes
  await prisma.category.deleteMany({
    where: { isGlobal: true }
  })
  
  console.log('Criando categorias...')
  
  for (const cat of categories) {
    await prisma.category.create({
      data: {
        name: cat.name,
        type: cat.type,
        isGlobal: true,
        userId: null
      }
    })
    console.log(`Criado: ${cat.name}`)
  }
  
  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
