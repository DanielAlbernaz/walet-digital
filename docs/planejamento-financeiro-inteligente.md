# Planejamento Financeiro Inteligente — Arquitetura & Design Técnico

> Documento de arquitetura para a nova vertical **Planejamento Financeiro Inteligente** do Wallet Digital.
> Stack alvo: **Angular** (frontend, este repositório) + **Laravel** (backend, repositório separado) + **OpenAI** (camada de IA).
> Versão: 1.0 — Status: Proposta de arquitetura para aprovação.

---

## 1. Princípio arquitetural central (leia primeiro)

A regra que orienta **todo** o resto do documento:

> **Números são determinísticos. A IA é narradora, nunca a fonte dos números.**

- Todo cálculo financeiro (score, percentuais, projeções, snowball/avalanche, simulações, "posso comprar X?") é executado por um **motor determinístico no backend Laravel** — puro, testável, versionado, auditável.
- A camada de IA (OpenAI) recebe **fatos já calculados** (um "dossiê financeiro" em JSON) e produz **linguagem natural**: explica, prioriza, aconselha e responde perguntas. Ela nunca calcula saldo, score ou juros por conta própria.
- Consequência prática: se a OpenAI estiver fora do ar, **o produto continua funcionando** (Diagnóstico, Projeções, Quitação, Metas). A IA é um *enhancement*, não uma dependência crítica.

Isso elimina o maior risco do produto (recomendação financeira errada por alucinação) e torna cada recomendação reproduzível e defensável.

---

## 2. Visão geral da solução

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Angular)                             │
│  Feature lazy-loaded: PlanejamentoModule                              │
│  ┌──────────┬──────────────┬───────────┬───────────────┬───────────┐ │
│  │Diagnóstico│Plano Redução │ Projeções │Quitação Dívidas│  Metas    │ │
│  └──────────┴──────────────┴───────────┴───────────────┴───────────┘ │
│  + Dashboard Executivo  + Chat IA Financeira                          │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │ REST (HttpClient → ApiService)
┌───────────────────────────────▼──────────────────────────────────────┐
│                          BACKEND (Laravel)                            │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  API Layer (Controllers / Resources)                            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  PLANNING DOMAIN (motor determinístico)                          │ │
│  │  • SnapshotService     • ScoringService    • ProjectionService   │ │
│  │  • DiagnosisService    • ReductionService  • DebtStrategyService │ │
│  │  • GoalService         • ClassificationService                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  AI Layer  • FinancialContextBuilder  • OpenAiAdvisorService     │ │
│  │            • Guardrails • Cache • CostGuard                       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Jobs & Events (queue)  • RecomputeSnapshot • RefreshDiagnosis   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  Dados existentes: financial_release, categories, payment_methods,    │
│                    installments, finance_accounts                     │
│  Dados novos:      financial_snapshots, financial_scores,            │
│                    debts, financial_goals, reduction_plans,          │
│                    ai_conversations, ai_messages                      │
└────────────────────────────────────────────────────────────────────────┘
```

### Por que essa separação em "Planning Domain"
Os dados crus (`financial_release`) já existem. Em vez de recalcular agregados a cada request (caro com milhares de usuários), introduzimos **snapshots mensais materializados**. O motor lê snapshots → rápido, histórico pronto para tendências, e desacopla o cálculo da renderização.

---

## 3. Modelo de dados (novas entidades)

Todas as tabelas são **multi-tenant por usuário/conta** (`user_id` / `finance_account_id`) seguindo o padrão atual do sistema.

### 3.1 `financial_snapshots`
Agregado materializado por (conta, ano, mês). É a base de Diagnóstico, Projeções e tendência.

| Campo | Tipo | Descrição |
|---|---|---|
| id | bigint PK | |
| finance_account_id | bigint FK | |
| year | smallint | |
| month | tinyint | 1–12 |
| total_income | decimal(14,2) | receitas do mês |
| total_expense | decimal(14,2) | despesas do mês |
| total_recurring | decimal(14,2) | despesas recorrentes |
| total_installments | decimal(14,2) | parcelas do mês |
| total_card | decimal(14,2) | gasto em cartão |
| total_debt_remaining | decimal(14,2) | saldo devedor total no mês |
| expense_by_category | json | `{category_id: valor}` |
| essential_total | decimal(14,2) | classificação ESSENCIAL |
| important_total | decimal(14,2) | classificação IMPORTANTE |
| superfluous_total | decimal(14,2) | classificação SUPÉRFLUO |
| balance | decimal(14,2) | income − expense |
| computed_at | timestamp | última materialização |

Índice único: `(finance_account_id, year, month)`.

### 3.2 `financial_scores`
Histórico do score de saúde financeira (1 por snapshot).

| Campo | Tipo | Descrição |
|---|---|---|
| id, finance_account_id, year, month | | |
| score | tinyint | 0–100 |
| band | enum | excellent/good/attention/critical/emergency |
| breakdown | json | pontuação por componente (ver §6) |
| computed_at | timestamp | |

### 3.3 `debts`
Dívidas estruturadas para a aba de Quitação. Parcelamentos/cartões podem ser **derivados** de `installments`/`financial_release`; financiamentos e empréstimos são cadastrados explicitamente.

| Campo | Tipo | Descrição |
|---|---|---|
| id, finance_account_id | | |
| type | enum | financing / installment / card / loan |
| source_installment_id | bigint FK null | vínculo com parcelamento existente |
| description | string | |
| original_amount | decimal(14,2) | |
| remaining_amount | decimal(14,2) | |
| installment_value | decimal(14,2) | parcela mensal |
| remaining_installments | int | |
| interest_rate_month | decimal(6,4) null | taxa estimada a.m. |
| start_date / end_date | date | |
| status | enum | active / paid_off / renegotiating |

### 3.4 `financial_goals`
| Campo | Tipo | Descrição |
|---|---|---|
| id, finance_account_id | | |
| type | enum | emergency_reserve / trip / house / car / investment / custom |
| title | string | |
| target_amount | decimal(14,2) | |
| current_amount | decimal(14,2) | |
| target_date | date null | |
| monthly_contribution | decimal(14,2) null | |
| status | enum | active / achieved / paused |
| is_suggested | bool | meta gerada automaticamente |

### 3.5 `reduction_plans` + `reduction_plan_items`
Plano de redução aceito pelo usuário (a sugestão é calculada on-the-fly; o plano salvo é o que ele "comprou").

`reduction_plan_items`: `category_id`, `current_amount`, `target_amount`, `monthly_saving`, `kind` (category / subscription), `status` (suggested/accepted/dismissed).

### 3.6 IA — `ai_conversations` / `ai_messages`
| ai_conversations | finance_account_id, title, context_period (3m/6m/12m), created_at |
| ai_messages | conversation_id, role (user/assistant/system), content, tokens_in, tokens_out, model, facts_snapshot_id |

`facts_snapshot_id` guarda **qual dossiê de fatos** alimentou a resposta → auditoria total.

---

## 4. Classificação de despesas (regra de negócio)

`ClassificationService` rotula cada despesa em **ESSENCIAL / IMPORTANTE / SUPÉRFLUO**. Estratégia em camadas (primeira que casar vence):

1. **Override do usuário** (campo opcional `classification` na categoria) — sempre respeitado.
2. **Mapa por categoria** (configurável):
   - ESSENCIAL: aluguel, condomínio, água, energia, saúde, alimentação básica/mercado.
   - IMPORTANTE: internet, celular/telefonia, combustível, transporte.
   - SUPÉRFLUO: streaming, delivery, lazer, compras por impulso, assinaturas de entretenimento.
3. **Heurística de assinatura**: despesa `recurring`/`fixed`, valor estável mês a mês, descrição casando com dicionário (Netflix, Spotify, YouTube, Amazon Prime, Disney, Clube Esfera, etc.) → marcada como **assinatura** + SUPÉRFLUO/IMPORTANTE.
4. **Fallback**: SUPÉRFLUO (conservador — força revisão consciente).

O mapa de classificação e o dicionário de assinaturas ficam em config versionada (`config/financial_planning.php`), permitindo evolução sem migration.

---

## 5. Detecção de padrões (recorrências, assinaturas, parcelamentos)

Reaproveita os campos que já existem em `financial_release` (`repetition`, `release_type`, `portion`, `installment_id`):

- **Parcelamento**: `release_type = installment` ou `repetition ∈ {parcelado, installments}`. Fim previsto = `installments.total_installments − paid_installments`.
- **Recorrente / Financiamento**: `repetition = fixed` / `release_type = recurring`.
- **Assinatura**: recorrente + match no dicionário + valor mensal baixo/estável.
- **Cartão**: `payment_method` do tipo cartão de crédito → agregado em `total_card`.

---

## 6. Modelo de Scoring Financeiro (determinístico)

Score = soma ponderada de 5 componentes, cada um normalizado em 0–100.

| Componente | Peso | Como é medido |
|---|---|---|
| **Fluxo de caixa** | 30% | razão receita/despesa do mês |
| **Endividamento** | 25% | comprometimento da renda com dívidas (DTI) |
| **Qualidade do gasto** | 15% | proporção essencial vs supérfluo |
| **Reserva de emergência** | 15% | nº de meses de despesa cobertos pela reserva |
| **Tendência** | 15% | direção da projeção de 3 meses |

### Fórmulas dos componentes

```
# 1. Fluxo de caixa (cashflow)
ratio = income / max(expense, 1)
cashflow = clamp( (ratio) * 100 , 0, 100 )      # 100 quando gasta ≤ ganha
# ex.: income 7500, expense 12000 → ratio 0.625 → 62.5 → mas penaliza déficit:
# se balance < 0: cashflow = clamp(ratio*80, 0, 60)  (teto 60 enquanto há déficit)

# 2. Endividamento (DTI = debt-to-income)
dti = monthly_debt_payments / income
debt_score = clamp( 100 - (dti * 250) , 0, 100 )
# dti 0.40 (40% da renda em dívida) → 100 - 100 = 0

# 3. Qualidade do gasto
quality = clamp( 100 - (superfluous_total / max(expense,1) * 200) , 0, 100 )

# 4. Reserva de emergência
months_covered = reserve_balance / avg_monthly_expense
reserve_score = clamp( months_covered / 6 * 100 , 0, 100 )   # 6 meses = 100

# 5. Tendência (usa ProjectionService 3 meses)
slope = (saldo_mes3 - saldo_mes1)
trend = slope > 0 ? 100 : (slope == 0 ? 50 : 20)

score = round(
  cashflow*0.30 + debt_score*0.25 + quality*0.15 +
  reserve_score*0.15 + trend*0.15
)
```

### Faixas (bands)
| Score | Band | Rótulo |
|---|---|---|
| 95–100 | excellent | Excelente |
| 80–94 | good | Boa |
| 60–79 | attention | Atenção |
| 40–59 | critical | Crítica |
| 0–39 | emergency | Emergência Financeira |

> No caso de referência (renda 7.500, despesa 12.000, dívida ~4.700/mês) o score cai para a faixa **Emergência**, coerente com a realidade.

O `breakdown` JSON guarda a pontuação de cada componente → o frontend mostra "por que" o score é esse, e a IA explica em linguagem natural.

---

## 7. Os 5 motores de domínio

### 7.1 DiagnosisService (Aba 1)
Entrada: snapshot do mês. Saída:
- Score + band + breakdown.
- Resumo (receita/despesa/resultado).
- Indicadores (% renda comprometida, % moradia, % alimentação, % transporte, % dívidas, % cartão).
- **Alertas** gerados por regras determinísticas com limiares configuráveis:
  - `expense/income > 1.0` → "Você está gastando {pct}% da sua renda."
  - `categoria/income > limiar_categoria` → "Seu gasto com {cat} está acima do recomendado."
  - `financiamento/income > 0.20` → "Seu financiamento consome {pct}% da sua renda."
  - `cartão/expense > 0.30` → "Seu cartão representa {pct}% dos gastos."

  Cada alerta tem `severity` (info/warning/danger) e `metric` (para a IA priorizar).

### 7.2 ReductionService (Aba 2)
Para cada categoria com gasto acima do benchmark, calcula **meta sugerida** e economia:
```
target = max( benchmark_categoria * income , piso_minimo_categoria )
saving = current - target   (se > 0)
```
Benchmarks default (ajustáveis): moradia 30%, alimentação 12%, transporte 10%, lazer 5%, etc.
Assinaturas detectadas viram itens "recomendado cancelar" com economia mensal e **anual (×12)**.
Saída agrega **economia total possível/mês** e **/ano**.

### 7.3 ProjectionService (Aba 3) — núcleo determinístico
Caminha N meses à frente (1, 3, 6, 12) compondo:
- Receitas recorrentes (persistem).
- Parcelamentos ativos → **caem do fluxo quando terminam** (sabemos a parcela final via `installments`).
- Assinaturas e financiamentos (persistem até `end_date`).
- Despesas variáveis → média móvel dos últimos 3 meses.

```
para mes m em [1..N]:
  receita[m]  = soma(receitas recorrentes ativas em m)
  despesa[m]  = recorrentes_ativas(m) + parcelas_ativas(m) + media_variaveis
  saldo[m]    = receita[m] - despesa[m]
```
Saída: timeline mês a mês + **data prevista de equilíbrio** (primeiro mês com saldo ≥ 0 sustentável) → alimenta gráfico de tendência no front.

### 7.4 DebtStrategyService (Aba 4)
Lista dívidas (de `debts` + derivadas de parcelamentos). Calcula:
- **Bola de Neve**: ordena por `remaining_amount` asc.
- **Avalanche**: ordena por `interest_rate_month` desc.
- Simula amortização mês a mês para cada método com aporte extra (R$ 500 / R$ 1.000 / valor custom) e compara **juros economizados** e **meses economizados**.
- Retorna qual método economiza mais para o perfil do usuário.

> Guardrail: nunca sugere cheque especial, rotativo ou empréstimo abusivo (ver §9).

### 7.5 GoalService (Aba 5)
- Meta automática de **reserva de emergência** = `6 × despesa média mensal`.
- Progresso = `current_amount / target_amount`.
- Metas adicionais (viagem, casa, carro, investimentos) com aporte mensal e data alvo; calcula meses para atingir dado o aporte e a sobra projetada.

---

## 8. Estratégia de IA (OpenAI)

### 8.1 Arquitetura "facts-first"
```
Pergunta do usuário
   │
   ▼
FinancialContextBuilder  → monta DOSSIÊ (JSON) a partir de snapshots,
   │                        diagnóstico, projeções, dívidas, metas
   │                        (3m / 6m / 12m conforme pedido)
   ▼
OpenAiAdvisorService  → chama OpenAI com:
   • system prompt (persona consultor + guardrails)
   • dossiê de fatos (structured)
   • histórico curto da conversa
   │
   ▼
Resposta PT-BR  ← validada por Guardrails  ← cacheada
```

### 8.2 Perguntas "calculáveis" são resolvidas ANTES da IA
Ex.: *"Posso comprar um celular de R$ 3.000?"*
1. `AffordabilityService` calcula deterministicamente (sobra projetada, impacto na reserva, em quantos meses cabe à vista, impacto se parcelado).
2. Esse resultado entra no dossiê.
3. A IA **explica** a recomendação ("Hoje não cabe à vista sem comprometer sua reserva; em 4 meses sim…"). Ela nunca chuta o número.

### 8.3 Tool calling (function calling)
A IA pode invocar funções expostas que retornam fatos calculados:
`get_diagnosis(period)`, `get_projection(months)`, `simulate_debt_payoff(extra)`, `check_affordability(amount, installments)`, `get_top_expense_categories()`. Assim ela orquestra perguntas compostas sem nunca fazer aritmética própria.

### 8.4 Modelo, custo e performance
- Modelo: GPT da família mais recente disponível para texto/raciocínio; *temperature* baixa (0.2–0.3) para consistência.
- **Cache** por (hash do dossiê + pergunta normalizada) → respostas repetidas não custam tokens.
- **CostGuard**: limite mensal de tokens por conta + rate limit; degrada para respostas determinísticas (templates) se estourar.
- Streaming de resposta no chat (UX).
- Tudo assíncrono via fila quando possível.

### 8.5 Privacidade
- Enviar ao provedor apenas agregados/dossiê — **nunca** dados crus desnecessários, nomes de terceiros, etc.
- Opt-in explícito para o módulo de IA. Logs de quais fatos foram enviados (`facts_snapshot_id`).

---

## 9. Guardrails (regras inegociáveis)

O sistema **NUNCA** recomenda: cheque especial, rotativo do cartão, empréstimo abusivo.
Sempre prioriza: **redução de gastos → renegociação → criação de reserva**.

Implementação em duas camadas:
1. **System prompt** com proibições explícitas.
2. **Validação pós-resposta** (`Guardrails`): regex/classificador que bloqueia/reescreve respostas que violem as proibições antes de chegar ao usuário. Determinístico vence a IA.

---

## 10. APIs REST (Laravel)

Prefixo: `/api/planning`. Autenticação igual ao restante do sistema (token + `authGuard` no front).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/planning/diagnosis?period=current` | Score, resumo, indicadores, alertas |
| GET | `/planning/reduction-plan` | Sugestões de redução + assinaturas + economia total |
| POST | `/planning/reduction-plan` | Salva plano aceito pelo usuário |
| GET | `/planning/projections?months=12` | Timeline + ponto de equilíbrio |
| GET | `/planning/debts` | Lista de dívidas estruturadas |
| POST | `/planning/debts` | Cadastra financiamento/empréstimo |
| GET | `/planning/debts/strategies?extra=500` | Bola de neve vs avalanche + simulação |
| GET | `/planning/goals` | Metas (inclui sugeridas) |
| POST/PUT | `/planning/goals` | CRUD de metas |
| GET | `/planning/dashboard` | Resumo executivo (1 request agrega tudo) |
| POST | `/planning/ai/conversations` | Inicia conversa |
| POST | `/planning/ai/conversations/{id}/messages` | Pergunta à IA (streaming) |
| GET | `/planning/ai/conversations/{id}` | Histórico |

Respostas usam **API Resources** (padronização) e o front consome via `ApiService` existente.

---

## 11. Jobs automáticos & eventos

### Jobs (queue)
- `RecomputeSnapshotJob(account, year, month)` — materializa snapshot + score.
- `RefreshDiagnosisJob` — recalcula alertas/indicadores após mudança relevante.
- `SuggestGoalsJob` — cria/atualiza meta de reserva sugerida.
- Agendados (`scheduler`): recompute do mês corrente 1×/dia + virada de mês.

### Eventos do sistema
- `FinancialReleaseCreated/Updated/Deleted` → dispara `RecomputeSnapshotJob` do mês afetado (debounced).
- `DebtPaidOff` → recalcula projeções + notifica "próxima dívida a encerrar".
- `ScoreBandChanged` → notificação ("Sua saúde financeira mudou de Crítica para Atenção 🎉").

Recompute incremental e em fila → escala para milhares de usuários sem recalcular tudo a cada request.

---

## 12. Frontend Angular — estrutura

Diferente do padrão atual (componentes flat no `AppModule`), proponho um **feature module lazy-loaded** — escolha consciente pela dimensão da feature e pela escalabilidade (menor bundle inicial, isolamento).

```
src/app/pages/planejamento/
  planejamento.module.ts            # feature module
  planejamento.routing.module.ts    # rotas filhas + authGuard
  diagnostico/diagnostico.component.{ts,html,scss}
  plano-reducao/plano-reducao.component.*
  projecoes/projecoes.component.*
  quitacao-dividas/quitacao-dividas.component.*
  metas/metas.component.*
  dashboard-executivo/dashboard-executivo.component.*
  chat-ia/chat-ia.component.*

src/app/services/planning/
  planning.service.ts               # consome /api/planning via ApiService
  planning-ai.service.ts            # chat/streaming

src/app/models/planning/
  diagnosis.model.ts  projection.model.ts  debt.model.ts
  goal.model.ts  reduction-plan.model.ts  financial-score.model.ts

src/app/shared/components/planning/
  score-gauge/            # medidor 0–100 com faixa colorida
  indicator-bar/          # barra de % por indicador
  alert-card/             # card de alerta (info/warning/danger)
  projection-chart/       # gráfico de tendência
  debt-strategy-card/     # comparação snowball/avalanche
  goal-progress/          # progresso de meta
```

### Rotas (lazy)
```ts
// app.routing.module.ts
{
  path: 'planejamento',
  loadChildren: () => import('./pages/planejamento/planejamento.module')
    .then(m => m.PlanejamentoModule),
  canActivate: [authGuard]
}
```

### Sidebar (novo item)
Adicionar em `sidebar.component.ts` (ícone FontAwesome, ex. `faBrain`/`faLightbulb`):
```ts
{ icon: faLightbulb, label: 'Planejamento', path: '/planejamento' }
```
As 5 abas viram navegação de sub-tabs dentro do feature (router-outlet filho), seguindo o `dashboard-layout` já usado.

### Reuso
Aproveitar `dashboard-layout`, `month-selector`, `loading-overlay`, diretiva `*appPermission`, `ToastrService`, padrão de `FinancialExportService` (exportar diagnóstico/projeção em PDF/Excel — já temos o serviço pronto).
Gráficos: avaliar lib leve (ex. `ng2-charts`/Chart.js) para `projection-chart`.

---

## 13. UX / Wireframes (textual)

### Dashboard Executivo (entrada da feature)
```
┌───────────────────────────────────────────────────────────────┐
│ Planejamento Financeiro            [mês ▼]      [Exportar ▼]    │
├───────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐  │
│  │ SAÚDE        │  │ SALDO         │  │ ECONOMIA POSSÍVEL  │  │
│  │   ◍ 32/100   │  │ PROJETADO     │  │  R$ 1.850/mês      │  │
│  │  Emergência  │  │  -R$ 4.500    │  │  R$ 22.200/ano     │  │
│  └──────────────┘  └───────────────┘  └────────────────────┘  │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐  │
│  │ MAIOR VILÃO  │  │ PRÓXIMA DÍVIDA│  │ EQUILÍBRIO PREVISTO│  │
│  │  Cartão 35%  │  │  a encerrar:  │  │   Setembro/2026    │  │
│  │              │  │  TV — out/26  │  │                    │  │
│  └──────────────┘  └───────────────┘  └────────────────────┘  │
│  Meta Reserva: [██████░░░░░░░░] 30%  R$ 12.600 / R$ 42.000     │
│  [ Falar com a IA Financeira 💬 ]                              │
└───────────────────────────────────────────────────────────────┘
```

### Aba 1 — Diagnóstico
```
┌ Saúde Financeira ──────────────────────────────────────────┐
│   ◍ Gauge 0–100   Score 32 — EMERGÊNCIA                     │
│   Receitas R$ 7.500 | Despesas R$ 12.000 | Resultado -4.500 │
├ Indicadores ───────────────────────────────────────────────┤
│ Renda comprometida ▓▓▓▓▓▓▓▓▓▓ 160%                          │
│ Moradia ▓▓▓▓▓ 49% | Alimentação ▓▓ 23% | Transporte ▓ 9%   │
│ Dívidas ▓▓▓ 23% | Cartão ▓▓▓▓ 40%                           │
├ Alertas ───────────────────────────────────────────────────┤
│ 🔴 Você está gastando 160% da sua renda.                    │
│ 🟠 Alimentação acima do recomendado.                        │
│ 🟠 Cartão representa 40% dos gastos.                         │
└────────────────────────────────────────────────────────────┘
```

### Aba 2 — Plano de Redução
```
Categoria       Atual     Meta      Economia
Alimentação   R$1.700 → R$ 800     R$ 900   [Aceitar][Ignorar]
Lazer         R$ 650  → R$ 150     R$ 500   [Aceitar][Ignorar]
─ Assinaturas ───────────────────────────────────────────
Netflix  R$ 55   ❌ cancelar   → R$ 660/ano
Spotify  R$ 35   ❌ cancelar   → R$ 420/ano
Clube Esfera R$ 40 ❌ cancelar → R$ 480/ano
─────────────────────────────────────────────────────────
ECONOMIA TOTAL: R$ 1.850/mês • R$ 22.200/ano
```

### Aba 3 — Projeções (timeline + gráfico de tendência)
```
Jul  Rec 7.500  Desp 7.900  Saldo -400   ▁▂
Ago  Rec 7.500  Desp 7.600  Saldo -100   ▃
Set  Rec 7.500  Desp 7.300  Saldo +200   ▅  ← equilíbrio
Out  Rec 7.500  Desp 7.100  Saldo +400   ▇
[ Gráfico de linha: saldo ao longo de 12 meses ]
```

### Aba 4 — Quitação de Dívidas
```
Dívida        Saldo     Parcelas  Taxa   Total rest.
Financiamento R$28.000   24      1,8%   R$ 33.120
Cartão        R$ 3.000    -      —      R$ 3.000
Parcelamento  R$ 1.700    8      —      R$ 1.700
─ Estratégias ──────────────────────────────────
Bola de Neve  → quita "Parcelamento" primeiro
Avalanche     → quita "Financiamento" primeiro (maior juro)
🏆 Avalanche economiza R$ 2.140 em juros
─ Simulador ──── aporte extra: [R$ 500][R$1.000][custom]
+R$500/mês → economiza R$ 1.320 em juros e 5 meses
```

### Aba 5 — Metas
```
🛡 Reserva de Emergência  Meta R$ 42.000 (6× despesa)
   [████░░░░░░░░] 30%  R$ 12.600
   Aporte sugerido: R$ 700/mês → atinge em mai/2029
[+ Nova meta]  Viagem | Casa | Carro | Investimentos
```

### Chat IA
Bolha de chat com streaming, sugestões rápidas ("Estou gastando demais?", "O que cortar?", "Posso comprar X?") e disclaimer de que é orientação, não consultoria regulamentada.

---

## 14. Casos de uso (resumo)

| # | Ator | Caso de uso |
|---|---|---|
| UC01 | Usuário | Ver diagnóstico e score do mês |
| UC02 | Usuário | Aceitar/ignorar sugestões de redução |
| UC03 | Usuário | Visualizar projeção 1/3/6/12 meses |
| UC04 | Usuário | Cadastrar financiamento/empréstimo |
| UC05 | Usuário | Comparar snowball vs avalanche e simular aporte |
| UC06 | Usuário | Criar e acompanhar metas |
| UC07 | Usuário | Perguntar à IA financeira |
| UC08 | Sistema | Recalcular snapshot/score após mudança (job/evento) |
| UC09 | Sistema | Sugerir meta de reserva automaticamente |
| UC10 | Sistema | Notificar mudança de faixa de score |

---

## 15. Métricas & KPIs

**Produto:** adoção da feature, % usuários com score calculado, nº de planos de redução aceitos, economia total "comprada" pelos usuários, metas criadas/atingidas, evolução média de score (efetividade real).
**IA:** perguntas/usuário, custo de tokens/usuário, taxa de cache hit, % respostas bloqueadas por guardrail, satisfação (👍/👎).
**Técnico:** tempo de recompute de snapshot, fila/latência de jobs, p95 das APIs de planning, custo OpenAI/mês.

---

## 16. Roadmap de implementação (fases)

| Fase | Entrega | Depende de |
|---|---|---|
| **F0** | Migrations (snapshots, scores, debts, goals) + `SnapshotService` + job de recompute | — |
| **F1** | `ScoringService` + `DiagnosisService` + API + **Aba 1 (Diagnóstico)** + Dashboard Executivo | F0 |
| **F2** | `ClassificationService` + `ReductionService` + **Aba 2 (Plano de Redução)** | F1 |
| **F3** | `ProjectionService` + **Aba 3 (Projeções)** + gráfico | F0 |
| **F4** | `DebtStrategyService` + `debts` + **Aba 4 (Quitação)** + simulador | F0 |
| **F5** | `GoalService` + **Aba 5 (Metas)** + meta automática de reserva | F1 |
| **F6** | Camada IA (dossiê + OpenAI + guardrails + cache) + **Chat** + affordability | F1–F5 |
| **F7** | Notificações/eventos, exportações (PDF/Excel), refinamento de KPIs | todas |

Cada fase é entregável e testável isoladamente; F1 já gera valor sozinha.

---

## 17. Decisões em aberto (precisam de você)

1. **Reserva de emergência atual**: existe um saldo/conta que represente a reserva hoje, ou começa em zero? (impacta `reserve_score` e metas)
2. **Taxa de juros das dívidas**: usuário informa manualmente ou estimamos por tipo de dívida? (impacta avalanche/simulador)
3. **Financiamentos/empréstimos**: cadastro manual novo (tabela `debts`) — confirmado? Hoje não há entidade para isso.
4. **Biblioteca de gráficos**: posso adotar Chart.js (`ng2-charts`) ou há preferência?
5. **OpenAI**: já há chave/conta e budget de tokens definidos? Módulo IA é opt-in por usuário?
6. **Multi-tenant**: confirmo que tudo é escopado por `finance_account_id` (família compartilha conta financeira)?
```
