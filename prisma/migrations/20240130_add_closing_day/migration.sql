-- Migration: Adicionar campo closingDay na tabela User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "closingDay" INTEGER;
