"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  Loader2,
  RefreshCw
} from "lucide-react"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export default function AssistentePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingCoaching, setLoadingCoaching] = useState(false)
  const [coaching, setCoaching] = useState<any>(null)
  const [patterns, setPatterns] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'coaching' | 'insights'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      loadMessages()
      loadPatterns()
      loadPredictions()
    }
  }, [status])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMessages = async () => {
    try {
      const res = await fetch("/api/ai/chat")
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error)
    }
  }

  const loadPatterns = async () => {
    try {
      const res = await fetch("/api/ai/patterns")
      const data = await res.json()
      setPatterns(data.patterns || [])
    } catch (error) {
      console.error("Erro ao carregar padrões:", error)
    }
  }

  const loadPredictions = async () => {
    try {
      const res = await fetch("/api/ai/predict")
      const data = await res.json()
      setPredictions(data)
    } catch (error) {
      console.error("Erro ao carregar previsões:", error)
    }
  }

  const loadCoaching = async () => {
    setLoadingCoaching(true)
    try {
      const res = await fetch("/api/ai/coaching")
      const data = await res.json()
      setCoaching(data.session)
    } catch (error) {
      console.error("Erro ao carregar coaching:", error)
    }
    setLoadingCoaching(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")
    setLoading(true)

    // Adicionar mensagem do usuário imediatamente
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      })
      const data = await res.json()

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        createdAt: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
    }
    setLoading(false)
  }

  const quickQuestions = [
    "Quanto gastei este mês?",
    "Como está meu orçamento?",
    "Onde posso economizar?",
    "Qual minha situação financeira?"
  ]

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Assistente Financeiro</h1>
          <p className="text-gray-500">Converse com a IA sobre suas finanças</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'chat', label: 'Chat', icon: Bot },
            { id: 'coaching', label: 'Coaching', icon: Target },
            { id: 'insights', label: 'Insights', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  if (tab.id === 'coaching' && !coaching) loadCoaching()
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 text-blue-200 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Olá! Sou seu assistente financeiro</h3>
                  <p className="text-gray-500 mb-6">Pergunte qualquer coisa sobre suas finanças</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {quickQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(q)}
                        className="px-3 py-2 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="bg-gray-100 p-4 rounded-2xl">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Digite sua pergunta..."
                  className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coaching Tab */}
        {activeTab === 'coaching' && (
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Sessão de Coaching</h2>
              <button
                onClick={loadCoaching}
                disabled={loadingCoaching}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCoaching ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {loadingCoaching ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-gray-500 mt-4">Preparando sua sessão de coaching...</p>
              </div>
            ) : coaching ? (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-lg text-gray-900">{coaching.greeting}</p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Análise da Situação</h3>
                  <p className="text-gray-600">{coaching.situationAnalysis}</p>
                </div>

                {coaching.wins?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-green-600 mb-2">🎉 Vitórias</h3>
                    <ul className="space-y-2">
                      {coaching.wins.map((win: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                          <span className="text-green-500">✓</span>
                          <span className="text-gray-700">{win}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {coaching.challenges?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-orange-600 mb-2">⚡ Desafios</h3>
                    <ul className="space-y-2">
                      {coaching.challenges.map((challenge: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                          <span className="text-gray-700">{challenge}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {coaching.actionItems?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-blue-600 mb-2">📋 Plano de Ação</h3>
                    <div className="space-y-3">
                      {coaching.actionItems.map((item: any, i: number) => (
                        <div key={i} className="p-4 border rounded-xl">
                          <p className="font-medium text-gray-900">{item.action}</p>
                          <p className="text-sm text-gray-500 mt-1">{item.why}</p>
                          {item.deadline && (
                            <p className="text-xs text-blue-600 mt-2">Prazo: {item.deadline}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-purple-900 font-medium">{coaching.motivation}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500">Clique em "Atualizar" para iniciar uma sessão de coaching</p>
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            {/* Previsões */}
            {predictions && predictions.alertMessage && (
              <div className={`p-6 rounded-2xl ${
                predictions.overallRisk === 'ALTO' ? 'bg-red-50 border border-red-200' :
                predictions.overallRisk === 'MEDIO' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${
                    predictions.overallRisk === 'ALTO' ? 'text-red-500' :
                    predictions.overallRisk === 'MEDIO' ? 'text-yellow-500' :
                    'text-green-500'
                  }`} />
                  <div>
                    <h3 className="font-bold text-gray-900">Previsão do Mês</h3>
                    <p className="text-gray-700 mt-1">{predictions.alertMessage}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {predictions.daysRemaining} dias restantes no mês
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Padrões Detectados */}
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Padrões Detectados</h2>
                <button
                  onClick={loadPatterns}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Atualizar
                </button>
              </div>

              {patterns.length > 0 ? (
                <div className="space-y-4">
                  {patterns.map((pattern, i) => (
                    <div key={i} className={`p-4 rounded-xl border-l-4 ${
                      pattern.importance === 'ALTA' ? 'border-red-500 bg-red-50' :
                      pattern.importance === 'MEDIA' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          pattern.type === 'ANOMALIA' ? 'bg-red-200 text-red-700' :
                          pattern.type === 'AUMENTO' ? 'bg-orange-200 text-orange-700' :
                          'bg-blue-200 text-blue-700'
                        }`}>
                          {pattern.type}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{pattern.title}</span>
                      </div>
                      <p className="text-sm text-gray-600">{pattern.description}</p>
                      {pattern.suggestion && (
                        <p className="text-sm text-blue-600 mt-2">💡 {pattern.suggestion}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Nenhum padrão detectado ainda. Continue registrando suas transações.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
