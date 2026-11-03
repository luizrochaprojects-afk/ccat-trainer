# Quick Math — Fatia 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ativar as subskills 5–8 do spec — crescimento, unidades e escala, break-even/payback, média ponderada — com geradores no mesmo contrato da fatia 1, entrando na sessão diária adaptativa.

**Architecture:** Um gerador por subskill em `src/core/quickmath/geradores/`, usando `gerar`/`Problema` de `comum.ts` e `montarAlternativas`. Cada task acrescenta a subskill a `SUBSKILLS_ATIVAS` e a `GERADORES`; a sessão, a seleção, a persistência e as telas não mudam — a tela da Home e a do modo já listam o que está ativo.

**Tech Stack:** TypeScript, vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-quick-math-design.md` (tabela de subskills, linhas 5–8)

## Global Constraints

- Tudo da fatia 1 continua valendo: 5 alternativas; folga ≥ 10% (15% em estimativa); ≥ 2 distratores na mesma ordem de grandeza; resposta de estimativa a 2 algarismos significativos; PT e EN; nenhum atalho de padrão (mediana, dígitos repetidos) acima de 40%; atalho sem número ilegível.
- Níveis 1–2 exatos, 3–5 estimativa, salvo onde a tabela diz outra coisa.
- Erros de zero entram como gêmeos (`errosDeEscala`, com `fator`); erros de sinal com `fator: -1`.
- Resposta em anos usa a unidade `numero` e o enunciado diz "em quantos anos" — sem unidade nova no formatador.
- Não mexer em CCAT, sessão, seleção, persistência nem telas, exceto `ALVO_MS` em `taxonomia.ts`.
- `main` publica na Vercel: branch `feat/quick-math-fatia-2`; merge e push só com ok do Luiz.

## Review Focus

1. **Crescimento composto confundido com simples** — o distrator "somou as taxas" precisa existir nos níveis em que a diferença passa da folga; com taxa e prazo pequenos (5% × 2 anos) ele cai a < 10% e a questão perde o erro mais importante. (Task 1: o sorteio garante prazo × taxa suficiente.)
2. **Payback ou break-even fracionário** ("2,5 anos", "1.250 unidades") → o texto exibido não pode empatar com distrator depois do arredondamento. (Coberto pela unicidade do harness.)
3. **Média ponderada com pesos que não somam 100%** → nunca: os pesos são sorteados para somar exatamente 100 ou dados como valores absolutos. (Task 4.)
4. **Variação negativa em média de crescimento** (segmento que encolhe) → sinal certo no texto e o gêmeo de sinal trocado com par. (Task 4.)
5. **Divisão por dia com 365** → o atalho usa ≈ 360 ou "÷ 12 ÷ 30" e diz que é aproximação. (Task 2.)

---

### Task 0: Branch

- [ ] `git checkout -b feat/quick-math-fatia-2`

### Task 1: Crescimento

**Files:** Create `src/core/quickmath/geradores/crescimento.ts`; Modify `taxonomia.ts` (`SUBSKILLS_ATIVAS`, `ALVO_MS.crescimento` = 15/20/30/40/50 s), `geradores/index.ts`; Test `geradores.test.ts`.

**Produces:** `gerarCrescimento: QmGerador`.

| Nível | Pergunta | Unidade | Candidatos de erro |
|---|---|---|---|
| 1 | N cresce g% ao ano por 2 anos, g ∈ {10, 20, 50}; valor final | moeda | taxas somadas (simples); só 1 ano; gêmeos ×10 / ÷10 |
| 2 | regra do 72: dobra em quantos anos a g%? g ∈ {3, 4, 6, 8, 9, 12, 18, 24} | numero | 100 ÷ g ("usou 100 em vez de 72"); 72 ÷ (g/2); gêmeos |
| 3 | N a g% por 3 anos, g ∈ 5..15 com g × 3 ≥ 30 | moeda | simples; 2 anos; gêmeos |
| 4 | CAGR de A para B em n ∈ 2..5 anos (B = A(1+g)^n arredondado) | percent | média simples (B/A − 1)/n; crescimento total; gêmeos ÷10 |
| 5 | N a g% por n anos com g·n ≈ 72 ou 144 (×2, ×4) | moeda | simples; uma dobra a menos/a mais; gêmeos |

Atalho: nível 1/3 mostra o fator composto ("1,1 × 1,1 = 1,21"); 2 e 5 a regra do 72; 4 "(B/A) ≈ x; raiz n-ésima ≈ 1 + g".

- [ ] Adicionar `['crescimento', gerarCrescimento]` ao `describe.each` (propriedades + heurísticas) e o teste:

```ts
it('crescimento: o erro de somar as taxas está entre as alternativas nos níveis 1 e 3', () => {
  for (const nivel of [1, 3] as const)
    for (let seed = 1; seed <= 100; seed++)
      expect(gerarCrescimento(seed, nivel).opcoes.some((o) => o.erro?.pt.includes('simples'))).toBe(true)
})
```
- [ ] RED (`npx vitest run src/core/quickmath/geradores`) → implementar → GREEN → commit `feat(quickmath): gerador de crescimento`.

### Task 2: Unidades e escala

**Produces:** `gerarUnidades: QmGerador`; `ALVO_MS.unidades` = 12/15/25/30/40 s.

| Nível | Pergunta | Candidatos de erro |
|---|---|---|
| 1 | R$ X por mês → por ano (× 12); exata | × 10 ("multiplicou por 10"); × 30 ("usou dias"); gêmeos |
| 2 | R$ X por dia → por ano (× 365) ou por semana → por ano (× 52); exata | dia: × 30 ("deu o mês"), × 12; semana: × 12 ("tratou semana como mês"), × 4; gêmeos |
| 3 | R$ t por mês por cliente × C clientes → por ano | esqueceu × 12; esqueceu os clientes; gêmeos ×1000 |
| 4 | R$ X bi por ano → por dia (÷ 365) | ÷ 30 ("usou o mês"); ÷ 12; gêmeos |
| 5 | receita anual R$ X bi ÷ C mi clientes → ticket mensal | esqueceu ÷ 12; escala mi ↔ mil; gêmeos |

Atalho do ÷ 365: "÷ 365 ≈ ÷ 12 ÷ 30" e o resultado com "≈".

- [ ] Gerador na lista do harness + teste: `unidades nível 1: × 12 exato e o distrator × 10 presente em ≥ 80 de 100 seeds`.
- [ ] RED → implementar → GREEN → commit.

### Task 3: Break-even e payback

**Produces:** `gerarBreakeven: QmGerador`; `ALVO_MS.breakeven` = 15/20/30/40/50 s.

| Nível | Pergunta | Unidade | Candidatos de erro |
|---|---|---|---|
| 1 | break-even em unidades: fixo F ÷ (preço − custo variável); exata | numero | F ÷ preço ("usou o preço, não a margem"); F ÷ custo variável; gêmeos |
| 2 | payback: investimento I ÷ ganho anual G, em anos; exata | numero | G ÷ I; resposta em meses (× 12); gêmeos |
| 3 | break-even em receita: F ÷ margem de contribuição % | moeda | F × m; F ÷ (1 − m) ("usou o custo variável %"); gêmeos |
| 4 | payback com ganho mensal: I ÷ (g × 12) | numero | esqueceu de anualizar (I ÷ g); gêmeos |
| 5 | quantos clientes a R$ t/mês cobrem fixo anual F com margem m% | numero | esqueceu × 12; esqueceu a margem; gêmeos |

- [ ] Gerador na lista do harness + teste: `break-even nível 1: o distrator "usou o preço" está presente`.
- [ ] RED → implementar → GREEN → commit.

### Task 4: Média ponderada

**Produces:** `gerarMediaPonderada: QmGerador`; `ALVO_MS.media_ponderada` = 15/20/30/40/50 s. Unidade `percent` em todos.

| Nível | Pergunta | Candidatos de erro |
|---|---|---|
| 1 | margem média de 2 produtos com pesos 20/80, 25/75, 30/70, 40/60; exata | média simples; pesos trocados; gêmeos |
| 2 | 3 produtos, pesos em % que somam 100; exata | média simples; pesos trocados entre os dois maiores; gêmeos |
| 3 | 3 produtos com pesos dados em receita (R$), não em % | média simples; usou a receita do maior como 100%; gêmeos |
| 4 | o mix muda de (a/b) para (c/d): nova margem média | margem antiga; média simples; gêmeos |
| 5 | crescimento total de 2 segmentos de tamanhos diferentes, um deles pode encolher | média simples; soma das taxas; gêmeo de sinal (`fator: -1`) |

Pesos são sorteados para somar exatamente 100, e o sorteio descarta o caso em que a média simples fica a menos da folga da ponderada (ela é o distrator principal).

- [ ] Gerador na lista do harness + teste: `média ponderada: nenhuma questão tem a média simples como resposta certa` (a certa nunca coincide com a média simples dentro da folga — o sorteio descarta pesos iguais em 2 e 3 itens).
- [ ] RED → implementar → GREEN → commit.

### Task 5: Verificação e entrega

- [ ] `npm test` → tudo verde. `npm run build` → ok.
- [ ] Amostra de 2 questões por subskill × nível lida em PT e EN, conferindo enunciado, alternativas e atalho.
- [ ] README: lista de habilidades do "Case math" passa a nove.
- [ ] Revisão de branch inteira por revisor independente; corrigir Critical/Important com teste RED→GREEN.
- [ ] Parar e pedir ok para merge em `main` e push.
