"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { Send, Bot, User, Sparkles, TrendingUp, AlertTriangle, Target, Loader2, RefreshCw, MessageSquare, Lightbulb, Trophy, Zap } from "lucide-react"

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

  useEffect(() => { if (status === "unauthenticated") router.push("/") }, [status, router])

  useEffect(() => {
    if (status === "authenticated") { loadMessages(); loadPatterns(); loadPredictions() }
  }, [status])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const loadMessages = async () => { try { const res = await fetch("/api/ai/chat"); const data = await res.json(); setMessages(data.messages || []) } catch (e) { console.error(e) } }
  const loadPatterns = async () => { try { const res = await fetch("/api/ai/patterns"); const data = await res.json(); setPatterns(data.patterns || []) } catch (e) { console.error(e) } }
  const loadPredictions = async () => { try { const res = await fetch("/api/ai/predict"); const data = await res.json(); setPredictions(data) } catch (e) { console.error(e) } }

  const loadCoaching = async () => {
    setLoadingCoaching(true)
    try { const res = await fetch("/api/ai/coaching"); const data = await res.json(); setCoaching(data.session) } catch (e) { console.error(e) }
    setLoadingCoaching(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput("")
    setLoading(true)

    const tempUserMsg: Message = { id: Date.now().toString(), role: 'user', content: userMessage, createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMessage }) })
      const data = await res.json()
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.message, createdAt: new Date().toISOString() }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const quickQuestions = ["Quanto gastei este mês?", "Como está meu orçamento?", "Onde posso economizar?", "Qual minha situação financeira?"]

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assistente Financeiro</h1>
          <p className="text-gray-500">Converse com a IA sobre suas finanças</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'coaching', label: 'Coaching', icon: Target },
            { id: 'insights', label: 'Insights', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); if (tab.id === 'coaching' && !coaching) loadCoaching() }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-gray-900 shadow-sm font-medium' 
                    : 'text-gray-500 hover:text-gray-700'
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400 via-pink-400 to-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Olá! Sou seu assistente financeiro</h3>
                  <p className="text-gray-500 mb-8">Pergunte qualquer coisa sobre suas finanças pessoais</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {quickQuestions.map((q, i) => (
                      <button key={i} onClick={() => setInput(q)} className="px-4 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 text-sm font-medium rounded-xl hover:shadow-md transition-all">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[70%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-100 text-gray-900'}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-gray-100 p-4 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Digite sua pergunta..."
                  className="flex-1 px-5 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
                <button onClick={sendMessage} disabled={loading || !input.trim()} className="px-5 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coaching Tab */}
        {activeTab === 'coaching' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Sessão de Coaching</h2>
              </div>
              <button onClick={loadCoaching} disabled={loadingCoaching} className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                <RefreshCw className={`w-4 h-4 ${loadingCoaching ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {loadingCoaching ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Preparando sua sessão de coaching...</p>
              </div>
            ) : coaching ? (
              <div className="space-y-6">
                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <p className="text-lg text-gray-900">{coaching.greeting}</p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Análise da Situação</h3>
                  <p className="text-gray-600 leading-relaxed">{coaching.situationAnalysis}</p>
                </div>

                {coaching.wins?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-emerald-600">Vitórias</h3>
                    </div>
                    <div className="space-y-2">
                      {coaching.wins.map((win: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                          <span className="text-gray-700">{win}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {coaching.challenges?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-5 h-5 text-amber-600" />
                      <h3 className="font-bold text-amber-600">Desafios</h3>
                    </div>
                    <div className="space-y-2">
                      {coaching.challenges.map((challenge: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{challenge}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {coaching.actionItems?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-blue-600">Plano de Ação</h3>
                    </div>
                    <div className="space-y-3">
                      {coaching.actionItems.map((item: any, i: number) => (
                        <div key={i} className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                          <p className="font-medium text-gray-900">{item.action}</p>
                          <p className="text-sm text-gray-500 mt-1">{item.why}</p>
                          {item.deadline && (
                            <span className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">Prazo: {item.deadline}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                  <p className="text-purple-900 font-medium">{coaching.motivation}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500">Clique em "Atualizar" para iniciar uma sessão de coaching</p>
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            {predictions && predictions.alertMessage && (
              <div className={`p-6 rounded-2xl border ${
                predictions.overallRisk === 'ALTO' ? 'bg-red-50 border-red-200' :
                predictions.overallRisk === 'MEDIO' ? 'bg-amber-50 border-amber-200' :
                'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    predictions.overallRisk === 'ALTO' ? 'bg-red-500' :
                    predictions.overallRisk === 'MEDIO' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}>
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Previsão do Mês</h3>
                    <p className="text-gray-700">{predictions.alertMessage}</p>
                    <p className="text-sm text-gray-500 mt-2">{predictions.daysRemaining} dias restantes no mês</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Padrões Detectados</h2>
                </div>
                <button onClick={loadPatterns} className="text-orange-600 text-sm font-medium hover:underline">Atualizar</button>
              </div>

              {patterns.length > 0 ? (
                <div className="space-y-4">
                  {patterns.map((pattern, i) => (
                    <div key={i} className={`p-4 rounded-xl border-l-4 ${
                      pattern.importance === 'ALTA' ? 'border-red-500 bg-red-50' :
                      pattern.importance === 'MEDIA' ? 'border-amber-500 bg-amber-50' :
                      'border-blue-500 bg-blue-50'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          pattern.type === 'ANOMALIA' ? 'bg-red-200 text-red-700' :
                          pattern.type === 'AUMENTO' ? 'bg-orange-200 text-orange-700' : 'bg-blue-200 text-blue-700'
                        }`}>
                          {pattern.type}
                        </span>
                        <span className="font-semibold text-gray-900">{pattern.title}</span>
                      </div>
                      <p className="text-sm text-gray-600">{pattern.description}</p>
                      {pattern.suggestion && (
                        <div className="flex items-start gap-2 mt-3 p-3 bg-white/60 rounded-lg">
                          <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{pattern.suggestion}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500">Nenhum padrão detectado ainda. Continue registrando suas transações.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
