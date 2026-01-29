"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Wallet, TrendingUp, PieChart, Shield } from "lucide-react"

export default function HomePage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const credentials: any = {
        email: form.email,
        password: form.password,
        redirect: false
      }
      
      // Só adiciona nome se for cadastro
      if (!isLogin && form.name.trim()) {
        credentials.name = form.name.trim()
      }
      
      const result = await signIn("credentials", credentials)

      if (result?.error) {
        if (isLogin) {
          setError("Email ou senha inválidos")
        } else {
          setError("Erro ao criar conta. Tente novamente.")
        }
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError("Erro ao conectar. Tente novamente.")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">FinAI</span>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Info */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Controle suas finanças com{" "}
              <span className="text-blue-600">inteligência</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Diagnóstico completo, planejamento personalizado e controle diário. 
              Tudo o que você precisa para organizar sua vida financeira.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Diagnóstico Completo</h3>
                  <p className="text-sm text-gray-500">Análise detalhada da sua situação financeira</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <PieChart className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Regra 50/30/20</h3>
                  <p className="text-sm text-gray-500">Planejamento ajustável às suas necessidades</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Controle Diário</h3>
                  <p className="text-sm text-gray-500">Acompanhe gastos e receba alertas</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Dados Seguros</h3>
                  <p className="text-sm text-gray-500">Suas informações sempre protegidas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              <div className="flex gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isLogin 
                      ? "bg-blue-600 text-white" 
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    !isLogin 
                      ? "bg-blue-600 text-white" 
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Criar Conta
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      required={!isLogin}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Seu nome"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Sua senha"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar Conta"}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                {isLogin ? (
                  <>
                    Não tem conta?{" "}
                    <button 
                      type="button"
                      onClick={() => setIsLogin(false)} 
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Criar agora
                    </button>
                  </>
                ) : (
                  <>
                    Já tem conta?{" "}
                    <button 
                      type="button"
                      onClick={() => setIsLogin(true)} 
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Fazer login
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
