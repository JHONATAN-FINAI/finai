import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function calculateMonthlyAmount(amount: number, recurrenceType: string): number {
  switch (recurrenceType) {
    case 'SEMANAL':
      return amount * 4
    case 'QUINZENAL':
      return amount * 2
    case 'MENSAL':
      return amount
    case 'UNICO':
      return amount / 12
    default:
      return amount
  }
}
