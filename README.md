# FinAI - Sistema de Gestão Financeira Pessoal com IA

Sistema completo de controle financeiro pessoal com análise inteligente usando IA (Claude).

## Funcionalidades

### Core
- Diagnóstico financeiro completo (wizard 4 etapas)
- Análise automática com DRE pessoal e indicadores
- Planejamento 50/30/20 ajustável
- Controle de gastos diários com alertas visuais
- Relatórios completos com exportação CSV

### Inteligência Artificial
- **Assistente Financeiro**: Chat conversacional sobre suas finanças
- **Coaching**: Sessões de coaching com análise e plano de ação
- **Detecção de Padrões**: Identifica comportamentos de gastos
- **Previsão de Problemas**: Alerta antes de estourar orçamento
- **Categorização Automática**: IA categoriza gastos automaticamente
- **Metas com IA**: Define metas SMART com plano personalizado
- **Simulador**: Simula cenários financeiros (aumento, cortes, etc)
- **Análise de Investimentos**: Sugestões educacionais de alocação
- **Alertas Inteligentes**: Alertas personalizados por IA

## Tecnologias

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL (Neon)
- Prisma ORM
- NextAuth.js
- Claude API (Anthropic)

## Instalação

### 1. Pré-requisitos
- Node.js 18+
- Conta no Neon (https://neon.tech)
- API Key da Anthropic (https://console.anthropic.com)

### 2. Configurar banco de dados
1. Crie um projeto no Neon
2. Copie a connection string

### 3. Configurar variáveis de ambiente
Crie arquivo `.env`:
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="gere-uma-chave-secreta"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."
```

### 4. Instalar e rodar
```bash
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js
npm run dev
```

### 5. Acessar
http://localhost:3000

## Estrutura

```
/src
  /app
    /api           # APIs REST
      /ai          # Endpoints de IA
    /assistente    # Chat e coaching
    /dashboard     # Visão geral
    /diagnostico   # Wizard inicial
    /gastos        # Controle diário
    /metas         # Metas financeiras
    /planejamento  # Orçamento 50/30/20
    /relatorio     # Análise pós-diagnóstico
    /relatorios    # DRE e indicadores
    /simulador     # Simulações
    /investimentos # Análise de investimentos
    /alertas       # Alertas inteligentes
  /components      # Componentes React
  /lib             # Utilitários e módulos
    analysis.ts    # Análise financeira
    ai.ts          # Integração com Claude
```

## Uso da IA

O sistema usa Claude (Anthropic) para:
- Responder perguntas sobre finanças
- Analisar padrões de gastos
- Gerar relatórios narrados
- Criar planos personalizados
- Sugerir categorias para transações

Para funcionar, é necessário configurar `ANTHROPIC_API_KEY` no `.env`.

Sem a API key, o sistema funciona com fallbacks (regras heurísticas).

## Licença

MIT
