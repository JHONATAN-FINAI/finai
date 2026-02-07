"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { Zap, Check, AlertCircle, CreditCard, Loader2, Clipboard, X } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function RapidoPage() {
  const { status } = useSession()
  const router = useRouter()
  const [texto, setTexto] = useState("")
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [erro, setErro] = useState("")
  const [historico, setHistorico] = useState<any[]>([])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  // Carregar histórico do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("finai-rapido-historico")
    if (saved) {
      setHistorico(JSON.parse(saved).slice(0, 5))
    }
  }, [])

  const colarTexto = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setTexto(text)
    } catch (err) {
      // Fallback se não tiver permissão
      setErro("Não foi possível acessar a área de transferência")
    }
  }

  const registrar = async () => {
    if (!texto.trim()) return

    setLoading(true)
    setErro("")
    setResultado(null)

    try {
      const res = await fetch("/api/rapido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto.trim() })
      })

      const data = await res.json()

      if (data.success) {
        setResultado(data.transaction)
        setTexto("")
        
        // Salvar no histórico
        const novoHistorico = [data.transaction, ...historico].slice(0, 5)
        setHistorico(novoHistorico)
        localStorage.setItem("finai-rapido-historico", JSON.stringify(novoHistorico))
      } else {
        setErro(data.error || "Erro ao registrar")
      }
    } catch (error) {
      setErro("Erro de conexão")
    }

    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Registro Rápido</h1>
          <p className="text-gray-500 mt-1">Cole a notificação do Itaú para registrar</p>
        </div>

        {/* Área de input */}
        <div className="bg-white rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              Notificação do Itaú
            </label>
            <button
              onClick={colarTexto}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Clipboard className="w-4 h-4" />
              Colar
            </button>
          </div>
          
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Posto Petrobrás&#10;R$ 228,01"
            className="w-full h-32 px-4 py-3 border rounded-xl resize-none text-lg"
          />

          <button
            onClick={registrar}
            disabled={loading || !texto.trim()}
            className="w-full mt-4 py-4 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Registrar Gasto
              </>
            )}
          </button>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-800">Gasto registrado!</p>
                <p className="text-green-700 mt-1">
                  <strong>{resultado.descricao}</strong>
                </p>
                <p className="text-green-600 text-sm">
                  {formatCurrency(resultado.valor)} • {resultado.categoria}
                  {resultado.fatura && ` • Fatura ${resultado.fatura}`}
                </p>
              </div>
              <button onClick={() => setResultado(null)}>
                <X className="w-5 h-5 text-green-400" />
              </button>
            </div>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{erro}</p>
              <button onClick={() => setErro("")} className="ml-auto">
                <X className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </div>
        )}

        {/* Histórico recente */}
        {historico.length > 0 && (
          <div className="bg-white rounded-2xl p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Últimos registros</h3>
            <div className="space-y-2">
              {historico.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.descricao}</p>
                    <p className="text-xs text-gray-500">{item.categoria}</p>
                  </div>
                  <p className="text-sm font-semibold text-red-600">{formatCurrency(item.valor)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-700">
            <strong>Como usar:</strong> Copie o texto da notificação do Itaú (pressione e segure), 
            volte aqui e cole. O sistema identifica automaticamente o estabelecimento, valor e categoria.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
