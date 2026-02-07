-- Adicionar campos de billing period na tabela Transaction
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "billingMonth" INTEGER;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "billingYear" INTEGER;
