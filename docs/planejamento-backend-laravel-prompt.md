# Prompt para implementação do BACKEND (Laravel) — Planejamento Financeiro Inteligente

> Cole este prompt na sessão do repositório **Laravel** (backend do Wallet Digital).
> O frontend Angular já está pronto e consome estes contratos. Quando os endpoints
> existirem, basta trocar `useMock = true → false` em
> `PlanningService` e `PlanningAiService` no Angular.

---

## CONTEXTO

Você vai implementar a feature **Planejamento Financeiro Inteligente** no backend Laravel
de um sistema financeiro pessoal/familiar. Os dados já existentes são:
`financial_release` (receitas/despesas, com campos `repetition`, `release_type`, `portion`,
`installment_id`, `payment_method_id`, `value`, `date`, `due_date`, `status`, `category_id`,
`finance_account_id`), `categories`, `payment_methods`, `installments`, `finance_accounts`.

Tudo é multi-tenant por `finance_account_id` (a família compartilha uma conta financeira).

### PRINCÍPIO INEGOCIÁVEL
**Todo cálculo financeiro é determinístico em PHP. A IA (OpenAI) NUNCA calcula números** —
ela só recebe um "dossiê de fatos" já calculado e gera texto. Se a OpenAI cair, todo o
resto (diagnóstico, projeções, dívidas, metas) deve continuar funcionando.

### GUARDRAILS (regra de negócio crítica)
O sistema **NUNCA** pode recomendar: cheque especial, rotativo do cartão, empréstimo abusivo.
Sempre priorizar: redução de gastos → renegociação → criação de reserva. Implementar isso
tanto no system prompt da IA quanto em validação pós-resposta (determinística).

---

## 1. MIGRATIONS (criar)

- `financial_snapshots`: id, finance_account_id (FK), year (smallint), month (tinyint),
  total_income, total_expense, total_recurring, total_installments, total_card,
  total_debt_remaining, expense_by_category (json), essential_total, important_total,
  superfluous_total, balance — todos decimal(14,2) —, computed_at (timestamp).
  Índice único (finance_account_id, year, month).
- `financial_scores`: id, finance_account_id, year, month, score (tinyint),
  band (enum: excellent/good/attention/critical/emergency), breakdown (json), computed_at.
- `debts`: id, finance_account_id, type (enum: financing/installment/card/loan),
  source_installment_id (FK null), description, original_amount, remaining_amount,
  installment_value, remaining_installments (int), interest_rate_month decimal(6,4) null,
  start_date, end_date, status (enum: active/paid_off/renegotiating).
- `financial_goals`: id, finance_account_id, type (enum: emergency_reserve/trip/house/car/
  investment/custom), title, target_amount, current_amount, monthly_contribution null,
  target_date null, status (enum: active/achieved/paused), is_suggested (bool).
- `reduction_plans`: id, finance_account_id, created_at; `reduction_plan_items`:
  id, reduction_plan_id (FK), category_id null, kind (enum: category/subscription),
  label, current_amount, target_amount, monthly_saving, status (enum: suggested/accepted/dismissed).
- `ai_conversations`: id, finance_account_id, title, context_period (enum: 3m/6m/12m), created_at.
- `ai_messages`: id, ai_conversation_id (FK), role (enum: user/assistant/system), content (text),
  tokens_in, tokens_out, model, facts_snapshot_id null, created_at.

Criar Models Eloquent correspondentes, todos com scope por `finance_account_id` do usuário autenticado.

---

## 2. SERVICES DE DOMÍNIO (determinísticos, com testes unitários)

### SnapshotService
`recompute(finance_account_id, year, month)`: agrega `financial_release` do mês e materializa
um `financial_snapshots`. Classifica cada despesa em essencial/importante/supérfluo (ver
ClassificationService) e soma por classe. Soma `expense_by_category`. Detecta cartão pelo
`payment_method` tipo cartão de crédito.

### ClassificationService
Classifica despesa em ESSENCIAL / IMPORTANTE / SUPÉRFLUO, nesta ordem de precedência:
1. override do usuário (campo opcional `classification` na categoria), 2. mapa por categoria,
3. heurística de assinatura (recorrente + valor estável + dicionário Netflix/Spotify/YouTube/
Disney/Amazon/Clube Esfera…), 4. fallback SUPÉRFLUO.
Mapa e dicionário em `config/financial_planning.php` (sem migration).
- ESSENCIAL: aluguel, condomínio, água, energia, saúde, alimentação básica/mercado.
- IMPORTANTE: internet, celular/telefonia, combustível, transporte.
- SUPÉRFLUO: streaming, delivery, lazer, compras por impulso, assinaturas de entretenimento.

### ScoringService
Score 0–100 = soma ponderada de 5 componentes (cada um 0–100):

```
# 1. Fluxo de caixa (peso 0.30)
ratio = income / max(expense, 1)
cashflow = balance >= 0 ? clamp(ratio*100,0,100) : clamp(ratio*80,0,60)

# 2. Endividamento (peso 0.25)
dti = monthly_debt_payments / max(income,1)
debt = clamp(100 - dti*250, 0, 100)

# 3. Qualidade do gasto (peso 0.15)
quality = clamp(100 - (superfluous_total / max(expense,1) * 200), 0, 100)

# 4. Reserva de emergência (peso 0.15)
months_covered = reserve_balance / max(avg_monthly_expense,1)
reserve = clamp(months_covered / 6 * 100, 0, 100)

# 5. Tendência (peso 0.15) — usa ProjectionService 3 meses
slope = saldo_mes3 - saldo_mes1
trend = slope > 0 ? 100 : (slope == 0 ? 50 : 20)

score = round(cashflow*0.30 + debt*0.25 + quality*0.15 + reserve*0.15 + trend*0.15)
```
Bands: ≥95 excellent, ≥80 good, ≥60 attention, ≥40 critical, <40 emergency.
Persistir em `financial_scores` com o `breakdown`.

### DiagnosisService
Monta o diagnóstico do mês: score, resumo (income/expense/result), indicadores
(% renda comprometida, % moradia/alimentação/transporte/dívidas/cartão) e alertas por regra:
- expense/income > 1.0 → danger "Você está gastando {pct}% da sua renda."
- categoria/income > limiar → warning "Seu gasto com {cat} está acima do recomendado."
- financiamento/income > 0.20 → warning "Seu financiamento consome {pct}% da sua renda."
- cartão/expense > 0.30 → warning "Seu cartão representa {pct}% dos gastos."

### ReductionService
Para cada categoria acima do benchmark (moradia 30%, alimentação 12%, transporte 10%, lazer 5%…):
`target = max(benchmark*income, piso_categoria)`, `saving = current - target` (se > 0).
Assinaturas detectadas viram itens "recomendado cancelar" com economia mensal e anual (×12).
Retorna itens + economia total mensal e anual.

### ProjectionService
Caminha N meses à frente compondo: receitas recorrentes (persistem), parcelamentos ativos
(caem quando terminam — usar `installments.total_installments - paid_installments`),
assinaturas/financiamentos (até `end_date`), despesas variáveis (média móvel 3 meses).
Retorna timeline mês a mês + primeiro mês com saldo ≥ 0 (`breakEvenLabel`).

### DebtStrategyService
Lista dívidas (`debts` + derivadas de parcelamentos/cartões). Calcula ordem Bola de Neve
(menor `remaining_amount` primeiro) e Avalanche (maior `interest_rate_month` primeiro).
Simula amortização mês a mês com aporte extra e retorna juros economizados e meses
economizados para cada cenário. Indica o método que mais economiza.

### GoalService
Meta automática de reserva = 6 × despesa média mensal. Calcula progresso
(`current/target*100`) e meses para atingir dado o aporte e a sobra projetada.

### AffordabilityService
`canAfford(amount, installments=1)`: calcula deterministicamente se cabe à vista hoje sem
comprometer a reserva, em quantos meses caberia, e o impacto se parcelado. Esse resultado
entra no dossiê da IA.

---

## 3. ENDPOINTS REST (prefixo `/api/planning`, auth igual ao restante do sistema)

Os JSON de resposta DEVEM seguir EXATAMENTE os formatos abaixo (camelCase) — eles casam
com os models TypeScript do frontend. Use API Resources para garantir o shape.

### GET `/api/planning/dashboard`
```json
{
  "score": { "score": 32, "band": "emergency",
    "breakdown": { "cashflow": 45, "debt": 0, "quality": 60, "reserve": 0, "trend": 60 } },
  "projectedBalance": -4500,
  "possibleSavingMonthly": 1850,
  "possibleSavingYearly": 22200,
  "topVillain": { "label": "Cartão de crédito", "percent": 40 },
  "nextDebtToFinish": { "label": "Parcelamento notebook", "dueLabel": "Fev/2027" },
  "breakEvenLabel": "Set/2026",
  "emergencyReserve": { "current": 12600, "target": 42000, "progress": 30 }
}
```

### GET `/api/planning/diagnosis?period=current`
```json
{
  "period": "Junho/2026",
  "score": { "score": 32, "band": "emergency",
    "breakdown": { "cashflow": 45, "debt": 0, "quality": 60, "reserve": 0, "trend": 60 } },
  "income": 7500, "expense": 12000, "result": -4500,
  "indicators": [
    { "key": "committed", "label": "Renda comprometida", "percent": 160, "threshold": 100 },
    { "key": "housing", "label": "Moradia", "percent": 49, "threshold": 30 },
    { "key": "food", "label": "Alimentação", "percent": 23, "threshold": 12 },
    { "key": "transport", "label": "Transporte", "percent": 9, "threshold": 10 },
    { "key": "debts", "label": "Dívidas", "percent": 23, "threshold": 20 },
    { "key": "card", "label": "Cartão de crédito", "percent": 40, "threshold": 30 }
  ],
  "alerts": [
    { "severity": "danger", "message": "Você está gastando 160% da sua renda.", "metric": "committed" },
    { "severity": "warning", "message": "Seu gasto com alimentação está acima do recomendado.", "metric": "food" }
  ]
}
```
`severity` ∈ info|warning|danger.

### GET `/api/planning/reduction-plan`
```json
{
  "items": [
    { "id": 1, "kind": "category", "label": "Alimentação", "current": 1700, "target": 800,
      "monthlySaving": 900, "recommendation": "Reduzir delivery e priorizar mercado." },
    { "id": 5, "kind": "subscription", "label": "Netflix", "current": 55, "target": 0,
      "monthlySaving": 55, "recommendation": "Recomendado cancelar." }
  ],
  "totalMonthly": 1850, "totalYearly": 22200
}
```
`kind` ∈ category|subscription.

### POST `/api/planning/reduction-plan`
Body: `{ "item_ids": [1,5] }` → cria/atualiza `reduction_plans` com itens aceitos.
Resposta: `{ "success": true }`.

### GET `/api/planning/projections?months=12`
```json
{
  "months": [
    { "label": "Jul/2026", "year": 2026, "month": 7, "income": 7500, "expense": 7900, "balance": -400 },
    { "label": "Ago/2026", "year": 2026, "month": 8, "income": 7500, "expense": 7600, "balance": -100 }
  ],
  "breakEvenLabel": "Set/2026"
}
```

### GET `/api/planning/debts`
```json
[
  { "id": 1, "type": "financing", "description": "Financiamento do carro",
    "remainingAmount": 28000, "remainingInstallments": 24, "installmentValue": 1380,
    "interestRateMonth": 1.8, "totalRemaining": 33120, "status": "active" }
]
```
`type` ∈ financing|installment|card|loan.

### POST `/api/planning/debts`
Body com os mesmos campos (sem id) → cria. Resposta: o objeto criado com `id`.

### GET `/api/planning/debts/strategies?extra=500`
```json
{
  "snowball": [ { "order": 1, "debt": "Parcelamento notebook" }, { "order": 2, "debt": "Fatura cartão" } ],
  "avalanche": [ { "order": 1, "debt": "Fatura cartão" }, { "order": 2, "debt": "Financiamento do carro" } ],
  "recommended": "avalanche",
  "interestSaved": 2140,
  "simulations": [
    { "extra": 500, "interestSaved": 1320, "monthsSaved": 5 },
    { "extra": 1000, "interestSaved": 2800, "monthsSaved": 9 }
  ]
}
```

### GET `/api/planning/goals`
```json
[
  { "id": 1, "type": "emergency_reserve", "title": "Reserva de Emergência",
    "targetAmount": 42000, "currentAmount": 12600, "monthlyContribution": 700,
    "targetDate": "2029-05-01", "progress": 30, "status": "active", "isSuggested": true }
]
```
`type` ∈ emergency_reserve|trip|house|car|investment|custom.

### POST/PUT `/api/planning/goals` e `/api/planning/goals/{id}`
Body com os campos da meta → cria/atualiza. Resposta: a meta salva.

### POST `/api/planning/ai/conversations/{id}/messages`
> `id = 0` cria nova conversa.
Body: `{ "question": "Posso comprar um celular de R$ 3.000?", "period": "3m" }`
Resposta: `{ "answer": "texto em pt-BR…", "conversationId": 1 }`

---

## 4. CAMADA DE IA (OpenAI)

1. `FinancialContextBuilder`: monta um dossiê JSON (3m/6m/12m) a partir de snapshots,
   diagnóstico, projeções, dívidas, metas e AffordabilityService. NÃO enviar dados crus
   desnecessários nem nomes de terceiros — só agregados.
2. `OpenAiAdvisorService`: chama a OpenAI (modelo de texto mais recente disponível,
   temperature 0.2–0.3) com: system prompt (persona consultor financeiro + guardrails),
   o dossiê de fatos, e o histórico curto da conversa. Suportar **function calling**
   expondo: `get_diagnosis`, `get_projection`, `simulate_debt_payoff`, `check_affordability`,
   `get_top_expense_categories` — todas retornando fatos JÁ calculados pelos services.
3. Perguntas calculáveis (ex.: "posso comprar X?") → resolver com AffordabilityService ANTES,
   injetar o resultado no dossiê; a IA só explica.
4. `Guardrails`: validação pós-resposta que bloqueia/reescreve qualquer recomendação de
   cheque especial, rotativo ou empréstimo abusivo.
5. `CostGuard`: limite mensal de tokens por conta + cache por (hash do dossiê + pergunta).
   Persistir tokens em `ai_messages`. Módulo IA é **opt-in** por usuário.

---

## 5. JOBS & EVENTOS (queue)

- `RecomputeSnapshotJob(account, year, month)` — materializa snapshot + score.
- Disparar `RecomputeSnapshotJob` (debounced) nos eventos
  `FinancialReleaseCreated/Updated/Deleted` do mês afetado.
- Scheduler: recompute do mês corrente 1×/dia + na virada de mês.
- `SuggestGoalsJob` — cria/atualiza a meta de reserva sugerida.
- Notificações: `ScoreBandChanged` (mudou de faixa) e `DebtPaidOff` (próxima dívida a encerrar).

---

## 6. ENTREGA EM FASES (sugerido)
F0 migrations + SnapshotService + RecomputeSnapshotJob →
F1 Scoring + Diagnosis + `/dashboard` + `/diagnosis` →
F2 Classification + Reduction + `/reduction-plan` →
F3 Projection + `/projections` →
F4 DebtStrategy + `debts` + `/debts*` →
F5 Goals + `/goals` →
F6 IA (OpenAI + guardrails + cache) + `/ai/*` →
F7 eventos/notificações.

Escreva testes unitários para ScoringService, ProjectionService e DebtStrategyService
(são o coração determinístico e precisam ser à prova de regressão).
```
