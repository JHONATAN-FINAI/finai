"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { 
  LayoutDashboard, 
  ClipboardList, 
  FileText, 
  PieChart, 
  Receipt, 
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bot,
  Target,
  Calculator,
  TrendingUp,
  Bell,
  Calendar,
  History,
  CreditCard,
  Sparkles
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistente", label: "Assistente IA", icon: Bot, highlight: true },
  { href: "/diagnostico", label: "Diagnóstico", icon: ClipboardList },
  { href: "/relatorio", label: "Relatório", icon: FileText },
  { href: "/planejamento", label: "Planejamento", icon: PieChart },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/compromissos", label: "Compromissos", icon: CreditCard },
  { href: "/novo-mes", label: "Novo Mês", icon: Calendar },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/simulador", label: "Simulador", icon: Calculator },
  { href: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 17h4v4H3zM9 13h4v8H9zM15 9h4v12h-4zM21 5h-4" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="21" cy="5" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent">FinAI</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}
        </button>
      </header>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-full w-72 bg-white/95 backdrop-blur-md border-r border-gray-200/50 transform transition-transform duration-300 lg:translate-x-0 flex flex-col shadow-xl lg:shadow-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 17h4v4H3zM9 13h4v8H9zM15 9h4v12h-4zM21 5h-4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="21" cy="5" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent">FinAI</span>
              <p className="text-xs text-gray-400 font-medium">Gestão Inteligente</p>
            </div>
          </div>
        </div>

        {/* User info */}
        {session?.user && (
          <div className="mx-6 mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-100/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {session.user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{session.user.name}</p>
                <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu - com scroll */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 text-white shadow-md shadow-emerald-500/20" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    item.highlight && !isActive && "bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 hover:from-purple-100 hover:to-pink-100"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-white")} />
                  {item.label}
                  {item.highlight && !isActive && (
                    <Sparkles className="w-3.5 h-3.5 ml-auto text-purple-400" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
