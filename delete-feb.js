const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Buscar transações após dia 22/02 que estão com month=2
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
    }
  })
  
  console.log('Transações após 22/02 com month=2:')
  console.log(JSON.stringify(transactions, null, 2))
  console.log('Total:', transactions.length)
  
  // Deletar essas transações
  const deleted = await prisma.transaction.deleteMany({
    where: {
      month: 2,
      year: 2026,
      date: {
        gt: new Date('2026-02-22')
      }
    }
  })
  
  console.log('Deletadas:', deleted.count)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
