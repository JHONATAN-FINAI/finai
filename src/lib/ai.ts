// Módulo de Integração com IA (Claude/OpenAI)
// Funções para análise, chat, categorização e recomendações

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

interface AIResponse {
  success: boolean
  content: string
  data?: any
  error?: string
}

// ============================================
// CLIENTE BASE
// ============================================

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 2000
): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  
  if (!apiKey) {
    // Fallback para resposta sem IA
    return {
      success: false,
      content: '',
      error: 'API key não configurada'
    }
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.content[0]?.text || ''

    return {
      success: true,
      content
    }
  } catch (error) {
    console.error('Erro ao chamar Claude:', error)
    return {
      success: false,
      content: '',
      error: String(error)
    }
  }
}

// ============================================
// 1. DETECÇÃO DE PADRÕES DE GASTOS
// ============================================

export async function detectPatterns(
  transactions: any[],
  expenses: any[],
  incomes: any[]
): Promise<AIResponse> {
  const systemPrompt = `Você é um analista financeiro especializado em finanças pessoais brasileiras.
Analise os dados financeiros e identifique padrões de comportamento.

IMPORTANTE:
- Seja específico com valores e percentuais
- Use linguagem simples e direta
- Foque em insights acionáveis
- Responda em português brasileiro

Retorne um JSON com a estrutura:
{
  "patterns": [
    {
      "type": "GASTO_RECORRENTE|AUMENTO|SAZONALIDADE|ANOMALIA",
      "title": "Título curto do padrão",
      "description": "Descrição detalhada",
      "importance": "ALTA|MEDIA|BAIXA",
      "suggestion": "O que fazer"
    }
  ],
  "summary": "Resumo geral em 2-3 frases"
}`

  const userMessage = `Analise estes dados financeiros e identifique padrões:

TRANSAÇÕES DO MÊS:
${JSON.stringify(transactions.slice(0, 50), null, 2)}

DESPESAS CADASTRADAS:
${JSON.stringify(expenses, null, 2)}

RECEITAS:
${JSON.stringify(incomes, null, 2)}

Identifique:
1. Gastos que parecem recorrentes mas não estão cadastrados como fixos
2. Categorias com aumento significativo
3. Padrões por dia da semana ou período do mês
4. Anomalias ou gastos fora do padrão`

  const response = await callClaude(systemPrompt, userMessage)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        response.data = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      // Se não conseguir parsear, mantém o content como texto
    }
  }

  return response
}

// ============================================
// 2. PREVISÃO DE PROBLEMAS
// ============================================

export async function predictProblems(
  transactions: any[],
  plan: any,
  daysRemaining: number
): Promise<AIResponse> {
  const systemPrompt = `Você é um consultor financeiro que ajuda a prever problemas no orçamento.
Analise os gastos atuais vs orçamento planejado e preveja se haverá estouro.

Retorne um JSON:
{
  "predictions": [
    {
      "category": "Nome da categoria",
      "currentSpent": 0,
      "budget": 0,
      "projectedSpent": 0,
      "willExceed": true/false,
      "exceedAmount": 0,
      "riskLevel": "ALTO|MEDIO|BAIXO",
      "suggestion": "O que fazer para evitar"
    }
  ],
  "overallRisk": "ALTO|MEDIO|BAIXO",
  "alertMessage": "Mensagem de alerta principal"
}`

  const userMessage = `Analise a situação atual do orçamento:

GASTOS DO MÊS ATÉ AGORA:
${JSON.stringify(transactions, null, 2)}

ORÇAMENTO PLANEJADO:
${JSON.stringify(plan, null, 2)}

DIAS RESTANTES NO MÊS: ${daysRemaining}

Projete os gastos até o fim do mês baseado no ritmo atual e identifique categorias em risco.`

  const response = await callClaude(systemPrompt, userMessage)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        response.data = JSON.parse(jsonMatch[0])
      }
    } catch (e) {}
  }

  return response
}

// ============================================
// 3. CHAT FINANCEIRO
// ============================================

export async function chatWithAI(
  message: string,
  context: {
    userName: string
    financialSummary: any
    recentTransactions: any[]
    goals: any[]
    chatHistory: { role: string; content: string }[]
  }
): Promise<AIResponse> {
  const systemPrompt = `Você é um assistente financeiro pessoal chamado FinAI.
Você ajuda ${context.userName} a gerenciar suas finanças.

PERSONALIDADE:
- Amigável mas profissional
- Direto ao ponto
- Usa dados concretos nas respostas
- Motiva sem ser piegas
- Fala português brasileiro natural

SITUAÇÃO FINANCEIRA ATUAL:
${JSON.stringify(context.financialSummary, null, 2)}

TRANSAÇÕES RECENTES:
${JSON.stringify(context.recentTransactions.slice(0, 20), null, 2)}

METAS:
${JSON.stringify(context.goals, null, 2)}

REGRAS:
- Sempre use os dados reais do usuário
- Nunca invente números
- Se não souber, diga que não tem essa informação
- Para perguntas sobre gastos, consulte as transações
- Sugira ações práticas quando apropriado
- Use emojis com moderação`

  // Construir histórico de mensagens
  const messages = context.chatHistory.slice(-10).map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content
  }))
  messages.push({ role: 'user', content: message })

  const apiKey = process.env.ANTHROPIC_API_KEY
  
  if (!apiKey) {
    return {
      success: false,
      content: 'Desculpe, o assistente de IA não está configurado. Configure a ANTHROPIC_API_KEY no arquivo .env',
      error: 'API key não configurada'
    }
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      success: true,
      content: data.content[0]?.text || 'Desculpe, não consegui processar sua mensagem.'
    }
  } catch (error) {
    return {
      success: false,
      content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
      error: String(error)
    }
  }
}

// ============================================
// 4. COACHING FINANCEIRO
// ============================================

export async function getCoachingSession(
  financialData: any,
  lastSession: Date | null,
  currentChallenges: any[]
): Promise<AIResponse> {
  const systemPrompt = `Você é um coach financeiro pessoal experiente.
Conduza uma sessão de coaching motivacional mas realista.

ESTILO:
- Comece reconhecendo esforços ou dificuldades
- Seja honesto sobre a situação
- Dê 2-3 ações práticas
- Termine com motivação genuína
- Não seja genérico, use os dados reais

Retorne um JSON:
{
  "greeting": "Saudação personalizada",
  "situationAnalysis": "Análise breve da situação",
  "wins": ["Vitórias para celebrar"],
  "challenges": ["Desafios a enfrentar"],
  "actionItems": [
    {
      "action": "Ação específica",
      "why": "Por que isso ajuda",
      "deadline": "Prazo sugerido"
    }
  ],
  "motivation": "Mensagem motivacional final",
  "nextCheckIn": "Quando fazer próximo check-in"
}`

  const userMessage = `Dados financeiros:
${JSON.stringify(financialData, null, 2)}

Última sessão: ${lastSession ? lastSession.toLocaleDateString('pt-BR') : 'Primeira sessão'}

Desafios ativos:
${JSON.stringify(currentChallenges, null, 2)}

Conduza uma sessão de coaching considerando o contexto.`

  const response = await callClaude(systemPrompt, userMessage, 2500)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        response.data = JSON.parse(jsonMatch[0])
      }
    } catch (e) {}
  }

  return response
}

// ============================================
// 5. CATEGORIZAÇÃO AUTOMÁTICA
// ============================================

export async function categorizeTransaction(
  description: string,
  amount: number,
  categories: { id: string; name: string; type: string }[]
): Promise<AIResponse> {
  const systemPrompt = `Você categoriza transações financeiras.
Analise a descrição e valor para determinar a categoria mais apropriada.

Categorias disponíveis:
${categories.map(c => `- ${c.name} (${c.type})`).join('\n')}

Retorne APENAS um JSON:
{
  "categoryName": "Nome exato da categoria",
  "confidence": 0.0-1.0,
  "reasoning": "Por que esta categoria"
}`

  const userMessage = `Transação: "${description}"
Valor: R$ ${amount.toFixed(2)}

Qual a categoria mais apropriada?`

  const response = await callClaude(systemPrompt, userMessage, 500)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0])
        const category = categories.find(c => 
          c.name.toLowerCase() === data.categoryName?.toLowerCase()
        )
        response.data = {
          ...data,
          categoryId: category?.id
        }
      }
    } catch (e) {}
  }

  return response
}

// ============================================
// 7. PLANO DE AÇÃO PERSONALIZADO
// ============================================

export async function generateActionPlan(
  goal: string,
  financialData: any,
  timeframe: string
): Promise<AIResponse> {
  const systemPrompt = `Você é um planejador financeiro que cria planos de ação detalhados.
Crie um plano realista baseado na situação financeira real do usuário.

IMPORTANTE:
- Use apenas os números reais fornecidos
- Seja específico com valores e datas
- Considere a capacidade real de poupança
- Divida em etapas claras

Retorne JSON:
{
  "goalSummary": "Resumo do objetivo",
  "totalNeeded": 0,
  "monthlyRequired": 0,
  "isAchievable": true/false,
  "feasibilityNote": "Se não for viável, explique e sugira alternativas",
  "steps": [
    {
      "month": 1,
      "action": "O que fazer",
      "savingsTarget": 0,
      "cumulativeTotal": 0,
      "tips": ["Dicas práticas"]
    }
  ],
  "sacrifices": ["O que precisará abrir mão"],
  "risks": ["Riscos do plano"],
  "alternatives": ["Planos alternativos se necessário"]
}`

  const userMessage = `OBJETIVO: ${goal}
PRAZO DESEJADO: ${timeframe}

SITUAÇÃO FINANCEIRA:
${JSON.stringify(financialData, null, 2)}

Crie um plano de ação detalhado e realista.`

  const response = await callClaude(systemPrompt, userMessage, 3000)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        response.data = JSON.parse(jsonMatch[0])
      }
    } catch (e) {}
  }

  return response
}

// ============================================
// 8. SIMULAÇÕES INTELIGENTES
// ============================================

export async function runSimulation(
  scenario: string,
  financialData: any
): Promise<AIResponse> {
  const systemPrompt = `Você é um simulador financeiro que analisa cenários hipotéticos.
Calcule o impacto de mudanças na situação financeira.

Retorne JSON:
{
  "scenario": "Descrição do cenário",
  "currentSituation": {
    "monthlyBalance": 0,
    "savingsRate": 0,
    "debtPayoffMonths": 0
  },
  "projectedSituation": {
    "monthlyBalance": 0,
    "savingsRate": 0,
    "debtPayoffMonths": 0
  },
  "impact": {
    "monthlyDifference": 0,
    "annualDifference": 0,
    "timeToGoal": "X meses a mais/menos"
  },
  "analysis": "Análise detalhada do impacto",
  "recommendation": "Vale a pena ou não e por quê",
  "considerations": ["Pontos a considerar"]
}`

  const userMessage = `CENÁRIO PARA SIMULAR: ${scenario}

SITUAÇÃO FINANCEIRA ATUAL:
${JSON.stringify(financialData, null, 2)}

Simule o impacto deste cenário.`

  const response = await callClaude(systemPrompt, userMessage, 2000)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        response.data = JSON.parse(jsonMatch[0])
      }
    } catch (e) {}
  }

  return response
}

// ============================================
// 9. RELATÓRIO MENSAL NARRADO
// ============================================

export async function generateMonthlyReport(
  month: string,
  financialData: any,
  transactions: any[],
  previousMonth: any | null
): Promise<AIResponse> {
  const systemPrompt = `Você é um consultor financeiro escrevendo um relatório mensal personalizado.
Escreva como se fosse uma carta pessoal de um consultor de confiança.

ESTILO:
- Tom profissional mas acessível
- Use os dados reais, cite valores específicos
- Compare com mês anterior se disponível
- Destaque conquistas e alertas
- Termine com próximos passos claros

Retorne JSON:
{
  "title": "Título do relatório",
  "greeting": "Saudação",
  "executiveSummary": "Resumo em 2-3 parágrafos",
  "highlights": {
    "positive": ["Pontos positivos"],
    "negative": ["Pontos de atenção"],
    "neutral": ["Observações"]
  },
  "categoryAnalysis": [
    {
      "category": "Nome",
      "spent": 0,
      "budget": 0,
      "analysis": "Análise específica"
    }
  ],
  "comparison": {
    "vsLastMonth": "Comparação com mês anterior",
    "trend": "MELHORANDO|ESTAVEL|PIORANDO"
  },
  "recommendations": [
    {
      "priority": "ALTA|MEDIA|BAIXA",
      "action": "O que fazer",
      "expectedImpact": "Resultado esperado"
    }
  ],
  "closingMessage": "Mensagem final motivacional",
  "grade": "A|B|C|D|F",
  "gradeExplanation": "Por que essa nota"
}`

  const userMessage = `MÊS: ${month}

DADOS DO MÊS:
${JSON.stringify(financialData, null, 2)}

TRANSAÇÕES:
${JSON.stringify(transactions, null, 2)}

MÊS ANTERIOR (para comparação):
${previousMonth ? JSON.stringify(previousMonth, null, 2) : 'Não disponível'}

Gere um relatório mensal completo e personalizado.`

  const response = await callClaude(systemPrompt, userMessage, 4000)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        response.data = JSON.parse(jsonMatch[0])
      }
    } catch (e) {}
  }

  return response
}

// ============================================
// 11. DEFINIÇÃO DE METAS COM IA
// ============================================

export async function defineGoalWithAI(
  goalDescription: string,
  financialData: any
): Promise<AIResponse> {
  const systemPrompt = `Você ajuda a definir metas financeiras SMART.
Transforme desejos vagos em metas específicas, mensuráveis e realistas.

Retorne JSON:
{
  "originalGoal": "O que o usuário pediu",
  "smartGoal": {
    "specific": "Objetivo específico",
    "measurable": "Como medir (valor exato)",
    "achievable": "Por que é alcançável",
    "relevant": "Por que é importante",
    "timeBound": "Prazo definido"
  },
  "title": "Título curto para a meta",
  "targetAmount": 0,
  "suggestedDeadline": "YYYY-MM-DD",
  "monthlyContribution": 0,
  "priority": "ALTA|MEDIA|BAIXA",
  "milestones": [
    {
      "percentage": 25,
      "amount": 0,
      "celebration": "Como celebrar"
    }
  ],
  "potentialObstacles": ["Obstáculos"],
  "strategies": ["Estratégias para alcançar"],
  "isRealistic": true/false,
  "realismNote": "Explicação sobre viabilidade"
}`

  const userMessage = `META DESEJADA: "${goalDescription}"

SITUAÇÃO FINANCEIRA:
${JSON.stringify(financialData, null, 2)}

Ajude a transformar isso em uma meta SMART.`

  const response = await callClaude(systemPrompt, userMessage, 2500)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        response.data = JSON.parse(jsonMatch[0])
      }
    } catch (e) {}
  }

  return response
}

// ============================================
// 12. DESAFIOS PERSONALIZADOS
// ============================================

export async function generateChallenge(
  financialData: any,
  previousChallenges: any[],
  preferences: { difficulty: string; focus: string }
): Promise<AIResponse> {
  const systemPrompt = `Você cria desafios financeiros personalizados e engajantes.
Os desafios devem ser específicos, mensuráveis e motivadores.

TIPOS:
- ECONOMIA: Reduzir gastos em área específica
- CONTROLE: Melhorar hábitos de registro/controle
- HABITO: Desenvolver novos hábitos financeiros

Retorne JSON:
{
  "challenge": {
    "title": "Título chamativo",
    "description": "Descrição clara do desafio",
    "type": "ECONOMIA|CONTROLE|HABITO",
    "duration": 7, // dias
    "targetValue": 0, // se aplicável
    "rules": ["Regras do desafio"],
    "tips": ["Dicas para completar"],
    "reward": "Recompensa sugerida (não monetária)"
  },
  "whyThisChallenge": "Por que este desafio é bom para você agora",
  "expectedBenefit": "Benefício esperado em R$ ou %",
  "difficulty": "FACIL|MEDIO|DIFICIL"
}`

  const userMessage = `SITUAÇÃO FINANCEIRA:
${JSON.stringify(financialData, null, 2)}

DESAFIOS ANTERIORES:
${JSON.stringify(previousChallenges, null, 2)}

PREFERÊNCIAS:
- Dificuldade: ${preferences.difficulty}
- Foco: ${preferences.focus}

Crie um desafio personalizado.`

  const response = await callClaude(systemPrompt, userMessage, 1500)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        response.data = JSON.parse(jsonMatch[0])
      }
    } catch (e) {}
  }

  return response
}

// ============================================
// 13. ANÁLISE DE INVESTIMENTOS
// ============================================

export async function analyzeInvestments(
  availableAmount: number,
  financialData: any,
  riskProfile: string,
  goals: any[]
): Promise<AIResponse> {
  const systemPrompt = `Você é um consultor de investimentos para iniciantes brasileiros.
Sugira alocações simples e educativas. NÃO recomende produtos específicos, apenas classes de ativos.

IMPORTANTE:
- Priorize reserva de emergência primeiro
- Seja conservador nas sugestões
- Explique de forma simples
- Mencione que é educacional, não recomendação formal

Retorne JSON:
{
  "readinessAnalysis": {
    "hasEmergencyFund": true/false,
    "emergencyFundStatus": "Situação da reserva",
    "isReadyToInvest": true/false,
    "reason": "Explicação"
  },
  "suggestedAllocation": [
    {
      "assetClass": "Classe de ativo",
      "percentage": 0,
      "amount": 0,
      "why": "Por que esta alocação",
      "examples": ["Exemplos de produtos (educacional)"],
      "risk": "BAIXO|MEDIO|ALTO"
    }
  ],
  "priorityOrder": ["Ordem de prioridade para aportes"],
  "warnings": ["Avisos importantes"],
  "educationalNotes": ["Conceitos para estudar"],
  "disclaimer": "Aviso legal"
}`

  const userMessage = `VALOR DISPONÍVEL PARA INVESTIR: R$ ${availableAmount.toFixed(2)}

SITUAÇÃO FINANCEIRA:
${JSON.stringify(financialData, null, 2)}

PERFIL DE RISCO DECLARADO: ${riskProfile}

METAS:
${JSON.stringify(goals, null, 2)}

Sugira uma alocação educacional.`

  const response = await callClaude(systemPrompt, userMessage, 2500)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        response.data = JSON.parse(jsonMatch[0])
      }
    } catch (e) {}
  }

  return response
}

// ============================================
// 14. GERAÇÃO DE ALERTAS INTELIGENTES
// ============================================

export async function generateSmartAlerts(
  financialData: any,
  transactions: any[],
  existingAlerts: any[]
): Promise<AIResponse> {
  const systemPrompt = `Você analisa dados financeiros e sugere alertas inteligentes.
Identifique situações que merecem notificação do usuário.

TIPOS DE ALERTA:
- ORCAMENTO: Categoria perto do limite
- VENCIMENTO: Contas a vencer
- META: Progresso de metas
- PADRAO: Padrões incomuns detectados
- OPORTUNIDADE: Chance de economizar

Retorne JSON:
{
  "immediateAlerts": [
    {
      "type": "TIPO",
      "priority": "ALTA|MEDIA|BAIXA",
      "title": "Título curto",
      "message": "Mensagem completa",
      "action": "Ação sugerida",
      "data": {}
    }
  ],
  "suggestedRecurringAlerts": [
    {
      "type": "TIPO",
      "title": "Título",
      "description": "Quando disparar",
      "threshold": 0,
      "categoryId": null
    }
  ],
  "insights": ["Insights sobre a situação atual"]
}`

  const userMessage = `DADOS FINANCEIROS:
${JSON.stringify(financialData, null, 2)}

TRANSAÇÕES RECENTES:
${JSON.stringify(transactions.slice(0, 30), null, 2)}

ALERTAS JÁ CONFIGURADOS:
${JSON.stringify(existingAlerts, null, 2)}

Analise e sugira alertas relevantes.`

  const response = await callClaude(systemPrompt, userMessage, 2000)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        response.data = JSON.parse(jsonMatch[0])
      }
    } catch (e) {}
  }

  return response
}

// ============================================
// CLASSIFICAÇÃO AUTOMÁTICA DE DESPESAS
// ============================================

export async function classifyExpense(
  description: string,
  amount: number,
  categories: { id: string; name: string; type: string }[]
): Promise<AIResponse> {
  const systemPrompt = `Você é um especialista em finanças pessoais brasileiras.
Classifique a despesa informada determinando:
1. Se é FIXA (valor previsível todo mês) ou VARIÁVEL (muda conforme uso)
2. Qual categoria se enquadra
3. Recorrência (MENSAL, QUINZENAL, SEMANAL, UNICO)

REGRAS DE CLASSIFICAÇÃO:
- FIXA: aluguel, financiamento, plano de saúde, escola, internet, streaming, seguro, parcela fixa
- VARIÁVEL: supermercado, combustível, lazer, restaurantes, farmácia, compras diversas

Categorias disponíveis:
${categories.map(c => `- ${c.name} (${c.type})`).join('\n')}

Retorne APENAS um JSON:
{
  "categoryName": "Nome exato da categoria",
  "expenseType": "FIXA ou VARIAVEL",
  "recurrenceType": "MENSAL|QUINZENAL|SEMANAL|UNICO",
  "confidence": 0.0-1.0,
  "reasoning": "Explicação breve"
}`

  const userMessage = `Despesa: "${description}"
Valor: R$ ${amount.toFixed(2)}

Classifique esta despesa.`

  const response = await callClaude(systemPrompt, userMessage, 500)
  
  if (response.success) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0])
        const category = categories.find(c => 
          c.name.toLowerCase() === data.categoryName?.toLowerCase()
        )
        response.data = {
          ...data,
          categoryId: category?.id
        }
      }
    } catch (e) {}
  }

  return response
}

// ============================================
// FALLBACKS (quando IA não disponível)
// ============================================

export function getFallbackCategorization(description: string): string {
  const desc = description.toLowerCase()
  
  if (desc.includes('ifood') || desc.includes('uber eats') || desc.includes('rappi') || desc.includes('delivery')) {
    return 'Alimentação'
  }
  if (desc.includes('uber') || desc.includes('99') || desc.includes('cabify') || desc.includes('combustivel') || desc.includes('gasolina')) {
    return 'Transporte'
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('disney') || desc.includes('hbo') || desc.includes('amazon prime') || desc.includes('youtube')) {
    return 'Assinaturas'
  }
  if (desc.includes('mercado') || desc.includes('supermercado') || desc.includes('hortifruti') || desc.includes('açougue')) {
    return 'Alimentação'
  }
  if (desc.includes('farmacia') || desc.includes('drogaria') || desc.includes('medic') || desc.includes('consulta') || desc.includes('plano de saude') || desc.includes('unimed')) {
    return 'Saúde'
  }
  if (desc.includes('restaurante') || desc.includes('lanchonete') || desc.includes('bar') || desc.includes('cafe') || desc.includes('pizzaria')) {
    return 'Restaurantes'
  }
  if (desc.includes('aluguel') || desc.includes('condominio') || desc.includes('iptu') || desc.includes('financiamento') || desc.includes('prestação')) {
    return 'Moradia'
  }
  if (desc.includes('luz') || desc.includes('energia') || desc.includes('agua') || desc.includes('gas') || desc.includes('internet') || desc.includes('telefone') || desc.includes('celular')) {
    return 'Serviços Essenciais'
  }
  if (desc.includes('escola') || desc.includes('faculdade') || desc.includes('curso') || desc.includes('mensalidade') || desc.includes('material escolar')) {
    return 'Educação'
  }
  if (desc.includes('cinema') || desc.includes('show') || desc.includes('ingresso') || desc.includes('viagem') || desc.includes('passeio')) {
    return 'Lazer'
  }
  if (desc.includes('roupa') || desc.includes('sapato') || desc.includes('shopping') || desc.includes('loja')) {
    return 'Compras'
  }
  
  return 'Outros'
}

export function getFallbackExpenseType(description: string): 'FIXA' | 'VARIAVEL' {
  const desc = description.toLowerCase()
  
  // Despesas tipicamente FIXAS
  const fixedKeywords = [
    'aluguel', 'financiamento', 'prestação', 'parcela',
    'condominio', 'iptu', 'seguro',
    'plano de saude', 'unimed', 'bradesco saude',
    'escola', 'faculdade', 'mensalidade',
    'internet', 'telefone', 'celular',
    'netflix', 'spotify', 'disney', 'hbo', 'amazon prime', 'youtube premium',
    'academia', 'clube',
    'pensão', 'pensao'
  ]
  
  for (const keyword of fixedKeywords) {
    if (desc.includes(keyword)) {
      return 'FIXA'
    }
  }
  
  // Despesas tipicamente VARIÁVEIS
  return 'VARIAVEL'
}
