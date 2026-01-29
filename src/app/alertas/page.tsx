"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { 
  Bell, 
  Plus, 
  Trash2, 
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle,
  X
} from "lucide-react"

interface Alert {
  id: string
  type: string
  title: string
  message: string
  threshold: number | null
  isActive: boolean
  channel: string
}

export default function AlertasPage() {
  const { status } = useSession()
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [aiAlerts, setAiAlerts] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [newAlert, setNewAlert] = useState({
    type: 'ORCAMENTO',
    title: '',
    message: '',
    threshold: '',
    channel: 'APP'
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      loadAlerts()
    }
  }, [status])

  const loadAlerts = async () => {
    try {
      const res = await fetch("/api/ai/alerts")
      const data = await res.json()
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error("Erro ao carregar alertas:", error)
    }
    setLoading(false)
  }

  const generateAlerts = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/ai/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generate: true })
      })
      const data = await res.json()
      setAiAlerts(data)
    } catch (error) {
      console.error("Erro ao gerar alertas:", error)
    }
    setGenerating(false)
  }

  const createAlert = async () => {
    if (!newAlert.title || !newAlert.message) return

    try {
      const res = await fetch("/api/ai/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAlert,
          threshold: newAlert.threshold ? parseFloat(newAlert.threshold) : null
        })
      })
      const data = await res.json()
      if (data.alert) {
        setAlerts([data.alert, ...alerts])
        setShowModal(false)
        setNewAlert({ type: 'ORCAMENTO', title: '', message: '', threshold: '', channel: 'APP' })
      }
    } catch (error) {
      console.error("Erro ao criar alerta:", error)
    }
  }

  const deleteAlert = async (id: string) => {
    try {
      await fetch(`/api/ai/alerts?id=${id}`, { method: "DELETE" })
      setAlerts(alerts.filter(a => a.id !== id))
    } catch (error) {
      console.error("Erro ao deletar alerta:", error)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ORCAMENTO': return '💰'
      case 'VENCIMENTO': return '📅'
      case 'META': return '🎯'
      case 'PADRAO': return '📊'
      case 'OPORTUNIDADE': return '💡'
      default: return '🔔'
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alertas Inteligentes</h1>
            <p className="text-gray-500">Configure alertas para suas finanças</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateAlerts}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Sugestões IA
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" /> Novo Alerta
            </button>
          </div>
        </div>

        {/* Alertas da IA */}
        {aiAlerts && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Alertas Sugeridos pela IA
            </h2>

            {aiAlerts.immediateAlerts?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Alertas Imediatos</h3>
                <div className="space-y-2">
                  {aiAlerts.immediateAlerts.map((alert: any, i: number) => (
                    <div key={i} className={`p-4 rounded-xl ${
                      alert.priority === 'ALTA' ? 'bg-red-100' :
                      alert.priority === 'MEDIA' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{alert.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          {alert.action && (
                            <p className="text-sm text-blue-600 mt-2">💡 {alert.action}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          alert.priority === 'ALTA' ? 'bg-red-200 text-red-700' :
                          alert.priority === 'MEDIA' ? 'bg-yellow-200 text-yellow-700' : 'bg-blue-200 text-blue-700'
                        }`}>
                          {alert.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiAlerts.insights?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Insights</h3>
                <ul className="space-y-1">
                  {aiAlerts.insights.map((insight: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-purple-500">•</span> {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setAiAlerts(null)}
              className="mt-4 text-sm text-purple-600 hover:underline"
            >
              Fechar sugestões
            </button>
          </div>
        )}

        {/* Lista de Alertas */}
        <div className="bg-white rounded-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Seus Alertas</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum alerta configurado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getTypeIcon(alert.type)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{alert.title}</p>
                      <p className="text-sm text-gray-500">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{alert.type}</span>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">{alert.channel}</span>
                        {alert.threshold && (
                          <span className="text-xs text-gray-500">Limite: {alert.threshold}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Novo Alerta */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-md bg-white rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Novo Alerta</h2>
                <button onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={newAlert.type}
                    onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl"
                  >
                    <option value="ORCAMENTO">Orçamento</option>
                    <option value="VENCIMENTO">Vencimento</option>
                    <option value="META">Meta</option>
                    <option value="PADRAO">Padrão</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    type="text"
                    value={newAlert.title}
                    onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                    placeholder="Ex: Alerta de orçamento de Lazer"
                    className="w-full px-4 py-3 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                  <textarea
                    value={newAlert.message}
                    onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                    placeholder="Mensagem do alerta"
                    className="w-full px-4 py-3 border rounded-xl resize-none h-20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limite % (opcional)</label>
                  <input
                    type="number"
                    value={newAlert.threshold}
                    onChange={(e) => setNewAlert({ ...newAlert, threshold: e.target.value })}
                    placeholder="Ex: 80"
                    className="w-full px-4 py-3 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Canal</label>
                  <select
                    value={newAlert.channel}
                    onChange={(e) => setNewAlert({ ...newAlert, channel: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl"
                  >
                    <option value="APP">App</option>
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 border rounded-xl hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createAlert}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                  >
                    Criar Alerta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
